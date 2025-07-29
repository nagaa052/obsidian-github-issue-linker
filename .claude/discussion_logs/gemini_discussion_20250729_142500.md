# Gemini Discussion Log - Obsidian GitHub Issue Linker Plugin

**Date:** 2025-07-29  
**Topic:** Architecture and Implementation Strategy for Obsidian GitHub Issue Linker Plugin

## Round 1: Architecture Overview

### Key Architectural Recommendations

1. **Plugin Architecture & Design Patterns**
   - Use service layer pattern for gh CLI interactions
   - Main Plugin Class: Entry point, lifecycle management, event registration
   - Service Layer (GitHubService.ts): All gh CLI interactions
   - Settings Management (settings.ts): Plugin configuration
   - Constants (constants.ts): URL patterns, command templates

2. **Proposed Code Structure**
   ```
   .
   ├── src/
   │   ├── main.ts          # Plugin entry point, event handling
   │   ├── GitHubService.ts # Handles all gh CLI interactions
   │   ├── settings.ts      # Plugin settings and settings tab UI
   │   └── constants.ts     # Constants, regex patterns
   ├── main.ts              # esbuild entry point
   ├── manifest.json
   ├── package.json
   └── tsconfig.json
   ```

3. **Asynchronous Processing & Performance**
   - Use async/await for paste handlers
   - Implement in-memory Map cache with TTL
   - Simple cache eviction (100-200 entries limit)
   - gh CLI handles rate limiting transparently

4. **Error Handling Strategy**
   - GitHubService throws custom errors
   - Notice system for user feedback
   - Graceful fallback to original URL
   - No retry logic needed for V1

5. **Security & Reliability**
   - Strict regex validation for URLs
   - Command injection prevention through validation
   - gh CLI handles authentication
   - Handle private repo access errors

## Round 2: Implementation Details

### Service Layer Implementation
- **Pattern:** Instance-based (not singleton) with dependency injection
- **Error Handling:** Custom error classes extending base Error
- **Async Operations:** Use util.promisify() for child_process.exec
- **Cache Strategy:** Simple Map with TTL, 100-200 entry limit, in-memory only

### Editor Integration
- **Event Handling:** Call preventDefault() only after URL validation
- **Cursor Position:** Use editor.replaceSelection() for atomic operations
- **Undo Behavior:** Single replaceSelection() call provides proper undo

### Settings Architecture
```typescript
interface PluginSettings {
  enabled: boolean;
  cacheTtl: number; // minutes
  cacheSize: number;
  showNotifications: boolean;
  supportedResourceTypes: ('issues' | 'prs')[];
}
```

### Development Workflow
- **Build Tool:** esbuild (fast, standard for Obsidian)
- **Development:** esbuild --watch + hot-reload plugin
- **Testing:** Unit tests for GitHubService + manual testing

### Code Quality Guidelines
- **TypeScript:** Enable strict mode from start
- **Error Handling:** Centralized error reporting
- **Logging:** console.log for development, console.error for errors
- **Performance:** 5-10 second timeout, allow concurrent fetches

## Round 3: Concrete Implementation

### Main Plugin Structure (Validated)
```typescript
export default class GitHubIssueLinkPlugin extends Plugin {
  settings: PluginSettings;
  githubService: GitHubService;

  async onload() {
    await this.loadSettings();
    this.githubService = new GitHubService(this.settings);
    
    // Blocking gh availability check (correct approach)
    const isGhAvailable = await this.githubService.checkGhAvailability();
    if (!isGhAvailable) {
      new Notice('GitHub CLI (gh) is not available. Plugin disabled.');
      return;
    }

    // registerDomEvent is correct for paste handling
    this.registerDomEvent(document, 'paste', this.handlePaste.bind(this));
    this.addSettingTab(new SettingsTab(this.app, this));
  }
}
```

### GitHubService Implementation (Validated)
```typescript
export class GitHubService {
  private cache = new Map<string, CacheEntry>();
  private readonly GITHUB_ISSUE_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+$/;

  constructor(private settings: PluginSettings) {}

  async fetchIssueTitle(url: string): Promise<string> {
    // Cache check + gh command execution + caching
    const command = `gh issue view "${url}" --json title -q .title`;
    // Use execAsync with timeout: 8000
  }
}
```

### Cache Strategy Refinements
- Simple FIFO eviction is sufficient
- Optional: True LRU by delete/re-set pattern for accessed items
- URL sanitization through regex + quoted shell arguments is sufficient

### Settings Implementation (Enhanced)
- Add real-time validation feedback
- Use Number.isInteger(Number(value)) for robust number parsing
- No GitHubService restart needed (settings passed by reference)

### Build Configuration (Validated)
```javascript
esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", ...builtins],
  format: "cjs",
  watch: !prod,
  target: "es2018",
  minify: prod, // Add for production
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
})
```

## Key Insights and Recommendations

### Architectural Strengths
1. **Dependency Injection:** GitHubService receives settings by reference - excellent for testability
2. **Separation of Concerns:** Clear boundaries between plugin lifecycle, service logic, and settings
3. **Progressive Enhancement:** Fallback to original URL maintains user intent
4. **Security:** Multi-layered URL validation (regex + quoted shell arguments)

### Critical Implementation Points
1. **Editor Context:** `getActiveViewOfType(MarkdownView)?.editor` is correct approach
2. **Event Handling:** `registerDomEvent(document, 'paste', ...)` works across all views
3. **Error Handling:** Fallback to original URL on failure is ideal UX
4. **Processing Feedback:** Show/hide Notice for async operations

### Anti-Patterns to Avoid
1. Don't store complex state in main plugin class
2. Don't use singleton pattern for services
3. Don't over-engineer cache (simple FIFO is sufficient)
4. Don't implement request queuing (concurrent fetches are fine)

### Development Priorities
1. **Phase 1:** Core MVP (setup, gh check, paste handler, URL validation, title fetching)
2. **Phase 2:** Robust error handling and user feedback
3. **Phase 3:** Caching and settings UI
4. **Phase 4:** Extension to support PRs

## Final Validation
**Architecture Status:** ✅ Solid and ready for implementation  
**Code Quality:** ✅ Follows TypeScript and Obsidian best practices  
**Maintainability:** ✅ Well-separated concerns, testable components  
**User Experience:** ✅ Progressive enhancement with graceful fallbacks  

The implementation approach is robust and should be executed with confidence.