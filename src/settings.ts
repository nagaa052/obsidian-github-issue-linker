import { App, PluginSettingTab, Setting } from 'obsidian';
import type GitHubIssueLinkPlugin from './main';
import { DEFAULT_CACHE_TTL_MINUTES, DEFAULT_CACHE_SIZE } from './constants';
import { PathResolver } from './PathResolver';

export interface PluginSettings {
  enabled: boolean;
  cacheTtl: number; // minutes
  cacheSize: number;
  showNotifications: boolean;
  supportedResourceTypes: ('issues' | 'prs')[];
  ghPath?: string; // Optional custom path to GitHub CLI executable
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
  private pathResolver: PathResolver;

  constructor(app: App, plugin: GitHubIssueLinkPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.pathResolver = new PathResolver();
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

    // GitHub CLI Path setting
    new Setting(containerEl)
      .setName('GitHub CLI Path')
      .setDesc('Custom path to GitHub CLI executable (leave empty for auto-detection)')
      .addText(text => {
        const input = text
          .setPlaceholder('Auto-detect (recommended)')
          .setValue(this.plugin.settings.ghPath || '')
          .onChange(async (value) => {
            // Clear previous validation state
            statusEl.textContent = '';
            statusEl.className = 'setting-item-description';
            
            // Update setting
            this.plugin.settings.ghPath = value.trim() || undefined;
            await this.plugin.saveSettings();
            
            // Validate the path
            if (value.trim()) {
              this.validateGhPath(value.trim(), statusEl);
            }
          });

        // Add validation status element
        const statusEl = containerEl.createEl('div', { 
          cls: 'setting-item-description',
          text: ''
        });

        // Add buttons for auto-detect and validation
        const buttonContainer = containerEl.createEl('div', {
          cls: 'setting-item-control'
        });
        
        // Auto-detect button
        const autoDetectBtn = buttonContainer.createEl('button', {
          text: 'Auto-detect',
          cls: 'mod-cta'
        });
        autoDetectBtn.onclick = async () => {
          statusEl.textContent = 'Detecting GitHub CLI...';
          statusEl.className = 'setting-item-description';
          
          const result = await this.pathResolver.resolveGhPath();
          if (result.success && result.path) {
            input.setValue(result.path);
            this.plugin.settings.ghPath = result.path;
            await this.plugin.saveSettings();
            statusEl.textContent = `✓ Found GitHub CLI at: ${result.path} (${result.method})`;
            statusEl.style.color = 'var(--text-success)';
          } else {
            statusEl.textContent = `✗ ${result.error}`;
            statusEl.style.color = 'var(--text-error)';
          }
        };
        
        // Test button
        const testBtn = buttonContainer.createEl('button', {
          text: 'Test'
        });
        testBtn.style.marginLeft = '8px';
        testBtn.onclick = async () => {
          const pathToTest = input.getValue().trim() || undefined;
          await this.validateGhPath(pathToTest, statusEl);
        };

        return input;
      })
      .addExtraButton(button => {
        button
          .setIcon('info')
          .setTooltip('GitHub CLI installation instructions')
          .onClick(() => {
            const instructions = this.pathResolver.getInstallationInstructions();
            // Show instructions in a notice or modal
            const modal = new (require('obsidian').Modal)(this.app);
            modal.titleEl.setText('GitHub CLI Installation');
            modal.contentEl.createEl('p', { text: instructions });
            modal.contentEl.createEl('p', { text: 'After installation, restart Obsidian and use the "Auto-detect" button.' });
            modal.open();
          });
      });

    // Supported resource types
    new Setting(containerEl)
      .setName('Supported resource types')
      .setDesc('Types of GitHub resources to convert to links')
      .addDropdown(dropdown => dropdown
        .addOption('issues', 'Issues only')
        .addOption('prs', 'Pull Requests only')
        .addOption('both', 'Issues and Pull Requests')
        .setValue(this.plugin.settings.supportedResourceTypes.includes('prs') ? 
          (this.plugin.settings.supportedResourceTypes.includes('issues') ? 'both' : 'prs') : 'issues')
        .onChange(async (value) => {
          if (value === 'issues') {
            this.plugin.settings.supportedResourceTypes = ['issues'];
          } else if (value === 'prs') {
            this.plugin.settings.supportedResourceTypes = ['prs'];
          } else {
            this.plugin.settings.supportedResourceTypes = ['issues', 'prs'];
          }
          await this.plugin.saveSettings();
        }));

    // Add usage instructions
    containerEl.createEl('h3', { text: 'Usage' });
    containerEl.createEl('p', { 
      text: 'Simply paste a GitHub Issue or Pull Request URL into any Obsidian note, and it will be automatically converted to a Markdown link with the resource title.' 
    });
    
    containerEl.createEl('h3', { text: 'Prerequisites' });
    const prereqList = containerEl.createEl('ul');
    prereqList.createEl('li', { text: 'GitHub CLI (gh) must be installed on your system' });
    prereqList.createEl('li', { text: 'You must be authenticated with GitHub via "gh auth login"' });
    
    containerEl.createEl('p', { 
      text: 'If the GitHub CLI is not available, the plugin will be automatically disabled.' 
    });
  }

  /**
   * Validate GitHub CLI path and update status element
   */
  private async validateGhPath(pathToTest: string | undefined, statusEl: HTMLElement): Promise<void> {
    statusEl.textContent = 'Validating GitHub CLI...';
    statusEl.className = 'setting-item-description';
    statusEl.style.color = '';
    
    try {
      const result = await this.pathResolver.resolveGhPath(pathToTest);
      
      if (result.success && result.path) {
        statusEl.textContent = `✓ GitHub CLI is working: ${result.path}`;
        statusEl.style.color = 'var(--text-success)';
      } else {
        statusEl.textContent = `✗ ${result.error}`;
        statusEl.style.color = 'var(--text-error)';
        
        // Show installation instructions
        const instructionsEl = statusEl.parentElement?.createEl('div', {
          cls: 'setting-item-description'
        });
        
        if (instructionsEl) {
          instructionsEl.style.marginTop = '8px';
          instructionsEl.style.padding = '8px';
          instructionsEl.style.backgroundColor = 'var(--background-secondary)';
          instructionsEl.style.borderRadius = '4px';
        }
        
        if (instructionsEl) {
          instructionsEl.createEl('strong', { text: 'Installation Instructions:' });
          instructionsEl.createEl('br');
          instructionsEl.createEl('span', { text: this.pathResolver.getInstallationInstructions() });
        }
      }
    } catch (error) {
      statusEl.textContent = `✗ Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      statusEl.style.color = 'var(--text-error)';
    }
  }
}