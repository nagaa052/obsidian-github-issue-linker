import { App, PluginSettingTab, Setting } from 'obsidian';
import type GitHubIssueLinkPlugin from './main';
import { DEFAULT_CACHE_TTL_MINUTES, DEFAULT_CACHE_SIZE } from './constants';

export interface PluginSettings {
  enabled: boolean;
  cacheTtl: number; // minutes
  cacheSize: number;
  showNotifications: boolean;
  supportedResourceTypes: ('issues' | 'prs')[];
}

export const DEFAULT_SETTINGS: PluginSettings = {
  enabled: true,
  cacheTtl: DEFAULT_CACHE_TTL_MINUTES,
  cacheSize: DEFAULT_CACHE_SIZE,
  showNotifications: true,
  supportedResourceTypes: ['issues']
};

export class SettingsTab extends PluginSettingTab {
  plugin: GitHubIssueLinkPlugin;

  constructor(app: App, plugin: GitHubIssueLinkPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'GitHub Issue Linker Settings' });

    // Enable/Disable plugin
    new Setting(containerEl)
      .setName('Enable plugin')
      .setDesc('Turn the GitHub Issue Linker on or off')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enabled)
        .onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
        }));

    // Cache TTL setting
    new Setting(containerEl)
      .setName('Cache TTL (minutes)')
      .setDesc('How long to cache issue titles before refetching (minimum: 1 minute)')
      .addText(text => {
        const input = text
          .setPlaceholder('60')
          .setValue(String(this.plugin.settings.cacheTtl))
          .onChange(async (value) => {
            const num = Number(value);
            if (Number.isInteger(num) && num > 0) {
              this.plugin.settings.cacheTtl = num;
              await this.plugin.saveSettings();
              // Clear validation error if any
              errorEl.textContent = '';
              errorEl.style.color = '';
            } else {
              // Show validation error
              errorEl.textContent = 'Please enter a positive integer';
              errorEl.style.color = 'var(--text-error)';
            }
          });

        // Add validation feedback element
        const errorEl = containerEl.createEl('div', { 
          cls: 'setting-item-description',
          text: ''
        });

        return input;
      });

    // Cache size setting
    new Setting(containerEl)
      .setName('Cache size')
      .setDesc('Maximum number of issue titles to cache (minimum: 10)')
      .addText(text => {
        const input = text
          .setPlaceholder('100')
          .setValue(String(this.plugin.settings.cacheSize))
          .onChange(async (value) => {
            const num = Number(value);
            if (Number.isInteger(num) && num >= 10) {
              this.plugin.settings.cacheSize = num;
              await this.plugin.saveSettings();
              // Clear validation error if any
              errorEl.textContent = '';
              errorEl.style.color = '';
            } else {
              // Show validation error
              errorEl.textContent = 'Please enter an integer of 10 or more';
              errorEl.style.color = 'var(--text-error)';
            }
          });

        // Add validation feedback element
        const errorEl = containerEl.createEl('div', { 
          cls: 'setting-item-description',
          text: ''
        });

        return input;
      });

    // Show notifications setting
    new Setting(containerEl)
      .setName('Show notifications')
      .setDesc('Display success and error notifications when processing GitHub URLs')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showNotifications)
        .onChange(async (value) => {
          this.plugin.settings.showNotifications = value;
          await this.plugin.saveSettings();
        }));

    // Supported resource types (for future extension)
    new Setting(containerEl)
      .setName('Supported resource types')
      .setDesc('Types of GitHub resources to convert to links (Issues are currently supported)')
      .addDropdown(dropdown => dropdown
        .addOption('issues', 'Issues only')
        .setValue('issues')
        .onChange(async (value) => {
          // For now, only issues are supported
          // This is prepared for future PR support
          this.plugin.settings.supportedResourceTypes = [value as 'issues' | 'prs'];
          await this.plugin.saveSettings();
        }));

    // Add usage instructions
    containerEl.createEl('h3', { text: 'Usage' });
    containerEl.createEl('p', { 
      text: 'Simply paste a GitHub Issue URL into any Obsidian note, and it will be automatically converted to a Markdown link with the issue title.' 
    });
    
    containerEl.createEl('h3', { text: 'Prerequisites' });
    const prereqList = containerEl.createEl('ul');
    prereqList.createEl('li', { text: 'GitHub CLI (gh) must be installed on your system' });
    prereqList.createEl('li', { text: 'You must be authenticated with GitHub via "gh auth login"' });
    
    containerEl.createEl('p', { 
      text: 'If the GitHub CLI is not available, the plugin will be automatically disabled.' 
    });
  }
}