import { exec } from 'child_process';
import { promisify } from 'util';
import type { PluginSettings } from './settings';
import { 
  GITHUB_ISSUE_REGEX, 
  GH_VERSION_COMMAND, 
  GH_ISSUE_TITLE_COMMAND,
  GH_COMMAND_TIMEOUT,
  GH_VERSION_CHECK_TIMEOUT,
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
  
  constructor(private settings: PluginSettings) {}

  /**
   * Check if GitHub CLI is available and working
   */
  async checkGhAvailability(): Promise<boolean> {
    try {
      await execAsync(GH_VERSION_COMMAND, { timeout: GH_VERSION_CHECK_TIMEOUT });
      return true;
    } catch (error) {
      console.error('GitHub CLI availability check failed:', error);
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

    // Fetch from gh CLI
    try {
      const command = GH_ISSUE_TITLE_COMMAND(url);
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
      // Enhanced error handling based on common gh CLI errors
      let errorMessage = MESSAGES.FETCH_ERROR_PREFIX;
      
      if (error.code === 'ETIMEDOUT') {
        errorMessage += 'Request timed out';
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
}