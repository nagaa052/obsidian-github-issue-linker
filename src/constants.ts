// URL patterns for GitHub resources
export const GITHUB_ISSUE_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+$/;

// GitHub CLI commands
export const GH_VERSION_COMMAND = 'gh --version';
export const GH_ISSUE_TITLE_COMMAND = (url: string) => `gh issue view "${url}" --json title -q .title`;

// Timeout settings (milliseconds)
export const GH_COMMAND_TIMEOUT = 8000;
export const GH_VERSION_CHECK_TIMEOUT = 5000;

// Cache settings defaults
export const DEFAULT_CACHE_TTL_MINUTES = 60;
export const DEFAULT_CACHE_SIZE = 100;

// User notification messages
export const MESSAGES = {
  GH_NOT_AVAILABLE: 'GitHub CLI (gh) is not available. Plugin disabled.',
  FETCHING_TITLE: 'Fetching GitHub issue title...',
  FETCH_SUCCESS: 'GitHub issue title converted to link',
  FETCH_FAILED: 'Failed to fetch title. Using original URL.',
  FETCH_ERROR_PREFIX: 'Failed to fetch issue title: ',
} as const;

// Notification display durations (milliseconds)
export const NOTIFICATION_DURATION = {
  SUCCESS: 2000,
  ERROR: 4000,
  PERSISTENT: 0, // 0 means no auto-hide
} as const;