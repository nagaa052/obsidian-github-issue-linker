import { exec } from 'child_process';
import { promisify } from 'util';
import { access, constants as fsConstants } from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);
const accessAsync = promisify(access);

export interface PathResolutionResult {
  success: boolean;
  path?: string;
  error?: string;
  method?: 'user-defined' | 'common-paths' | 'environment-path' | 'cached';
}

export class PathResolver {
  private cachedPath: string | null = null;
  private lastValidation: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Platform-specific common installation paths
  private readonly COMMON_PATHS = {
    darwin: [
      '/opt/homebrew/bin/gh',        // Apple Silicon Homebrew
      '/usr/local/bin/gh',           // Intel Homebrew / Manual symlink
      '/usr/bin/gh',                 // System installation
      path.join(os.homedir(), '.local/bin/gh'), // User local
    ],
    win32: [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'GitHub CLI', 'gh.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'GitHub CLI', 'gh.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'gh', 'gh.exe'),
      'gh.exe', // PATH fallback with extension
    ],
    linux: [
      '/usr/bin/gh',
      '/usr/local/bin/gh',
      '/snap/bin/gh',                // Snap package
      path.join(os.homedir(), '.local/bin/gh'), // User local
      path.join(os.homedir(), 'bin/gh'), // User bin
    ]
  };

  /**
   * Resolve GitHub CLI path using multi-step fallback strategy
   */
  async resolveGhPath(userDefinedPath?: string): Promise<PathResolutionResult> {
    try {
      // Step 1: Use cached path if still valid
      if (this.isCacheValid() && this.cachedPath) {
        const isValid = await this.validateGhExecutable(this.cachedPath);
        if (isValid.success) {
          return {
            success: true,
            path: this.cachedPath,
            method: 'cached'
          };
        } else {
          // Cache invalid, clear it
          this.clearCache();
        }
      }

      // Step 2: Try user-defined path first (highest priority)
      if (userDefinedPath) {
        const result = await this.validateGhExecutable(userDefinedPath);
        if (result.success) {
          this.updateCache(userDefinedPath);
          return {
            success: true,
            path: userDefinedPath,
            method: 'user-defined'
          };
        }
      }

      // Step 3: Try common installation paths
      const platform = os.platform() as keyof typeof this.COMMON_PATHS;
      const pathsToTry = this.COMMON_PATHS[platform] || this.COMMON_PATHS.linux;

      for (const testPath of pathsToTry) {
        if (!testPath) continue;
        
        try {
          const result = await this.validateGhExecutable(testPath);
          if (result.success) {
            this.updateCache(testPath);
            return {
              success: true,
              path: testPath,
              method: 'common-paths'
            };
          }
        } catch (error) {
          // Continue to next path
          continue;
        }
      }

      // Step 4: Try PATH environment variable (final fallback)
      const envResult = await this.validateGhExecutable('gh');
      if (envResult.success) {
        // Try to resolve full path for caching
        try {
          const { stdout } = await execAsync(platform === 'win32' ? 'where gh' : 'which gh', { timeout: 3000 });
          const fullPath = stdout.trim().split('\n')[0];
          this.updateCache(fullPath);
          return {
            success: true,
            path: fullPath,
            method: 'environment-path'
          };
        } catch {
          // Use 'gh' as-is if path resolution fails
          return {
            success: true,
            path: 'gh',
            method: 'environment-path'
          };
        }
      }

      // All methods failed
      return {
        success: false,
        error: 'GitHub CLI (gh) not found in any expected locations. Please install GitHub CLI or configure the path manually in plugin settings.'
      };

    } catch (error) {
      return {
        success: false,
        error: `Path resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate that a given path points to a working GitHub CLI executable
   */
  async validateGhExecutable(ghPath: string): Promise<PathResolutionResult> {
    try {
      // Check if file exists and is executable (Unix systems)
      if (ghPath !== 'gh' && !ghPath.includes('gh.exe')) {
        try {
          await accessAsync(ghPath, fsConstants.F_OK);
          if (os.platform() !== 'win32') {
            await accessAsync(ghPath, fsConstants.X_OK);
          }
        } catch {
          return {
            success: false,
            error: `File does not exist or is not executable: ${ghPath}`
          };
        }
      }

      // Validate by running gh --version
      const versionCommand = ghPath.includes(' ') ? `"${ghPath}" --version` : `${ghPath} --version`;
      const { stdout, stderr } = await execAsync(versionCommand, { 
        timeout: 8000,
        env: { ...process.env, PATH: process.env.PATH }
      });

      // Check that output contains "gh version"
      const output = stdout.toLowerCase();
      if (!output.includes('gh version')) {
        return {
          success: false,
          error: `Invalid GitHub CLI executable. Expected "gh version" in output, got: ${stdout.slice(0, 100)}`
        };
      }

      return {
        success: true,
        path: ghPath
      };

    } catch (error: any) {
      let errorMessage = 'Unknown validation error';
      
      if (error.code === 'ENOENT') {
        errorMessage = `GitHub CLI executable not found: ${ghPath}`;
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = `GitHub CLI validation timed out: ${ghPath}`;
      } else if (error.stderr) {
        errorMessage = `GitHub CLI validation failed: ${error.stderr}`;
      } else if (error.message) {
        errorMessage = `GitHub CLI validation error: ${error.message}`;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get platform-specific installation instructions
   */
  getInstallationInstructions(): string {
    const platform = os.platform();
    
    switch (platform) {
      case 'darwin':
        return 'Install GitHub CLI using Homebrew: "brew install gh", or download from https://github.com/cli/cli/releases';
      case 'win32':
        return 'Install GitHub CLI using winget: "winget install GitHub.cli", or download from https://github.com/cli/cli/releases';
      case 'linux':
        return 'Install GitHub CLI using your package manager or download from https://github.com/cli/cli/releases';
      default:
        return 'Download GitHub CLI from https://github.com/cli/cli/releases';
    }
  }

  /**
   * Clear the cached path and force re-resolution
   */
  clearCache(): void {
    this.cachedPath = null;
    this.lastValidation = 0;
  }

  /**
   * Get current cache status for debugging
   */
  getCacheStatus(): { cached: boolean; path?: string; age?: number } {
    if (!this.cachedPath) {
      return { cached: false };
    }

    return {
      cached: true,
      path: this.cachedPath,
      age: Date.now() - this.lastValidation
    };
  }

  private isCacheValid(): boolean {
    return this.cachedPath !== null && 
           (Date.now() - this.lastValidation) < this.CACHE_TTL;
  }

  private updateCache(path: string): void {
    this.cachedPath = path;
    this.lastValidation = Date.now();
  }
}