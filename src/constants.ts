// URL patterns for GitHub resources
export const GITHUB_ISSUE_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+$/;
export const GITHUB_PR_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+$/;

// URL patterns for GitHub comment resources
export const GITHUB_ISSUE_COMMENT_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+#issuecomment-\d+$/;
export const GITHUB_PR_COMMENT_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+#issuecomment-\d+$/;
export const GITHUB_PR_DISCUSSION_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+#discussion_r\d+$/;

// Timeout settings (milliseconds)
export const GH_COMMAND_TIMEOUT = 8000;

// Cache settings defaults
export const DEFAULT_CACHE_TTL_MINUTES = 60;
export const DEFAULT_CACHE_SIZE = 100;

// User notification messages
export const MESSAGES = {
  GH_NOT_AVAILABLE: 'GitHub CLI (gh) is not available. Plugin disabled.',
  FETCHING_TITLE: 'Fetching GitHub title...',
  FETCH_SUCCESS: 'GitHub URL converted to link',
  FETCH_FAILED: 'Failed to fetch title. Using original URL.',
  FETCH_ERROR_PREFIX: 'Failed to fetch title: ',
  FETCHING_COMMENT: 'Fetching GitHub comment...',
  COMMENT_FETCH_SUCCESS: 'GitHub comment URL converted to link',
  COMMENT_FETCH_FAILED: 'Failed to fetch comment. Using original URL.',
  COMMENT_NOT_FOUND: 'Comment not found or deleted.',
  COMMENT_FETCH_ERROR_PREFIX: 'Failed to fetch comment: ',
} as const;

// Notification display durations (milliseconds)
export const NOTIFICATION_DURATION = {
  SUCCESS: 2000,
  ERROR: 4000,
  PERSISTENT: 0, // 0 means no auto-hide
} as const;