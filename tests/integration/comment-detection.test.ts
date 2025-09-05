import { 
  GITHUB_ISSUE_COMMENT_REGEX,
  GITHUB_PR_COMMENT_REGEX,
  GITHUB_PR_DISCUSSION_REGEX
} from '../../src/constants';
import { CommentType, CommentLinkInfo } from '../../src/types';

/**
 * コメントURL検出の統合テスト
 * 
 * 注意: これらのテストは実装前に作成されるため、現在は失敗します。
 * これはTDDの「RED」フェーズです。
 */

describe('Comment URL Detection Integration Tests', () => {
  
  describe('URL Pattern Recognition', () => {
    
    test('should recognize valid issue comment URLs', () => {
      const validIssueCommentUrls = [
        'https://github.com/microsoft/vscode/issues/123#issuecomment-456789',
        'http://github.com/facebook/react/issues/1#issuecomment-987654321',
        'https://github.com/owner/repo-name/issues/999#issuecomment-111222333'
      ];

      validIssueCommentUrls.forEach(url => {
        expect(GITHUB_ISSUE_COMMENT_REGEX.test(url)).toBe(true);
      });
    });

    test('should recognize valid PR comment URLs', () => {
      const validPrCommentUrls = [
        'https://github.com/microsoft/vscode/pull/123#issuecomment-456789',
        'http://github.com/facebook/react/pull/1#issuecomment-987654321',
        'https://github.com/owner/repo-name/pull/999#issuecomment-111222333'
      ];

      validPrCommentUrls.forEach(url => {
        expect(GITHUB_PR_COMMENT_REGEX.test(url)).toBe(true);
      });
    });

    test('should recognize valid PR discussion comment URLs', () => {
      const validPrDiscussionUrls = [
        'https://github.com/microsoft/vscode/pull/123#discussion_r456789',
        'http://github.com/facebook/react/pull/1#discussion_r987654321',
        'https://github.com/owner/repo-name/pull/999#discussion_r111222333'
      ];

      validPrDiscussionUrls.forEach(url => {
        expect(GITHUB_PR_DISCUSSION_REGEX.test(url)).toBe(true);
      });
    });

    test('should reject invalid comment URLs', () => {
      const invalidUrls = [
        'https://github.com/owner/repo/issues/123', // コメントハッシュなし
        'https://github.com/owner/repo/pull/123', // コメントハッシュなし
        'https://gitlab.com/owner/repo/issues/123#issuecomment-456789', // GitLab
        'https://github.com/owner/repo/issues/123#note-456789', // 異なるハッシュ形式
        'https://github.com/owner/repo/issues/123#issuecomment-', // コメントIDなし
        'https://github.com/owner/repo/pull/123#discussion_', // ディスカッションIDなし
        'not-a-url-at-all',
        ''
      ];

      invalidUrls.forEach(url => {
        expect(GITHUB_ISSUE_COMMENT_REGEX.test(url)).toBe(false);
        expect(GITHUB_PR_COMMENT_REGEX.test(url)).toBe(false);
        expect(GITHUB_PR_DISCUSSION_REGEX.test(url)).toBe(false);
      });
    });
  });

  describe('GitHubService Comment URL Detection', () => {
    
    test('should detect issue comment URLs', async () => {
      // この時点では GitHubService.isGitHubCommentUrl は存在しないため失敗する
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const url = 'https://github.com/microsoft/vscode/issues/123#issuecomment-456789';
      expect(service.isGitHubCommentUrl(url)).toBe(true);
    });

    test('should detect PR comment URLs', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const url = 'https://github.com/facebook/react/pull/456#issuecomment-789012';
      expect(service.isGitHubCommentUrl(url)).toBe(true);
    });

    test('should detect PR discussion URLs', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const url = 'https://github.com/facebook/react/pull/456#discussion_r789012';
      expect(service.isGitHubCommentUrl(url)).toBe(true);
    });

    test('should reject non-comment URLs', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const nonCommentUrls = [
        'https://github.com/microsoft/vscode/issues/123',
        'https://github.com/facebook/react/pull/456',
        'https://example.com/not-github',
        ''
      ];

      nonCommentUrls.forEach(url => {
        expect(service.isGitHubCommentUrl(url)).toBe(false);
      });
    });

    test('should extend isGitHubResourceUrl to include comment URLs', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const commentUrls = [
        'https://github.com/microsoft/vscode/issues/123#issuecomment-456789',
        'https://github.com/facebook/react/pull/456#issuecomment-789012',
        'https://github.com/facebook/react/pull/456#discussion_r789012'
      ];

      commentUrls.forEach(url => {
        // isGitHubResourceUrl は既存のメソッドですが、コメントURLもサポートするよう拡張される予定
        expect(service.isGitHubResourceUrl(url)).toBe(true);
      });
    });
  });

  describe('Comment URL Parsing', () => {
    
    test('should parse issue comment URL correctly', async () => {
      // この時点では GitHubService.parseCommentUrl は存在しないため失敗する
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const url = 'https://github.com/microsoft/vscode/issues/123#issuecomment-456789';
      const parsed: CommentLinkInfo = service.parseCommentUrl(url);
      
      expect(parsed.owner).toBe('microsoft');
      expect(parsed.repo).toBe('vscode');
      expect(parsed.issueNumber).toBe(123);
      expect(parsed.commentId).toBe(456789);
      expect(parsed.isPullRequest).toBe(false);
      expect(parsed.commentType).toBe(CommentType.ISSUE);
      expect(parsed.originalUrl).toBe(url);
    });

    test('should parse PR comment URL correctly', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const url = 'https://github.com/facebook/react/pull/789#issuecomment-123456';
      const parsed: CommentLinkInfo = service.parseCommentUrl(url);
      
      expect(parsed.owner).toBe('facebook');
      expect(parsed.repo).toBe('react');
      expect(parsed.issueNumber).toBe(789);
      expect(parsed.commentId).toBe(123456);
      expect(parsed.isPullRequest).toBe(true);
      expect(parsed.commentType).toBe(CommentType.ISSUE);
      expect(parsed.originalUrl).toBe(url);
    });

    test('should parse PR discussion URL correctly', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const url = 'https://github.com/facebook/react/pull/789#discussion_r123456';
      const parsed: CommentLinkInfo = service.parseCommentUrl(url);
      
      expect(parsed.owner).toBe('facebook');
      expect(parsed.repo).toBe('react');
      expect(parsed.issueNumber).toBe(789);
      expect(parsed.commentId).toBe(123456);
      expect(parsed.isPullRequest).toBe(true);
      expect(parsed.commentType).toBe(CommentType.DISCUSSION);
      expect(parsed.originalUrl).toBe(url);
    });

    test('should throw error for invalid comment URLs', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const invalidUrls = [
        'https://github.com/owner/repo/issues/123',
        'not-a-url',
        'https://gitlab.com/owner/repo/issues/123#issuecomment-456'
      ];

      invalidUrls.forEach(url => {
        expect(() => service.parseCommentUrl(url)).toThrow();
      });
    });
  });
});