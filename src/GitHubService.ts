import { exec } from 'child_process';
import { promisify } from 'util';
import type { PluginSettings } from './settings';
import { PathResolver } from './PathResolver';
import { 
  GITHUB_ISSUE_REGEX,
  GITHUB_PR_REGEX,
  GITHUB_ISSUE_COMMENT_REGEX,
  GITHUB_PR_COMMENT_REGEX,
  GITHUB_PR_DISCUSSION_REGEX,
  GH_COMMAND_TIMEOUT,
  MESSAGES
} from './constants';
import { 
  CommentData, 
  CommentCacheEntry, 
  CommentLinkInfo, 
  CommentType, 
  GitHubCommentError, 
  CommentFetchError 
} from './types';

const execAsync = promisify(exec);

interface CacheEntry {
  title: string;
  timestamp: number;
}

interface CommentCacheEntryInternal {
  data: CommentData;
  timestamp: number;
  ttl: number;
  formattedTitle: string;
  preview: string;
}

export class GitHubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubError';
  }
}

export class GitHubService {
  private cache = new Map<string, CacheEntry>();
  private commentCache = new Map<string, CommentCacheEntryInternal>();
  private cacheStats = { hits: 0, misses: 0 };
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
   * Validate if a URL is a GitHub Pull Request URL
   */
  isGitHubPrUrl(url: string): boolean {
    return GITHUB_PR_REGEX.test(url.trim());
  }

  /**
   * Validate if a URL is a supported GitHub resource URL (Issue or PR)
   */
  isGitHubResourceUrl(url: string): boolean {
    return this.isGitHubIssueUrl(url) || this.isGitHubPrUrl(url) || this.isGitHubCommentUrl(url);
  }

  /**
   * Validate if a URL is a GitHub Issue comment URL
   */
  isGitHubIssueCommentUrl(url: string): boolean {
    return GITHUB_ISSUE_COMMENT_REGEX.test(url.trim());
  }

  /**
   * Validate if a URL is a GitHub PR comment URL
   */
  isGitHubPrCommentUrl(url: string): boolean {
    return GITHUB_PR_COMMENT_REGEX.test(url.trim());
  }

  /**
   * Validate if a URL is a GitHub PR discussion URL
   */
  isGitHubPrDiscussionUrl(url: string): boolean {
    return GITHUB_PR_DISCUSSION_REGEX.test(url.trim());
  }

  /**
   * Validate if a URL is any supported GitHub comment URL
   */
  isGitHubCommentUrl(url: string): boolean {
    return this.isGitHubIssueCommentUrl(url) || 
           this.isGitHubPrCommentUrl(url) || 
           this.isGitHubPrDiscussionUrl(url);
  }

  /**
   * Parse a GitHub comment URL and extract information
   */
  parseCommentUrl(url: string): CommentLinkInfo {
    const trimmedUrl = url.trim();
    
    // Issue comment URL pattern
    const issueCommentMatch = trimmedUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)#issuecomment-(\d+)$/);
    if (issueCommentMatch) {
      return {
        owner: issueCommentMatch[1],
        repo: issueCommentMatch[2],
        issueNumber: parseInt(issueCommentMatch[3]),
        commentId: parseInt(issueCommentMatch[4]),
        isPullRequest: false,
        commentType: CommentType.ISSUE,
        originalUrl: trimmedUrl
      };
    }

    // PR comment URL pattern
    const prCommentMatch = trimmedUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)#issuecomment-(\d+)$/);
    if (prCommentMatch) {
      return {
        owner: prCommentMatch[1],
        repo: prCommentMatch[2],
        issueNumber: parseInt(prCommentMatch[3]),
        commentId: parseInt(prCommentMatch[4]),
        isPullRequest: true,
        commentType: CommentType.ISSUE,
        originalUrl: trimmedUrl
      };
    }

    // PR discussion URL pattern
    const prDiscussionMatch = trimmedUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)#discussion_r(\d+)$/);
    if (prDiscussionMatch) {
      return {
        owner: prDiscussionMatch[1],
        repo: prDiscussionMatch[2],
        issueNumber: parseInt(prDiscussionMatch[3]),
        commentId: parseInt(prDiscussionMatch[4]),
        isPullRequest: true,
        commentType: CommentType.DISCUSSION,
        originalUrl: trimmedUrl
      };
    }

    throw new GitHubCommentError(
      `Invalid GitHub comment URL format: ${url}`,
      CommentFetchError.PARSE_ERROR
    );
  }

  /**
   * Fetch comment data from GitHub using gh CLI
   */
  async fetchCommentData(url: string): Promise<CommentData> {
    // Validate URL first
    if (!this.isGitHubCommentUrl(url)) {
      throw new GitHubCommentError('Invalid GitHub comment URL format', CommentFetchError.PARSE_ERROR);
    }

    // Check cache first
    const cached = this.getCachedComment(url);
    if (cached) {
      return cached.data;
    }

    // Parse URL to get repository and comment information
    const parsedUrl = this.parseCommentUrl(url);

    // Ensure we have a resolved gh path
    if (!this.resolvedGhPath) {
      const pathResult = await this.pathResolver.resolveGhPath(this.settings.ghPath);
      if (!pathResult.success || !pathResult.path) {
        throw new GitHubCommentError(
          `GitHub CLI not available: ${pathResult.error}`,
          CommentFetchError.NETWORK_ERROR
        );
      }
      this.resolvedGhPath = pathResult.path;
    }

    // Build API endpoint
    let apiEndpoint: string;
    if (parsedUrl.commentType === CommentType.DISCUSSION) {
      // PR review comment (discussion)
      apiEndpoint = `/repos/${parsedUrl.owner}/${parsedUrl.repo}/pulls/comments/${parsedUrl.commentId}`;
    } else {
      // Issue or PR comment (both use the same API endpoint)
      apiEndpoint = `/repos/${parsedUrl.owner}/${parsedUrl.repo}/issues/comments/${parsedUrl.commentId}`;
    }

    // Fetch from gh CLI using API command
    try {
      const command = `"${this.resolvedGhPath}" api "${apiEndpoint}"`;
      const { stdout } = await execAsync(command, { 
        timeout: GH_COMMAND_TIMEOUT 
      });
      
      const commentData: CommentData = JSON.parse(stdout.trim());
      
      if (!commentData || !commentData.id) {
        throw new GitHubCommentError('Invalid comment data received from GitHub CLI', CommentFetchError.PARSE_ERROR);
      }

      // Add issue number for easier reference
      if (!commentData.issue_number) {
        commentData.issue_number = parsedUrl.issueNumber;
      }

      // Cache the result
      this.cacheComment(url, commentData);
      
      return commentData;
    } catch (error: any) {
      // Handle specific error cases
      if (error instanceof SyntaxError) {
        throw new GitHubCommentError(
          'Failed to parse comment data from GitHub API',
          CommentFetchError.PARSE_ERROR,
          error
        );
      }

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
            const command = `"${this.resolvedGhPath}" api "${apiEndpoint}"`;
            const { stdout } = await execAsync(command, { timeout: GH_COMMAND_TIMEOUT });
            const commentData: CommentData = JSON.parse(stdout.trim());
            
            if (commentData && commentData.id) {
              if (!commentData.issue_number) {
                commentData.issue_number = parsedUrl.issueNumber;
              }
              this.cacheComment(url, commentData);
              return commentData;
            }
          } catch (retryError) {
            // Fall through to original error handling
          }
        }
      }
      
      // Enhanced error handling based on common gh CLI errors
      let errorMessage = MESSAGES.COMMENT_FETCH_ERROR_PREFIX;
      let errorType = CommentFetchError.NETWORK_ERROR;
      
      if (error.code === 'ETIMEDOUT') {
        errorMessage += 'Request timed out';
        errorType = CommentFetchError.NETWORK_ERROR;
      } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        errorMessage += 'Comment not found or deleted';
        errorType = CommentFetchError.NOT_FOUND;
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorMessage += 'Unauthorized access - please check your GitHub CLI authentication';
        errorType = CommentFetchError.UNAUTHORIZED;
      } else if (error.message?.includes('403') || error.message?.includes('rate limit')) {
        errorMessage += 'Rate limit exceeded or forbidden access';
        errorType = CommentFetchError.RATE_LIMITED;
      } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('network')) {
        errorMessage += 'Network error - please check your internet connection';
        errorType = CommentFetchError.NETWORK_ERROR;
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      throw new GitHubCommentError(errorMessage, errorType, error);
    }
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
   * Fetch pull request title from GitHub using gh CLI
   */
  async fetchPrTitle(url: string): Promise<string> {
    // Validate URL first
    if (!this.isGitHubPrUrl(url)) {
      throw new GitHubError('Invalid GitHub pull request URL format');
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
        errorMessage += 'Pull request not found or repository is private';
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
   * Format comment data into a user-friendly preview string
   */
  formatCommentPreview(commentData: CommentData): string {
    // Input validation
    if (!commentData) {
      throw new GitHubCommentError('Comment data is null or undefined', CommentFetchError.PARSE_ERROR);
    }
    
    if (!commentData.id) {
      throw new GitHubCommentError('Comment data is missing ID', CommentFetchError.PARSE_ERROR);
    }
    
    if (!commentData.user?.login) {
      throw new GitHubCommentError('Comment data is missing user information', CommentFetchError.PARSE_ERROR);
    }
    
    try {
      // Extract issue/PR number from comment data
      const issueNumber = this.extractIssueNumber(commentData);
      
      // Format the comment identifier
      const commentId = commentData.id;
      
      // Get username
      const username = commentData.user.login;
      
      // Clean and truncate comment body
      const cleanBody = this.cleanMarkdownForPreview(commentData.body);
      const maxBodyLength = 120; // Leave space for prefix and suffix
      let bodyPreview = cleanBody.length > maxBodyLength 
        ? cleanBody.substring(0, maxBodyLength).trim() + '...'
        : cleanBody;
      
      // Ensure bodyPreview is not empty
      if (!bodyPreview || bodyPreview === '...') {
        bodyPreview = '[No content]';
      }
      
      // Format the complete preview
      const preview = `#${issueNumber} (comment ${commentId}) by @${username}: ${bodyPreview}`;
      
      // Ensure total length is under 200 characters as per test requirement
      if (preview.length > 200) {
        const maxLength = 197; // Leave space for '...'
        return preview.substring(0, maxLength).trim() + '...';
      }
      
      return preview;
    } catch (error: any) {
      // Handle any unexpected errors during formatting
      console.error('Error formatting comment preview:', error);
      
      // Return a fallback preview with basic information
      const fallbackCommentId = commentData.id || 'unknown';
      const fallbackUsername = commentData.user?.login || 'unknown user';
      return `Comment ${fallbackCommentId} by @${fallbackUsername}`;
    }
  }

  /**
   * Extract issue/PR number from comment data
   */
  private extractIssueNumber(commentData: CommentData): number {
    try {
      // First check if issue_number is already set
      if (commentData.issue_number) {
        return commentData.issue_number;
      }
      
      // Try to extract from issue_url
      if (commentData.issue_url) {
        const match = commentData.issue_url.match(/\/issues\/(\d+)$/);
        if (match) {
          const issueNumber = parseInt(match[1]);
          if (!isNaN(issueNumber) && issueNumber > 0) {
            return issueNumber;
          }
        }
      }
      
      // Try to extract from html_url as fallback
      if (commentData.html_url) {
        const issueMatch = commentData.html_url.match(/\/(?:issues|pull)\/(\d+)#/);
        if (issueMatch) {
          const issueNumber = parseInt(issueMatch[1]);
          if (!isNaN(issueNumber) && issueNumber > 0) {
            return issueNumber;
          }
        }
      }
      
      // Default fallback
      return 0;
    } catch (error: any) {
      console.warn('Error extracting issue number from comment data:', error);
      return 0;
    }
  }

  /**
   * Clean markdown formatting from comment body for preview
   */
  private cleanMarkdownForPreview(body: string): string {
    try {
      if (!body || typeof body !== 'string') return '';
      
      // Remove multiple line breaks and normalize whitespace
      let cleaned = body.replace(/\r\n/g, '\n').replace(/\n+/g, ' ').trim();
      
      // Remove common markdown formatting but keep the text content
      cleaned = cleaned
        // Remove code blocks (```...``` and `...`)
        .replace(/```[\s\S]*?```/g, '[code]')
        .replace(/`([^`]+)`/g, '$1')
        // Remove bold and italic formatting but keep text
        .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold**
        .replace(/\*([^*]+)\*/g, '$1')     // *italic*
        .replace(/__([^_]+)__/g, '$1')     // __bold__
        .replace(/_([^_]+)_/g, '$1')       // _italic_
        // Remove links but keep the text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url)
        // Remove headers
        .replace(/^#+\s*/gm, '')
        // Remove list markers
        .replace(/^[-*+]\s*/gm, '')
        .replace(/^\d+\.\s*/gm, '')
        // Remove quotes
        .replace(/^>\s*/gm, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
      
      return cleaned;
    } catch (error: any) {
      console.warn('Error cleaning markdown for preview:', error);
      // Return original body as fallback, limited to reasonable length
      const fallback = (body || '').toString().trim();
      return fallback.length > 100 ? fallback.substring(0, 100) + '...' : fallback;
    }
  }

  /**
   * Fetch title from GitHub resource (Issue or PR) using gh CLI
   */
  async fetchTitle(url: string): Promise<string> {
    if (this.isGitHubIssueUrl(url)) {
      return this.fetchIssueTitle(url);
    } else if (this.isGitHubPrUrl(url)) {
      return this.fetchPrTitle(url);
    } else {
      throw new GitHubError('Invalid GitHub URL format');
    }
  }

  /**
   * Get cached title if available and not expired
   */
  private getCachedTitle(url: string): string | null {
    const entry = this.cache.get(url);
    if (!entry) {
      this.cacheStats.misses++;
      return null;
    }

    // Check if cache entry has expired
    const isExpired = Date.now() - entry.timestamp > this.settings.cacheTtl * 60 * 1000;
    if (isExpired) {
      this.cache.delete(url);
      this.cacheStats.misses++;
      return null;
    }

    // Move to end for LRU behavior (optional enhancement)
    if (this.cache.size > 1) {
      this.cache.delete(url);
      this.cache.set(url, entry);
    }

    this.cacheStats.hits++;
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
    this.commentCache.clear();
    this.resetCacheStats();
  }

  /**
   * Get cached comment if available and not expired
   */
  getCachedComment(url: string): CommentCacheEntry | undefined {
    const entry = this.commentCache.get(url);
    if (!entry) {
      this.cacheStats.misses++;
      return undefined;
    }

    // Check if cache entry has expired
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.commentCache.delete(url);
      this.cacheStats.misses++;
      return undefined;
    }

    // Move to end for LRU behavior
    if (this.commentCache.size > 1) {
      this.commentCache.delete(url);
      this.commentCache.set(url, entry);
    }

    this.cacheStats.hits++;
    return {
      data: entry.data,
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      formattedTitle: entry.formattedTitle,
      preview: entry.preview
    };
  }

  /**
   * Cache comment data with metadata
   */
  cacheComment(url: string, commentData: CommentData): void {
    // Simple FIFO eviction if cache is full
    const cacheSize = this.settings.cacheSize || 100; // Default cache size
    if (this.commentCache.size >= cacheSize) {
      // Delete the oldest entry (first in Map iteration order)
      const oldestKey = this.commentCache.keys().next().value;
      if (oldestKey) {
        this.commentCache.delete(oldestKey);
      }
    }

    // Calculate TTL (default to 30 minutes if not specified)
    const ttlMinutes = (this.settings as any).cacheTtlMinutes || 30;
    const ttlMs = ttlMinutes * 60 * 1000;

    // Generate formatted preview
    const formattedTitle = this.formatCommentPreview(commentData);
    const preview = formattedTitle; // For now, preview is same as formatted title

    this.commentCache.set(url, {
      data: commentData,
      timestamp: Date.now(),
      ttl: ttlMs,
      formattedTitle,
      preview
    });
  }

  /**
   * Remove specific comment from cache
   */
  removeCachedComment(url: string): void {
    this.commentCache.delete(url);
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats(): void {
    this.cacheStats = { hits: 0, misses: 0 };
  }

  /**
   * Get current cache statistics (useful for debugging)
   */
  getCacheStats(): { size: number; maxSize: number; commentSize: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      maxSize: this.settings.cacheSize,
      commentSize: this.commentCache.size,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses
    };
  }

  /**
   * Build the gh CLI command with proper path and escaping
   */
  private buildGhCommand(ghPath: string, url: string): string {
    // Escape path if it contains spaces
    const escapedPath = ghPath.includes(' ') ? `"${ghPath}"` : ghPath;
    
    // Determine the resource type and build appropriate command
    if (this.isGitHubIssueUrl(url)) {
      return `${escapedPath} issue view "${url}" --json title -q .title`;
    } else if (this.isGitHubPrUrl(url)) {
      return `${escapedPath} pr view "${url}" --json title -q .title`;
    } else {
      throw new GitHubError('Unsupported GitHub URL format');
    }
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