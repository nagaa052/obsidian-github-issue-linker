# Obsidian GitHub Issue Linker

An Obsidian plugin that automatically converts GitHub Issue URLs to Markdown links with titles using the GitHub CLI (`gh`).

## Features

- **Automatic URL Conversion**: Simply paste a GitHub Issue URL and it will be automatically converted to a Markdown link with the issue title
- **Intelligent Caching**: Titles are cached to improve performance and reduce API calls
- **Robust Error Handling**: Graceful fallback to original URL if title fetching fails
- **Configurable Settings**: Customize cache duration, size, and notification preferences
- **Native Integration**: Uses Obsidian's built-in paste handling for seamless user experience

## Prerequisites

Before using this plugin, ensure you have:

1. **GitHub CLI (`gh`) installed** on your system
   - Install from: https://cli.github.com/
   - Verify installation: `gh --version`

2. **GitHub authentication** configured
   - Run: `gh auth login`
   - Follow the prompts to authenticate with your GitHub account

## Installation

### Manual Installation

1. Download the latest release from the [releases page](../../releases)
2. Extract the files to your Obsidian vault's `.obsidian/plugins/obsidian-github-issue-linker/` directory
3. Enable the plugin in Obsidian's Community Plugins settings

### Development Installation

1. Clone this repository to your vault's plugins directory:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/nagaa052/obsidian-github-issue-linker.git
   ```

2. Install dependencies and build:
   ```bash
   cd obsidian-github-issue-linker
   npm install
   npm run build
   ```

3. Enable the plugin in Obsidian's settings

## Usage

1. **Basic Usage**: Copy any GitHub Issue URL and paste it into your Obsidian note
   
   **Before**: `https://github.com/owner/repo/issues/123`
   
   **After**: `[Fix critical bug in authentication flow](https://github.com/owner/repo/issues/123)`

2. **Processing Feedback**: The plugin shows a notification while fetching the title and indicates success or failure

3. **Automatic Fallback**: If title fetching fails (network issues, private repo, etc.), the original URL is pasted as fallback

## Configuration

Access plugin settings via **Settings → Community Plugins → GitHub Issue Linker**:

### Available Settings

- **Enable plugin**: Turn the plugin on/off
- **Cache TTL (minutes)**: How long to cache issue titles (default: 60 minutes)
- **Cache size**: Maximum number of titles to cache (default: 100)
- **Show notifications**: Display processing and result notifications (default: enabled)
- **Supported resource types**: Currently supports Issues only (PRs planned for future release)

## Technical Details

### Architecture

The plugin follows a clean, service-oriented architecture:

- **Main Plugin Class**: Handles Obsidian lifecycle and paste events
- **GitHubService**: Manages GitHub CLI interactions and caching
- **Settings Management**: Configurable options with validation
- **Constants**: Centralized configuration and patterns

### URL Pattern

The plugin recognizes GitHub Issue URLs matching this pattern:
```
https://github.com/[owner]/[repo]/issues/[number]
```

### Caching Strategy

- **In-memory cache** with configurable TTL and size limits
- **FIFO eviction** when cache reaches size limit
- **Automatic expiration** based on TTL settings

### Error Handling

The plugin handles various error scenarios gracefully:

- **GitHub CLI not available**: Plugin disables with user notification
- **Authentication issues**: Clear error message with resolution steps  
- **Network timeouts**: Configurable timeout with fallback behavior
- **Private repositories**: Appropriate error handling for access issues
- **Rate limiting**: GitHub API rate limit detection and user feedback

## Development

### Building

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### Project Structure

```
.
├── src/
│   ├── main.ts           # Plugin entry point
│   ├── GitHubService.ts  # GitHub CLI service layer  
│   ├── settings.ts       # Settings management
│   └── constants.ts      # Constants and patterns
├── main.ts               # esbuild entry point
├── manifest.json         # Plugin manifest
├── package.json          # Dependencies and scripts
└── esbuild.config.mjs    # Build configuration
```

### Key Dependencies

- **obsidian**: Obsidian API types and utilities
- **esbuild**: Fast TypeScript compilation and bundling
- **TypeScript**: Type safety and modern JavaScript features

## Troubleshooting

### Plugin Won't Load

1. **Check GitHub CLI**: Ensure `gh --version` works in terminal
2. **Verify Authentication**: Run `gh auth status` to check authentication
3. **Check Console**: Open Developer Tools to see error messages

### URLs Not Converting

1. **Verify URL Format**: Ensure the URL matches GitHub Issue pattern
2. **Check Plugin Status**: Verify plugin is enabled in settings
3. **Test GitHub CLI**: Try `gh issue view [URL]` in terminal manually

### Permission Issues

1. **Private Repositories**: Ensure you have access to the repository
2. **Authentication**: Re-run `gh auth login` if needed
3. **Token Scopes**: Verify your GitHub token has appropriate permissions

## Limitations

- **Desktop Only**: This plugin requires Node.js `child_process` and is not compatible with mobile versions of Obsidian
- **GitHub CLI Dependency**: Requires `gh` CLI to be installed and authenticated
- **Issues Only**: Currently supports GitHub Issues only (Pull Request support planned)
- **Network Required**: Cannot work offline as it needs to fetch issue titles

## Future Enhancements

- **Pull Request Support**: Convert GitHub PR URLs to links
- **Customizable Link Format**: User-defined link formatting options
- **Batch Processing**: Handle multiple URLs in a single paste operation
- **Repository Shortcuts**: Support for repo-relative issue references (e.g., `#123`)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with tests
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs via [GitHub Issues](../../issues)
- **Discussions**: Ask questions in [GitHub Discussions](../../discussions)  
- **Wiki**: Additional documentation in the [project wiki](../../wiki)