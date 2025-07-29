import { Plugin, Notice, MarkdownView } from 'obsidian';
import { GitHubService, GitHubError } from './GitHubService';
import { PluginSettings, DEFAULT_SETTINGS, SettingsTab } from './settings';
import { 
  MESSAGES, 
  NOTIFICATION_DURATION 
} from './constants';

export default class GitHubIssueLinkPlugin extends Plugin {
  settings!: PluginSettings;
  githubService!: GitHubService;
  private isPluginEnabled = false;

  async onload() {
    console.log('Loading GitHub Issue Linker plugin');

    // Load settings first
    await this.loadSettings();

    // Initialize GitHub service
    this.githubService = new GitHubService(this.settings);

    // Check if plugin is enabled in settings
    if (!this.settings.enabled) {
      console.log('GitHub Issue Linker plugin is disabled in settings');
      this.addSettingTab(new SettingsTab(this.app, this));
      return;
    }

    // Check gh CLI availability (blocking check)
    const isGhAvailable = await this.githubService.checkGhAvailability();
    if (!isGhAvailable) {
      new Notice(MESSAGES.GH_NOT_AVAILABLE, NOTIFICATION_DURATION.ERROR);
      console.error('GitHub CLI (gh) is not available. Plugin disabled.');
      
      // Still add settings tab so user can see the requirements
      this.addSettingTab(new SettingsTab(this.app, this));
      return;
    }

    // Plugin is ready to use
    this.isPluginEnabled = true;
    
    // Register paste event handler
    this.registerDomEvent(document, 'paste', this.handlePaste.bind(this));

    // Add settings tab
    this.addSettingTab(new SettingsTab(this.app, this));

    console.log('GitHub Issue Linker plugin loaded successfully');
  }

  onunload() {
    console.log('Unloading GitHub Issue Linker plugin');
    this.isPluginEnabled = false;
  }

  /**
   * Handle paste events and convert GitHub Issue URLs to Markdown links
   */
  private async handlePaste(evt: ClipboardEvent): Promise<void> {
    // Only process if plugin is enabled and functional
    if (!this.isPluginEnabled || !this.settings.enabled) {
      return;
    }

    // Get the active editor
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView?.editor) {
      return;
    }

    const editor = activeView.editor;

    // Get clipboard data
    const clipboardData = evt.clipboardData?.getData('text/plain');
    if (!clipboardData) {
      return;
    }

    // Check if it's a GitHub issue URL
    if (!this.githubService.isGitHubIssueUrl(clipboardData)) {
      return;
    }

    // Prevent default paste behavior
    evt.preventDefault();

    // Show processing notice
    let processingNotice: Notice | null = null;
    if (this.settings.showNotifications) {
      processingNotice = new Notice(MESSAGES.FETCHING_TITLE, NOTIFICATION_DURATION.PERSISTENT);
    }

    try {
      // Fetch issue title
      const title = await this.githubService.fetchIssueTitle(clipboardData);
      
      // Create markdown link
      const markdownLink = `[${title}](${clipboardData})`;
      
      // Replace the selection with the markdown link
      editor.replaceSelection(markdownLink);
      
      // Hide processing notice
      if (processingNotice) {
        processingNotice.hide();
      }
      
      // Show success notification
      if (this.settings.showNotifications) {
        new Notice(MESSAGES.FETCH_SUCCESS, NOTIFICATION_DURATION.SUCCESS);
      }

      console.log(`Successfully converted GitHub issue URL to link: ${title}`);
      
    } catch (error) {
      // Hide processing notice
      if (processingNotice) {
        processingNotice.hide();
      }
      
      // Show error notification
      if (this.settings.showNotifications) {
        new Notice(MESSAGES.FETCH_FAILED, NOTIFICATION_DURATION.ERROR);
      }
      
      // Fallback: paste the original URL
      editor.replaceSelection(clipboardData);
      
      // Log the error for debugging
      if (error instanceof GitHubError) {
        console.error('GitHub Issue Linker error:', error.message);
      } else {
        console.error('GitHub Issue Linker unexpected error:', error);
      }
    }
  }

  /**
   * Load plugin settings
   */
  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /**
   * Save plugin settings
   */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    
    // Update service settings reference
    // Note: GitHubService receives settings by reference, so this is automatic
    // But we could reinitialize if needed for more complex changes
  }

  /**
   * Get plugin status for debugging
   */
  getStatus(): { 
    enabled: boolean; 
    pluginEnabled: boolean; 
    cacheStats: { size: number; maxSize: number } 
  } {
    return {
      enabled: this.settings.enabled,
      pluginEnabled: this.isPluginEnabled,
      cacheStats: this.githubService?.getCacheStats() || { size: 0, maxSize: 0 }
    };
  }
}