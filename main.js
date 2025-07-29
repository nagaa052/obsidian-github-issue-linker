"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => GitHubIssueLinkPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/GitHubService.ts
var import_child_process = require("child_process");
var import_util = require("util");

// src/constants.ts
var GITHUB_ISSUE_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+$/;
var GH_VERSION_COMMAND = "gh --version";
var GH_ISSUE_TITLE_COMMAND = (url) => `gh issue view "${url}" --json title -q .title`;
var GH_COMMAND_TIMEOUT = 8e3;
var GH_VERSION_CHECK_TIMEOUT = 5e3;
var DEFAULT_CACHE_TTL_MINUTES = 60;
var DEFAULT_CACHE_SIZE = 100;
var MESSAGES = {
  GH_NOT_AVAILABLE: "GitHub CLI (gh) is not available. Plugin disabled.",
  FETCHING_TITLE: "Fetching GitHub issue title...",
  FETCH_SUCCESS: "GitHub issue title converted to link",
  FETCH_FAILED: "Failed to fetch title. Using original URL.",
  FETCH_ERROR_PREFIX: "Failed to fetch issue title: "
};
var NOTIFICATION_DURATION = {
  SUCCESS: 2e3,
  ERROR: 4e3,
  PERSISTENT: 0
  // 0 means no auto-hide
};

// src/GitHubService.ts
var execAsync = (0, import_util.promisify)(import_child_process.exec);
var GitHubError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "GitHubError";
  }
};
var GitHubService = class {
  constructor(settings) {
    this.settings = settings;
    this.cache = /* @__PURE__ */ new Map();
  }
  /**
   * Check if GitHub CLI is available and working
   */
  async checkGhAvailability() {
    try {
      await execAsync(GH_VERSION_COMMAND, { timeout: GH_VERSION_CHECK_TIMEOUT });
      return true;
    } catch (error) {
      console.error("GitHub CLI availability check failed:", error);
      return false;
    }
  }
  /**
   * Validate if a URL is a GitHub Issue URL
   */
  isGitHubIssueUrl(url) {
    return GITHUB_ISSUE_REGEX.test(url.trim());
  }
  /**
   * Fetch issue title from GitHub using gh CLI
   */
  async fetchIssueTitle(url) {
    var _a, _b, _c;
    if (!this.isGitHubIssueUrl(url)) {
      throw new GitHubError("Invalid GitHub issue URL format");
    }
    const cached = this.getCachedTitle(url);
    if (cached) {
      return cached;
    }
    try {
      const command = GH_ISSUE_TITLE_COMMAND(url);
      const { stdout } = await execAsync(command, {
        timeout: GH_COMMAND_TIMEOUT
      });
      const title = stdout.trim();
      if (!title) {
        throw new GitHubError("Empty title received from GitHub CLI");
      }
      this.cacheTitle(url, title);
      return title;
    } catch (error) {
      let errorMessage = MESSAGES.FETCH_ERROR_PREFIX;
      if (error.code === "ETIMEDOUT") {
        errorMessage += "Request timed out";
      } else if ((_a = error.stderr) == null ? void 0 : _a.includes("not found")) {
        errorMessage += "Issue not found or repository is private";
      } else if ((_b = error.stderr) == null ? void 0 : _b.includes("authentication")) {
        errorMessage += 'GitHub authentication required. Run "gh auth login"';
      } else if ((_c = error.stderr) == null ? void 0 : _c.includes("rate limit")) {
        errorMessage += "GitHub API rate limit exceeded. Please try again later";
      } else {
        errorMessage += error.message || "Unknown error occurred";
      }
      throw new GitHubError(errorMessage);
    }
  }
  /**
   * Get cached title if available and not expired
   */
  getCachedTitle(url) {
    const entry = this.cache.get(url);
    if (!entry) {
      return null;
    }
    const isExpired = Date.now() - entry.timestamp > this.settings.cacheTtl * 60 * 1e3;
    if (isExpired) {
      this.cache.delete(url);
      return null;
    }
    if (this.cache.size > 1) {
      this.cache.delete(url);
      this.cache.set(url, entry);
    }
    return entry.title;
  }
  /**
   * Cache title with simple FIFO eviction
   */
  cacheTitle(url, title) {
    if (this.cache.size >= this.settings.cacheSize) {
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
  clearCache() {
    this.cache.clear();
  }
  /**
   * Get current cache statistics (useful for debugging)
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.settings.cacheSize
    };
  }
};

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  enabled: true,
  cacheTtl: DEFAULT_CACHE_TTL_MINUTES,
  cacheSize: DEFAULT_CACHE_SIZE,
  showNotifications: true,
  supportedResourceTypes: ["issues"]
};
var SettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "GitHub Issue Linker Settings" });
    new import_obsidian.Setting(containerEl).setName("Enable plugin").setDesc("Turn the GitHub Issue Linker on or off").addToggle((toggle) => toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
      this.plugin.settings.enabled = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Cache TTL (minutes)").setDesc("How long to cache issue titles before refetching (minimum: 1 minute)").addText((text) => {
      const input = text.setPlaceholder("60").setValue(String(this.plugin.settings.cacheTtl)).onChange(async (value) => {
        const num = Number(value);
        if (Number.isInteger(num) && num > 0) {
          this.plugin.settings.cacheTtl = num;
          await this.plugin.saveSettings();
          errorEl.textContent = "";
          errorEl.style.color = "";
        } else {
          errorEl.textContent = "Please enter a positive integer";
          errorEl.style.color = "var(--text-error)";
        }
      });
      const errorEl = containerEl.createEl("div", {
        cls: "setting-item-description",
        text: ""
      });
      return input;
    });
    new import_obsidian.Setting(containerEl).setName("Cache size").setDesc("Maximum number of issue titles to cache (minimum: 10)").addText((text) => {
      const input = text.setPlaceholder("100").setValue(String(this.plugin.settings.cacheSize)).onChange(async (value) => {
        const num = Number(value);
        if (Number.isInteger(num) && num >= 10) {
          this.plugin.settings.cacheSize = num;
          await this.plugin.saveSettings();
          errorEl.textContent = "";
          errorEl.style.color = "";
        } else {
          errorEl.textContent = "Please enter an integer of 10 or more";
          errorEl.style.color = "var(--text-error)";
        }
      });
      const errorEl = containerEl.createEl("div", {
        cls: "setting-item-description",
        text: ""
      });
      return input;
    });
    new import_obsidian.Setting(containerEl).setName("Show notifications").setDesc("Display success and error notifications when processing GitHub URLs").addToggle((toggle) => toggle.setValue(this.plugin.settings.showNotifications).onChange(async (value) => {
      this.plugin.settings.showNotifications = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Supported resource types").setDesc("Types of GitHub resources to convert to links (Issues are currently supported)").addDropdown((dropdown) => dropdown.addOption("issues", "Issues only").setValue("issues").onChange(async (value) => {
      this.plugin.settings.supportedResourceTypes = [value];
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Usage" });
    containerEl.createEl("p", {
      text: "Simply paste a GitHub Issue URL into any Obsidian note, and it will be automatically converted to a Markdown link with the issue title."
    });
    containerEl.createEl("h3", { text: "Prerequisites" });
    const prereqList = containerEl.createEl("ul");
    prereqList.createEl("li", { text: "GitHub CLI (gh) must be installed on your system" });
    prereqList.createEl("li", { text: 'You must be authenticated with GitHub via "gh auth login"' });
    containerEl.createEl("p", {
      text: "If the GitHub CLI is not available, the plugin will be automatically disabled."
    });
  }
};

// src/main.ts
var GitHubIssueLinkPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.isPluginEnabled = false;
  }
  async onload() {
    console.log("Loading GitHub Issue Linker plugin");
    await this.loadSettings();
    this.githubService = new GitHubService(this.settings);
    if (!this.settings.enabled) {
      console.log("GitHub Issue Linker plugin is disabled in settings");
      this.addSettingTab(new SettingsTab(this.app, this));
      return;
    }
    const isGhAvailable = await this.githubService.checkGhAvailability();
    if (!isGhAvailable) {
      new import_obsidian2.Notice(MESSAGES.GH_NOT_AVAILABLE, NOTIFICATION_DURATION.ERROR);
      console.error("GitHub CLI (gh) is not available. Plugin disabled.");
      this.addSettingTab(new SettingsTab(this.app, this));
      return;
    }
    this.isPluginEnabled = true;
    this.registerDomEvent(document, "paste", this.handlePaste.bind(this));
    this.addSettingTab(new SettingsTab(this.app, this));
    console.log("GitHub Issue Linker plugin loaded successfully");
  }
  onunload() {
    console.log("Unloading GitHub Issue Linker plugin");
    this.isPluginEnabled = false;
  }
  /**
   * Handle paste events and convert GitHub Issue URLs to Markdown links
   */
  async handlePaste(evt) {
    var _a;
    if (!this.isPluginEnabled || !this.settings.enabled) {
      return;
    }
    const activeView = this.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
    if (!(activeView == null ? void 0 : activeView.editor)) {
      return;
    }
    const editor = activeView.editor;
    const clipboardData = (_a = evt.clipboardData) == null ? void 0 : _a.getData("text/plain");
    if (!clipboardData) {
      return;
    }
    if (!this.githubService.isGitHubIssueUrl(clipboardData)) {
      return;
    }
    evt.preventDefault();
    let processingNotice = null;
    if (this.settings.showNotifications) {
      processingNotice = new import_obsidian2.Notice(MESSAGES.FETCHING_TITLE, NOTIFICATION_DURATION.PERSISTENT);
    }
    try {
      const title = await this.githubService.fetchIssueTitle(clipboardData);
      const markdownLink = `[${title}](${clipboardData})`;
      editor.replaceSelection(markdownLink);
      if (processingNotice) {
        processingNotice.hide();
      }
      if (this.settings.showNotifications) {
        new import_obsidian2.Notice(MESSAGES.FETCH_SUCCESS, NOTIFICATION_DURATION.SUCCESS);
      }
      console.log(`Successfully converted GitHub issue URL to link: ${title}`);
    } catch (error) {
      if (processingNotice) {
        processingNotice.hide();
      }
      if (this.settings.showNotifications) {
        new import_obsidian2.Notice(MESSAGES.FETCH_FAILED, NOTIFICATION_DURATION.ERROR);
      }
      editor.replaceSelection(clipboardData);
      if (error instanceof GitHubError) {
        console.error("GitHub Issue Linker error:", error.message);
      } else {
        console.error("GitHub Issue Linker unexpected error:", error);
      }
    }
  }
  /**
   * Load plugin settings
   */
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  /**
   * Save plugin settings
   */
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /**
   * Get plugin status for debugging
   */
  getStatus() {
    var _a;
    return {
      enabled: this.settings.enabled,
      pluginEnabled: this.isPluginEnabled,
      cacheStats: ((_a = this.githubService) == null ? void 0 : _a.getCacheStats()) || { size: 0, maxSize: 0 }
    };
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL0dpdEh1YlNlcnZpY2UudHMiLCAic3JjL2NvbnN0YW50cy50cyIsICJzcmMvc2V0dGluZ3MudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBNYXJrZG93blZpZXcgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBHaXRIdWJTZXJ2aWNlLCBHaXRIdWJFcnJvciB9IGZyb20gJy4vR2l0SHViU2VydmljZSc7XG5pbXBvcnQgeyBQbHVnaW5TZXR0aW5ncywgREVGQVVMVF9TRVRUSU5HUywgU2V0dGluZ3NUYWIgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IFxuICBNRVNTQUdFUywgXG4gIE5PVElGSUNBVElPTl9EVVJBVElPTiBcbn0gZnJvbSAnLi9jb25zdGFudHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHaXRIdWJJc3N1ZUxpbmtQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5ncyE6IFBsdWdpblNldHRpbmdzO1xuICBnaXRodWJTZXJ2aWNlITogR2l0SHViU2VydmljZTtcbiAgcHJpdmF0ZSBpc1BsdWdpbkVuYWJsZWQgPSBmYWxzZTtcblxuICBhc3luYyBvbmxvYWQoKSB7XG4gICAgY29uc29sZS5sb2coJ0xvYWRpbmcgR2l0SHViIElzc3VlIExpbmtlciBwbHVnaW4nKTtcblxuICAgIC8vIExvYWQgc2V0dGluZ3MgZmlyc3RcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBHaXRIdWIgc2VydmljZVxuICAgIHRoaXMuZ2l0aHViU2VydmljZSA9IG5ldyBHaXRIdWJTZXJ2aWNlKHRoaXMuc2V0dGluZ3MpO1xuXG4gICAgLy8gQ2hlY2sgaWYgcGx1Z2luIGlzIGVuYWJsZWQgaW4gc2V0dGluZ3NcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3MuZW5hYmxlZCkge1xuICAgICAgY29uc29sZS5sb2coJ0dpdEh1YiBJc3N1ZSBMaW5rZXIgcGx1Z2luIGlzIGRpc2FibGVkIGluIHNldHRpbmdzJyk7XG4gICAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNldHRpbmdzVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZ2ggQ0xJIGF2YWlsYWJpbGl0eSAoYmxvY2tpbmcgY2hlY2spXG4gICAgY29uc3QgaXNHaEF2YWlsYWJsZSA9IGF3YWl0IHRoaXMuZ2l0aHViU2VydmljZS5jaGVja0doQXZhaWxhYmlsaXR5KCk7XG4gICAgaWYgKCFpc0doQXZhaWxhYmxlKSB7XG4gICAgICBuZXcgTm90aWNlKE1FU1NBR0VTLkdIX05PVF9BVkFJTEFCTEUsIE5PVElGSUNBVElPTl9EVVJBVElPTi5FUlJPUik7XG4gICAgICBjb25zb2xlLmVycm9yKCdHaXRIdWIgQ0xJIChnaCkgaXMgbm90IGF2YWlsYWJsZS4gUGx1Z2luIGRpc2FibGVkLicpO1xuICAgICAgXG4gICAgICAvLyBTdGlsbCBhZGQgc2V0dGluZ3MgdGFiIHNvIHVzZXIgY2FuIHNlZSB0aGUgcmVxdWlyZW1lbnRzXG4gICAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNldHRpbmdzVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUGx1Z2luIGlzIHJlYWR5IHRvIHVzZVxuICAgIHRoaXMuaXNQbHVnaW5FbmFibGVkID0gdHJ1ZTtcbiAgICBcbiAgICAvLyBSZWdpc3RlciBwYXN0ZSBldmVudCBoYW5kbGVyXG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGRvY3VtZW50LCAncGFzdGUnLCB0aGlzLmhhbmRsZVBhc3RlLmJpbmQodGhpcykpO1xuXG4gICAgLy8gQWRkIHNldHRpbmdzIHRhYlxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU2V0dGluZ3NUYWIodGhpcy5hcHAsIHRoaXMpKTtcblxuICAgIGNvbnNvbGUubG9nKCdHaXRIdWIgSXNzdWUgTGlua2VyIHBsdWdpbiBsb2FkZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gIH1cblxuICBvbnVubG9hZCgpIHtcbiAgICBjb25zb2xlLmxvZygnVW5sb2FkaW5nIEdpdEh1YiBJc3N1ZSBMaW5rZXIgcGx1Z2luJyk7XG4gICAgdGhpcy5pc1BsdWdpbkVuYWJsZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGUgcGFzdGUgZXZlbnRzIGFuZCBjb252ZXJ0IEdpdEh1YiBJc3N1ZSBVUkxzIHRvIE1hcmtkb3duIGxpbmtzXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGhhbmRsZVBhc3RlKGV2dDogQ2xpcGJvYXJkRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBPbmx5IHByb2Nlc3MgaWYgcGx1Z2luIGlzIGVuYWJsZWQgYW5kIGZ1bmN0aW9uYWxcbiAgICBpZiAoIXRoaXMuaXNQbHVnaW5FbmFibGVkIHx8ICF0aGlzLnNldHRpbmdzLmVuYWJsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGhlIGFjdGl2ZSBlZGl0b3JcbiAgICBjb25zdCBhY3RpdmVWaWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcbiAgICBpZiAoIWFjdGl2ZVZpZXc/LmVkaXRvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGVkaXRvciA9IGFjdGl2ZVZpZXcuZWRpdG9yO1xuXG4gICAgLy8gR2V0IGNsaXBib2FyZCBkYXRhXG4gICAgY29uc3QgY2xpcGJvYXJkRGF0YSA9IGV2dC5jbGlwYm9hcmREYXRhPy5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XG4gICAgaWYgKCFjbGlwYm9hcmREYXRhKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgaXQncyBhIEdpdEh1YiBpc3N1ZSBVUkxcbiAgICBpZiAoIXRoaXMuZ2l0aHViU2VydmljZS5pc0dpdEh1Yklzc3VlVXJsKGNsaXBib2FyZERhdGEpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUHJldmVudCBkZWZhdWx0IHBhc3RlIGJlaGF2aW9yXG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAvLyBTaG93IHByb2Nlc3Npbmcgbm90aWNlXG4gICAgbGV0IHByb2Nlc3NpbmdOb3RpY2U6IE5vdGljZSB8IG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLnNldHRpbmdzLnNob3dOb3RpZmljYXRpb25zKSB7XG4gICAgICBwcm9jZXNzaW5nTm90aWNlID0gbmV3IE5vdGljZShNRVNTQUdFUy5GRVRDSElOR19USVRMRSwgTk9USUZJQ0FUSU9OX0RVUkFUSU9OLlBFUlNJU1RFTlQpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyBGZXRjaCBpc3N1ZSB0aXRsZVxuICAgICAgY29uc3QgdGl0bGUgPSBhd2FpdCB0aGlzLmdpdGh1YlNlcnZpY2UuZmV0Y2hJc3N1ZVRpdGxlKGNsaXBib2FyZERhdGEpO1xuICAgICAgXG4gICAgICAvLyBDcmVhdGUgbWFya2Rvd24gbGlua1xuICAgICAgY29uc3QgbWFya2Rvd25MaW5rID0gYFske3RpdGxlfV0oJHtjbGlwYm9hcmREYXRhfSlgO1xuICAgICAgXG4gICAgICAvLyBSZXBsYWNlIHRoZSBzZWxlY3Rpb24gd2l0aCB0aGUgbWFya2Rvd24gbGlua1xuICAgICAgZWRpdG9yLnJlcGxhY2VTZWxlY3Rpb24obWFya2Rvd25MaW5rKTtcbiAgICAgIFxuICAgICAgLy8gSGlkZSBwcm9jZXNzaW5nIG5vdGljZVxuICAgICAgaWYgKHByb2Nlc3NpbmdOb3RpY2UpIHtcbiAgICAgICAgcHJvY2Vzc2luZ05vdGljZS5oaWRlKCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIFNob3cgc3VjY2VzcyBub3RpZmljYXRpb25cbiAgICAgIGlmICh0aGlzLnNldHRpbmdzLnNob3dOb3RpZmljYXRpb25zKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoTUVTU0FHRVMuRkVUQ0hfU1VDQ0VTUywgTk9USUZJQ0FUSU9OX0RVUkFUSU9OLlNVQ0NFU1MpO1xuICAgICAgfVxuXG4gICAgICBjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IGNvbnZlcnRlZCBHaXRIdWIgaXNzdWUgVVJMIHRvIGxpbms6ICR7dGl0bGV9YCk7XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gSGlkZSBwcm9jZXNzaW5nIG5vdGljZVxuICAgICAgaWYgKHByb2Nlc3NpbmdOb3RpY2UpIHtcbiAgICAgICAgcHJvY2Vzc2luZ05vdGljZS5oaWRlKCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIFNob3cgZXJyb3Igbm90aWZpY2F0aW9uXG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5zaG93Tm90aWZpY2F0aW9ucykge1xuICAgICAgICBuZXcgTm90aWNlKE1FU1NBR0VTLkZFVENIX0ZBSUxFRCwgTk9USUZJQ0FUSU9OX0RVUkFUSU9OLkVSUk9SKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gRmFsbGJhY2s6IHBhc3RlIHRoZSBvcmlnaW5hbCBVUkxcbiAgICAgIGVkaXRvci5yZXBsYWNlU2VsZWN0aW9uKGNsaXBib2FyZERhdGEpO1xuICAgICAgXG4gICAgICAvLyBMb2cgdGhlIGVycm9yIGZvciBkZWJ1Z2dpbmdcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEdpdEh1YkVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0dpdEh1YiBJc3N1ZSBMaW5rZXIgZXJyb3I6JywgZXJyb3IubWVzc2FnZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdHaXRIdWIgSXNzdWUgTGlua2VyIHVuZXhwZWN0ZWQgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkIHBsdWdpbiBzZXR0aW5nc1xuICAgKi9cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNhdmUgcGx1Z2luIHNldHRpbmdzXG4gICAqL1xuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgICBcbiAgICAvLyBVcGRhdGUgc2VydmljZSBzZXR0aW5ncyByZWZlcmVuY2VcbiAgICAvLyBOb3RlOiBHaXRIdWJTZXJ2aWNlIHJlY2VpdmVzIHNldHRpbmdzIGJ5IHJlZmVyZW5jZSwgc28gdGhpcyBpcyBhdXRvbWF0aWNcbiAgICAvLyBCdXQgd2UgY291bGQgcmVpbml0aWFsaXplIGlmIG5lZWRlZCBmb3IgbW9yZSBjb21wbGV4IGNoYW5nZXNcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgcGx1Z2luIHN0YXR1cyBmb3IgZGVidWdnaW5nXG4gICAqL1xuICBnZXRTdGF0dXMoKTogeyBcbiAgICBlbmFibGVkOiBib29sZWFuOyBcbiAgICBwbHVnaW5FbmFibGVkOiBib29sZWFuOyBcbiAgICBjYWNoZVN0YXRzOiB7IHNpemU6IG51bWJlcjsgbWF4U2l6ZTogbnVtYmVyIH0gXG4gIH0ge1xuICAgIHJldHVybiB7XG4gICAgICBlbmFibGVkOiB0aGlzLnNldHRpbmdzLmVuYWJsZWQsXG4gICAgICBwbHVnaW5FbmFibGVkOiB0aGlzLmlzUGx1Z2luRW5hYmxlZCxcbiAgICAgIGNhY2hlU3RhdHM6IHRoaXMuZ2l0aHViU2VydmljZT8uZ2V0Q2FjaGVTdGF0cygpIHx8IHsgc2l6ZTogMCwgbWF4U2l6ZTogMCB9XG4gICAgfTtcbiAgfVxufSIsICJpbXBvcnQgeyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICd1dGlsJztcbmltcG9ydCB0eXBlIHsgUGx1Z2luU2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IFxuICBHSVRIVUJfSVNTVUVfUkVHRVgsIFxuICBHSF9WRVJTSU9OX0NPTU1BTkQsIFxuICBHSF9JU1NVRV9USVRMRV9DT01NQU5ELFxuICBHSF9DT01NQU5EX1RJTUVPVVQsXG4gIEdIX1ZFUlNJT05fQ0hFQ0tfVElNRU9VVCxcbiAgTUVTU0FHRVNcbn0gZnJvbSAnLi9jb25zdGFudHMnO1xuXG5jb25zdCBleGVjQXN5bmMgPSBwcm9taXNpZnkoZXhlYyk7XG5cbmludGVyZmFjZSBDYWNoZUVudHJ5IHtcbiAgdGl0bGU6IHN0cmluZztcbiAgdGltZXN0YW1wOiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBHaXRIdWJFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ0dpdEh1YkVycm9yJztcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgR2l0SHViU2VydmljZSB7XG4gIHByaXZhdGUgY2FjaGUgPSBuZXcgTWFwPHN0cmluZywgQ2FjaGVFbnRyeT4oKTtcbiAgXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc2V0dGluZ3M6IFBsdWdpblNldHRpbmdzKSB7fVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBHaXRIdWIgQ0xJIGlzIGF2YWlsYWJsZSBhbmQgd29ya2luZ1xuICAgKi9cbiAgYXN5bmMgY2hlY2tHaEF2YWlsYWJpbGl0eSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlY0FzeW5jKEdIX1ZFUlNJT05fQ09NTUFORCwgeyB0aW1lb3V0OiBHSF9WRVJTSU9OX0NIRUNLX1RJTUVPVVQgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2l0SHViIENMSSBhdmFpbGFiaWxpdHkgY2hlY2sgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVmFsaWRhdGUgaWYgYSBVUkwgaXMgYSBHaXRIdWIgSXNzdWUgVVJMXG4gICAqL1xuICBpc0dpdEh1Yklzc3VlVXJsKHVybDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIEdJVEhVQl9JU1NVRV9SRUdFWC50ZXN0KHVybC50cmltKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZldGNoIGlzc3VlIHRpdGxlIGZyb20gR2l0SHViIHVzaW5nIGdoIENMSVxuICAgKi9cbiAgYXN5bmMgZmV0Y2hJc3N1ZVRpdGxlKHVybDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAvLyBWYWxpZGF0ZSBVUkwgZmlyc3RcbiAgICBpZiAoIXRoaXMuaXNHaXRIdWJJc3N1ZVVybCh1cmwpKSB7XG4gICAgICB0aHJvdyBuZXcgR2l0SHViRXJyb3IoJ0ludmFsaWQgR2l0SHViIGlzc3VlIFVSTCBmb3JtYXQnKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBjYWNoZSBmaXJzdFxuICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuZ2V0Q2FjaGVkVGl0bGUodXJsKTtcbiAgICBpZiAoY2FjaGVkKSB7XG4gICAgICByZXR1cm4gY2FjaGVkO1xuICAgIH1cblxuICAgIC8vIEZldGNoIGZyb20gZ2ggQ0xJXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBHSF9JU1NVRV9USVRMRV9DT01NQU5EKHVybCk7XG4gICAgICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0FzeW5jKGNvbW1hbmQsIHsgXG4gICAgICAgIHRpbWVvdXQ6IEdIX0NPTU1BTkRfVElNRU9VVCBcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBjb25zdCB0aXRsZSA9IHN0ZG91dC50cmltKCk7XG4gICAgICBcbiAgICAgIGlmICghdGl0bGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEdpdEh1YkVycm9yKCdFbXB0eSB0aXRsZSByZWNlaXZlZCBmcm9tIEdpdEh1YiBDTEknKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2FjaGUgdGhlIHJlc3VsdFxuICAgICAgdGhpcy5jYWNoZVRpdGxlKHVybCwgdGl0bGUpO1xuICAgICAgXG4gICAgICByZXR1cm4gdGl0bGU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgLy8gRW5oYW5jZWQgZXJyb3IgaGFuZGxpbmcgYmFzZWQgb24gY29tbW9uIGdoIENMSSBlcnJvcnNcbiAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSBNRVNTQUdFUy5GRVRDSF9FUlJPUl9QUkVGSVg7XG4gICAgICBcbiAgICAgIGlmIChlcnJvci5jb2RlID09PSAnRVRJTUVET1VUJykge1xuICAgICAgICBlcnJvck1lc3NhZ2UgKz0gJ1JlcXVlc3QgdGltZWQgb3V0JztcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3Iuc3RkZXJyPy5pbmNsdWRlcygnbm90IGZvdW5kJykpIHtcbiAgICAgICAgZXJyb3JNZXNzYWdlICs9ICdJc3N1ZSBub3QgZm91bmQgb3IgcmVwb3NpdG9yeSBpcyBwcml2YXRlJztcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3Iuc3RkZXJyPy5pbmNsdWRlcygnYXV0aGVudGljYXRpb24nKSkge1xuICAgICAgICBlcnJvck1lc3NhZ2UgKz0gJ0dpdEh1YiBhdXRoZW50aWNhdGlvbiByZXF1aXJlZC4gUnVuIFwiZ2ggYXV0aCBsb2dpblwiJztcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3Iuc3RkZXJyPy5pbmNsdWRlcygncmF0ZSBsaW1pdCcpKSB7XG4gICAgICAgIGVycm9yTWVzc2FnZSArPSAnR2l0SHViIEFQSSByYXRlIGxpbWl0IGV4Y2VlZGVkLiBQbGVhc2UgdHJ5IGFnYWluIGxhdGVyJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVycm9yTWVzc2FnZSArPSBlcnJvci5tZXNzYWdlIHx8ICdVbmtub3duIGVycm9yIG9jY3VycmVkJztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgdGhyb3cgbmV3IEdpdEh1YkVycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjYWNoZWQgdGl0bGUgaWYgYXZhaWxhYmxlIGFuZCBub3QgZXhwaXJlZFxuICAgKi9cbiAgcHJpdmF0ZSBnZXRDYWNoZWRUaXRsZSh1cmw6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5jYWNoZS5nZXQodXJsKTtcbiAgICBpZiAoIWVudHJ5KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBjYWNoZSBlbnRyeSBoYXMgZXhwaXJlZFxuICAgIGNvbnN0IGlzRXhwaXJlZCA9IERhdGUubm93KCkgLSBlbnRyeS50aW1lc3RhbXAgPiB0aGlzLnNldHRpbmdzLmNhY2hlVHRsICogNjAgKiAxMDAwO1xuICAgIGlmIChpc0V4cGlyZWQpIHtcbiAgICAgIHRoaXMuY2FjaGUuZGVsZXRlKHVybCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBNb3ZlIHRvIGVuZCBmb3IgTFJVIGJlaGF2aW9yIChvcHRpb25hbCBlbmhhbmNlbWVudClcbiAgICBpZiAodGhpcy5jYWNoZS5zaXplID4gMSkge1xuICAgICAgdGhpcy5jYWNoZS5kZWxldGUodXJsKTtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KHVybCwgZW50cnkpO1xuICAgIH1cblxuICAgIHJldHVybiBlbnRyeS50aXRsZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWNoZSB0aXRsZSB3aXRoIHNpbXBsZSBGSUZPIGV2aWN0aW9uXG4gICAqL1xuICBwcml2YXRlIGNhY2hlVGl0bGUodXJsOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAvLyBTaW1wbGUgRklGTyBldmljdGlvbiBpZiBjYWNoZSBpcyBmdWxsXG4gICAgaWYgKHRoaXMuY2FjaGUuc2l6ZSA+PSB0aGlzLnNldHRpbmdzLmNhY2hlU2l6ZSkge1xuICAgICAgLy8gRGVsZXRlIHRoZSBvbGRlc3QgZW50cnkgKGZpcnN0IGluIE1hcCBpdGVyYXRpb24gb3JkZXIpXG4gICAgICBjb25zdCBvbGRlc3RLZXkgPSB0aGlzLmNhY2hlLmtleXMoKS5uZXh0KCkudmFsdWU7XG4gICAgICBpZiAob2xkZXN0S2V5KSB7XG4gICAgICAgIHRoaXMuY2FjaGUuZGVsZXRlKG9sZGVzdEtleSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jYWNoZS5zZXQodXJsLCB7XG4gICAgICB0aXRsZSxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFyIHRoZSBlbnRpcmUgY2FjaGUgKHVzZWZ1bCBmb3IgdGVzdGluZyBvciBtYW51YWwgY2FjaGUgY2xlYXJpbmcpXG4gICAqL1xuICBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgIHRoaXMuY2FjaGUuY2xlYXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY3VycmVudCBjYWNoZSBzdGF0aXN0aWNzICh1c2VmdWwgZm9yIGRlYnVnZ2luZylcbiAgICovXG4gIGdldENhY2hlU3RhdHMoKTogeyBzaXplOiBudW1iZXI7IG1heFNpemU6IG51bWJlciB9IHtcbiAgICByZXR1cm4ge1xuICAgICAgc2l6ZTogdGhpcy5jYWNoZS5zaXplLFxuICAgICAgbWF4U2l6ZTogdGhpcy5zZXR0aW5ncy5jYWNoZVNpemVcbiAgICB9O1xuICB9XG59IiwgIi8vIFVSTCBwYXR0ZXJucyBmb3IgR2l0SHViIHJlc291cmNlc1xuZXhwb3J0IGNvbnN0IEdJVEhVQl9JU1NVRV9SRUdFWCA9IC9eaHR0cHM/OlxcL1xcL2dpdGh1YlxcLmNvbVxcL1teXFwvXStcXC9bXlxcL10rXFwvaXNzdWVzXFwvXFxkKyQvO1xuXG4vLyBHaXRIdWIgQ0xJIGNvbW1hbmRzXG5leHBvcnQgY29uc3QgR0hfVkVSU0lPTl9DT01NQU5EID0gJ2doIC0tdmVyc2lvbic7XG5leHBvcnQgY29uc3QgR0hfSVNTVUVfVElUTEVfQ09NTUFORCA9ICh1cmw6IHN0cmluZykgPT4gYGdoIGlzc3VlIHZpZXcgXCIke3VybH1cIiAtLWpzb24gdGl0bGUgLXEgLnRpdGxlYDtcblxuLy8gVGltZW91dCBzZXR0aW5ncyAobWlsbGlzZWNvbmRzKVxuZXhwb3J0IGNvbnN0IEdIX0NPTU1BTkRfVElNRU9VVCA9IDgwMDA7XG5leHBvcnQgY29uc3QgR0hfVkVSU0lPTl9DSEVDS19USU1FT1VUID0gNTAwMDtcblxuLy8gQ2FjaGUgc2V0dGluZ3MgZGVmYXVsdHNcbmV4cG9ydCBjb25zdCBERUZBVUxUX0NBQ0hFX1RUTF9NSU5VVEVTID0gNjA7XG5leHBvcnQgY29uc3QgREVGQVVMVF9DQUNIRV9TSVpFID0gMTAwO1xuXG4vLyBVc2VyIG5vdGlmaWNhdGlvbiBtZXNzYWdlc1xuZXhwb3J0IGNvbnN0IE1FU1NBR0VTID0ge1xuICBHSF9OT1RfQVZBSUxBQkxFOiAnR2l0SHViIENMSSAoZ2gpIGlzIG5vdCBhdmFpbGFibGUuIFBsdWdpbiBkaXNhYmxlZC4nLFxuICBGRVRDSElOR19USVRMRTogJ0ZldGNoaW5nIEdpdEh1YiBpc3N1ZSB0aXRsZS4uLicsXG4gIEZFVENIX1NVQ0NFU1M6ICdHaXRIdWIgaXNzdWUgdGl0bGUgY29udmVydGVkIHRvIGxpbmsnLFxuICBGRVRDSF9GQUlMRUQ6ICdGYWlsZWQgdG8gZmV0Y2ggdGl0bGUuIFVzaW5nIG9yaWdpbmFsIFVSTC4nLFxuICBGRVRDSF9FUlJPUl9QUkVGSVg6ICdGYWlsZWQgdG8gZmV0Y2ggaXNzdWUgdGl0bGU6ICcsXG59IGFzIGNvbnN0O1xuXG4vLyBOb3RpZmljYXRpb24gZGlzcGxheSBkdXJhdGlvbnMgKG1pbGxpc2Vjb25kcylcbmV4cG9ydCBjb25zdCBOT1RJRklDQVRJT05fRFVSQVRJT04gPSB7XG4gIFNVQ0NFU1M6IDIwMDAsXG4gIEVSUk9SOiA0MDAwLFxuICBQRVJTSVNURU5UOiAwLCAvLyAwIG1lYW5zIG5vIGF1dG8taGlkZVxufSBhcyBjb25zdDsiLCAiaW1wb3J0IHsgQXBwLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHR5cGUgR2l0SHViSXNzdWVMaW5rUGx1Z2luIGZyb20gJy4vbWFpbic7XG5pbXBvcnQgeyBERUZBVUxUX0NBQ0hFX1RUTF9NSU5VVEVTLCBERUZBVUxUX0NBQ0hFX1NJWkUgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGx1Z2luU2V0dGluZ3Mge1xuICBlbmFibGVkOiBib29sZWFuO1xuICBjYWNoZVR0bDogbnVtYmVyOyAvLyBtaW51dGVzXG4gIGNhY2hlU2l6ZTogbnVtYmVyO1xuICBzaG93Tm90aWZpY2F0aW9uczogYm9vbGVhbjtcbiAgc3VwcG9ydGVkUmVzb3VyY2VUeXBlczogKCdpc3N1ZXMnIHwgJ3BycycpW107XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBQbHVnaW5TZXR0aW5ncyA9IHtcbiAgZW5hYmxlZDogdHJ1ZSxcbiAgY2FjaGVUdGw6IERFRkFVTFRfQ0FDSEVfVFRMX01JTlVURVMsXG4gIGNhY2hlU2l6ZTogREVGQVVMVF9DQUNIRV9TSVpFLFxuICBzaG93Tm90aWZpY2F0aW9uczogdHJ1ZSxcbiAgc3VwcG9ydGVkUmVzb3VyY2VUeXBlczogWydpc3N1ZXMnXVxufTtcblxuZXhwb3J0IGNsYXNzIFNldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHBsdWdpbjogR2l0SHViSXNzdWVMaW5rUGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IEdpdEh1Yklzc3VlTGlua1BsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiAnR2l0SHViIElzc3VlIExpbmtlciBTZXR0aW5ncycgfSk7XG5cbiAgICAvLyBFbmFibGUvRGlzYWJsZSBwbHVnaW5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdFbmFibGUgcGx1Z2luJylcbiAgICAgIC5zZXREZXNjKCdUdXJuIHRoZSBHaXRIdWIgSXNzdWUgTGlua2VyIG9uIG9yIG9mZicpXG4gICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGVcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZWQpXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVkID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pKTtcblxuICAgIC8vIENhY2hlIFRUTCBzZXR0aW5nXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnQ2FjaGUgVFRMIChtaW51dGVzKScpXG4gICAgICAuc2V0RGVzYygnSG93IGxvbmcgdG8gY2FjaGUgaXNzdWUgdGl0bGVzIGJlZm9yZSByZWZldGNoaW5nIChtaW5pbXVtOiAxIG1pbnV0ZSknKVxuICAgICAgLmFkZFRleHQodGV4dCA9PiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gdGV4dFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignNjAnKVxuICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FjaGVUdGwpKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG51bSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoTnVtYmVyLmlzSW50ZWdlcihudW0pICYmIG51bSA+IDApIHtcbiAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FjaGVUdGwgPSBudW07XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9yIGlmIGFueVxuICAgICAgICAgICAgICBlcnJvckVsLnRleHRDb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgIGVycm9yRWwuc3R5bGUuY29sb3IgPSAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFNob3cgdmFsaWRhdGlvbiBlcnJvclxuICAgICAgICAgICAgICBlcnJvckVsLnRleHRDb250ZW50ID0gJ1BsZWFzZSBlbnRlciBhIHBvc2l0aXZlIGludGVnZXInO1xuICAgICAgICAgICAgICBlcnJvckVsLnN0eWxlLmNvbG9yID0gJ3ZhcigtLXRleHQtZXJyb3IpJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgdmFsaWRhdGlvbiBmZWVkYmFjayBlbGVtZW50XG4gICAgICAgIGNvbnN0IGVycm9yRWwgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnZGl2JywgeyBcbiAgICAgICAgICBjbHM6ICdzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb24nLFxuICAgICAgICAgIHRleHQ6ICcnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBpbnB1dDtcbiAgICAgIH0pO1xuXG4gICAgLy8gQ2FjaGUgc2l6ZSBzZXR0aW5nXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnQ2FjaGUgc2l6ZScpXG4gICAgICAuc2V0RGVzYygnTWF4aW11bSBudW1iZXIgb2YgaXNzdWUgdGl0bGVzIHRvIGNhY2hlIChtaW5pbXVtOiAxMCknKVxuICAgICAgLmFkZFRleHQodGV4dCA9PiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gdGV4dFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignMTAwJylcbiAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmNhY2hlU2l6ZSkpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbnVtID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgICAgICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKG51bSkgJiYgbnVtID49IDEwKSB7XG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNhY2hlU2l6ZSA9IG51bTtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3IgaWYgYW55XG4gICAgICAgICAgICAgIGVycm9yRWwudGV4dENvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgZXJyb3JFbC5zdHlsZS5jb2xvciA9ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gU2hvdyB2YWxpZGF0aW9uIGVycm9yXG4gICAgICAgICAgICAgIGVycm9yRWwudGV4dENvbnRlbnQgPSAnUGxlYXNlIGVudGVyIGFuIGludGVnZXIgb2YgMTAgb3IgbW9yZSc7XG4gICAgICAgICAgICAgIGVycm9yRWwuc3R5bGUuY29sb3IgPSAndmFyKC0tdGV4dC1lcnJvciknO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCB2YWxpZGF0aW9uIGZlZWRiYWNrIGVsZW1lbnRcbiAgICAgICAgY29uc3QgZXJyb3JFbCA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdkaXYnLCB7IFxuICAgICAgICAgIGNsczogJ3NldHRpbmctaXRlbS1kZXNjcmlwdGlvbicsXG4gICAgICAgICAgdGV4dDogJydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgICAgfSk7XG5cbiAgICAvLyBTaG93IG5vdGlmaWNhdGlvbnMgc2V0dGluZ1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1Nob3cgbm90aWZpY2F0aW9ucycpXG4gICAgICAuc2V0RGVzYygnRGlzcGxheSBzdWNjZXNzIGFuZCBlcnJvciBub3RpZmljYXRpb25zIHdoZW4gcHJvY2Vzc2luZyBHaXRIdWIgVVJMcycpXG4gICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGVcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnNob3dOb3RpZmljYXRpb25zKVxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2hvd05vdGlmaWNhdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSkpO1xuXG4gICAgLy8gU3VwcG9ydGVkIHJlc291cmNlIHR5cGVzIChmb3IgZnV0dXJlIGV4dGVuc2lvbilcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdTdXBwb3J0ZWQgcmVzb3VyY2UgdHlwZXMnKVxuICAgICAgLnNldERlc2MoJ1R5cGVzIG9mIEdpdEh1YiByZXNvdXJjZXMgdG8gY29udmVydCB0byBsaW5rcyAoSXNzdWVzIGFyZSBjdXJyZW50bHkgc3VwcG9ydGVkKScpXG4gICAgICAuYWRkRHJvcGRvd24oZHJvcGRvd24gPT4gZHJvcGRvd25cbiAgICAgICAgLmFkZE9wdGlvbignaXNzdWVzJywgJ0lzc3VlcyBvbmx5JylcbiAgICAgICAgLnNldFZhbHVlKCdpc3N1ZXMnKVxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgLy8gRm9yIG5vdywgb25seSBpc3N1ZXMgYXJlIHN1cHBvcnRlZFxuICAgICAgICAgIC8vIFRoaXMgaXMgcHJlcGFyZWQgZm9yIGZ1dHVyZSBQUiBzdXBwb3J0XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3VwcG9ydGVkUmVzb3VyY2VUeXBlcyA9IFt2YWx1ZSBhcyAnaXNzdWVzJyB8ICdwcnMnXTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSkpO1xuXG4gICAgLy8gQWRkIHVzYWdlIGluc3RydWN0aW9uc1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ1VzYWdlJyB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHsgXG4gICAgICB0ZXh0OiAnU2ltcGx5IHBhc3RlIGEgR2l0SHViIElzc3VlIFVSTCBpbnRvIGFueSBPYnNpZGlhbiBub3RlLCBhbmQgaXQgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IGNvbnZlcnRlZCB0byBhIE1hcmtkb3duIGxpbmsgd2l0aCB0aGUgaXNzdWUgdGl0bGUuJyBcbiAgICB9KTtcbiAgICBcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdQcmVyZXF1aXNpdGVzJyB9KTtcbiAgICBjb25zdCBwcmVyZXFMaXN0ID0gY29udGFpbmVyRWwuY3JlYXRlRWwoJ3VsJyk7XG4gICAgcHJlcmVxTGlzdC5jcmVhdGVFbCgnbGknLCB7IHRleHQ6ICdHaXRIdWIgQ0xJIChnaCkgbXVzdCBiZSBpbnN0YWxsZWQgb24geW91ciBzeXN0ZW0nIH0pO1xuICAgIHByZXJlcUxpc3QuY3JlYXRlRWwoJ2xpJywgeyB0ZXh0OiAnWW91IG11c3QgYmUgYXV0aGVudGljYXRlZCB3aXRoIEdpdEh1YiB2aWEgXCJnaCBhdXRoIGxvZ2luXCInIH0pO1xuICAgIFxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdwJywgeyBcbiAgICAgIHRleHQ6ICdJZiB0aGUgR2l0SHViIENMSSBpcyBub3QgYXZhaWxhYmxlLCB0aGUgcGx1Z2luIHdpbGwgYmUgYXV0b21hdGljYWxseSBkaXNhYmxlZC4nIFxuICAgIH0pO1xuICB9XG59Il0sCiAgIm1hcHBpbmdz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
