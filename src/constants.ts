// URL patterns for GitHub resources
export const GITHUB_ISSUE_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+$/;
export const GITHUB_PR_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+$/;

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
} as const;

// Notification display durations (milliseconds)
export const NOTIFICATION_DURATION = {
  SUCCESS: 2000,
  ERROR: 4000,
  PERSISTENT: 0, // 0 means no auto-hide
} as const;