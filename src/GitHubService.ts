import { exec } from 'child_process';
import { promisify } from 'util';
import type { PluginSettings } from './settings';
import { PathResolver } from './PathResolver';
import { 
  GITHUB_ISSUE_REGEX, 
  GH_COMMAND_TIMEOUT,
  MESSAGES
} from './constants';

const execAsync = promisify(exec);

interface CacheEntry {
  title: string;
  timestamp: number;
}

export class GitHubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubError';
  }
}

export class GitHubService {
  private cache = new Map<string, CacheEntry>();
  private pathResolver: PathResolver;
  private resolvedGhPath: string | null = null;
  
  constructor(private settings: PluginSettings) {
    this.pathResolver = new PathResolver();
  }

  /**
   * Check if GitHub CLI is available and working
   */
  async checkGhAvailability(): Promise<boolean> {
    try {
      const result = await this.pathResolver.resolveGhPath(this.settings.ghPath);
      
      if (result.success && result.path) {
        this.resolvedGhPath = result.path;
        console.log(`GitHub CLI found at: ${result.path} (${result.method})`);
        return true;
      } else {
        console.error('GitHub CLI availability check failed:', result.error);
        this.resolvedGhPath = null;
        return false;
      }
    } catch (error) {
      console.error('GitHub CLI availability check failed:', error);
      this.resolvedGhPath = null;
      return false;
    }
  }

  /**
   * Validate if a URL is a GitHub Issue URL
   */
  isGitHubIssueUrl(url: string): boolean {
    return GITHUB_ISSUE_REGEX.test(url.trim());
  }

  /**
   * Fetch issue title from GitHub using gh CLI
   */
  async fetchIssueTitle(url: string): Promise<string> {
    // Validate URL first
    if (!this.isGitHubIssueUrl(url)) {
      throw new GitHubError('Invalid GitHub issue URL format');
    }

    // Check cache first
    const cached = this.getCachedTitle(url);
    if (cached) {
      return cached;
    }

    // Ensure we have a resolved gh path
    if (!this.resolvedGhPath) {
      const pathResult = await this.pathResolver.resolveGhPath(this.settings.ghPath);
      if (!pathResult.success || !pathResult.path) {
        throw new GitHubError(`GitHub CLI not available: ${pathResult.error}`);
      }
      this.resolvedGhPath = pathResult.path;
    }

    // Fetch from gh CLI
    try {
      const command = this.buildGhCommand(this.resolvedGhPath, url);
      const { stdout } = await execAsync(command, { 
        timeout: GH_COMMAND_TIMEOUT 
      });
      
      const title = stdout.trim();
      
      if (!title) {
        throw new GitHubError('Empty title received from GitHub CLI');
      }

      // Cache the result
      this.cacheTitle(url, title);
      
      return title;
    } catch (error: any) {
      // If error is related to gh path, clear cached path and retry once
      if (this.isPathRelatedError(error) && this.resolvedGhPath) {
        console.warn('GitHub CLI path seems invalid, attempting to re-resolve...', error.message);
        this.resolvedGhPath = null;
        this.pathResolver.clearCache();
        
        // Retry once with fresh path resolution
        const pathResult = await this.pathResolver.resolveGhPath(this.settings.ghPath);
        if (pathResult.success && pathResult.path) {
          this.resolvedGhPath = pathResult.path;
          try {
            const command = this.buildGhCommand(this.resolvedGhPath, url);
            const { stdout } = await execAsync(command, { timeout: GH_COMMAND_TIMEOUT });
            const title = stdout.trim();
            
            if (title) {
              this.cacheTitle(url, title);
              return title;
            }
          } catch (retryError) {
            // Fall through to original error handling
          }
        }
      }
      
      // Enhanced error handling based on common gh CLI errors
      let errorMessage = MESSAGES.FETCH_ERROR_PREFIX;
      
      if (error.code === 'ETIMEDOUT') {
        errorMessage += 'Request timed out';
      } else if (error.code === 'ENOENT') {
        errorMessage += 'GitHub CLI executable not found';
      } else if (error.stderr?.includes('not found')) {
        errorMessage += 'Issue not found or repository is private';
      } else if (error.stderr?.includes('authentication')) {
        errorMessage += 'GitHub authentication required. Run "gh auth login"';
      } else if (error.stderr?.includes('rate limit')) {
        errorMessage += 'GitHub API rate limit exceeded. Please try again later';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      throw new GitHubError(errorMessage);
    }
  }

  /**
   * Get cached title if available and not expired
   */
  private getCachedTitle(url: string): string | null {
    const entry = this.cache.get(url);
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    const isExpired = Date.now() - entry.timestamp > this.settings.cacheTtl * 60 * 1000;
    if (isExpired) {
      this.cache.delete(url);
      return null;
    }

    // Move to end for LRU behavior (optional enhancement)
    if (this.cache.size > 1) {
      this.cache.delete(url);
      this.cache.set(url, entry);
    }

    return entry.title;
  }

  /**
   * Cache title with simple FIFO eviction
   */
  private cacheTitle(url: string, title: string): void {
    // Simple FIFO eviction if cache is full
    if (this.cache.size >= this.settings.cacheSize) {
      // Delete the oldest entry (first in Map iteration order)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(url, {
      title,
      timestamp: Date.now()
    });
  }

  /**
   * Clear the entire cache (useful for testing or manual cache clearing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current cache statistics (useful for debugging)
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.settings.cacheSize
    };
  }

  /**
   * Build the gh CLI command with proper path and escaping
   */
  private buildGhCommand(ghPath: string, url: string): string {
    // Escape path if it contains spaces
    const escapedPath = ghPath.includes(' ') ? `"${ghPath}"` : ghPath;
    return `${escapedPath} issue view "${url}" --json title -q .title`;
  }

  /**
   * Check if error is related to gh path issues
   */
  private isPathRelatedError(error: any): boolean {
    return (
      error.code === 'ENOENT' ||
      error.message?.includes('command not found') ||
      error.message?.includes('not found') ||
      error.stderr?.includes('command not found')
    );
  }

  /**
   * Get current GitHub CLI path for debugging
   */
  getCurrentGhPath(): string | null {
    return this.resolvedGhPath;
  }

  /**
   * Force refresh of GitHub CLI path
   */
  async refreshGhPath(): Promise<boolean> {
    this.resolvedGhPath = null;
    this.pathResolver.clearCache();
    return await this.checkGhAvailability();
  }
}