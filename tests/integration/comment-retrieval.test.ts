import { CommentData, CommentLinkInfo, CommentType, GitHubCommentError } from '../../src/types';

/**
 * コメントデータ取得の統合テスト
 * 
 * 注意: これらのテストは実装前に作成されるため、現在は失敗します。
 * これはTDDの「RED」フェーズです。
 */

describe('Comment Data Retrieval Integration Tests', () => {
  
  // テスト用のコメントURL（実際に存在するパブリックリポジトリ）
  const TEST_ISSUE_COMMENT_URL = 'https://github.com/microsoft/vscode/issues/1#issuecomment-221587237';
  const TEST_PR_COMMENT_URL = 'https://github.com/facebook/react/pull/1#issuecomment-1234567'; // 例URL
  const TEST_PR_DISCUSSION_URL = 'https://github.com/facebook/react/pull/1#discussion_r1234567'; // 例URL
  
  // 存在しないコメントURL
  const NONEXISTENT_COMMENT_URL = 'https://github.com/microsoft/vscode/issues/999999#issuecomment-999999999';

  describe('Comment Data Fetching', () => {
    
    test('should fetch complete comment data from issue comment URL', async () => {
      // この時点では GitHubService.fetchCommentData は存在しないため失敗する
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const commentData = await service.fetchCommentData(TEST_ISSUE_COMMENT_URL);
      
      // 基本的なプロパティの存在確認
      expect(commentData).toBeDefined();
      expect(commentData.id).toBeGreaterThan(0);
      expect(commentData.body).toBeDefined();
      expect(commentData.body.length).toBeGreaterThan(0);
      expect(commentData.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(commentData.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      
      // ユーザー情報
      expect(commentData.user).toBeDefined();
      expect(commentData.user.login).toBeTruthy();
      expect(commentData.user.avatar_url).toContain('github');
      expect(commentData.user.html_url).toContain('github.com');
      
      // URL情報
      expect(commentData.url).toContain('api.github.com');
      expect(commentData.html_url).toContain('github.com');
      expect(commentData.html_url).toContain('#issuecomment-');
      expect(commentData.issue_url).toContain('api.github.com');
    });

    test('should fetch comment data from PR comment URL', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // PR コメントも同じAPIエンドポイントを使用
      const commentData = await service.fetchCommentData(TEST_PR_COMMENT_URL);
      
      expect(commentData).toBeDefined();
      expect(commentData.id).toBeGreaterThan(0);
      expect(commentData.body).toBeDefined();
      expect(commentData.user.login).toBeTruthy();
    });

    test('should handle GitHub API rate limits gracefully', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // レート制限に達した場合のテスト（モック実装時に有効）
      // 実際のAPIテスト中はスキップすることがある
      try {
        await service.fetchCommentData(TEST_ISSUE_COMMENT_URL);
      } catch (error) {
        if (error instanceof GitHubCommentError && error.message.includes('rate limit')) {
          expect(error.errorType).toBe('RATE_LIMITED');
        }
      }
    });

    test('should handle non-existent comments appropriately', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      await expect(service.fetchCommentData(NONEXISTENT_COMMENT_URL))
        .rejects
        .toThrow(GitHubCommentError);
    });
  });

  describe('Comment Formatting', () => {
    
    test('should format comment preview correctly', async () => {
      // この時点では GitHubService.formatCommentPreview は存在しないため失敗する
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const commentData = await service.fetchCommentData(TEST_ISSUE_COMMENT_URL);
      const formatted = service.formatCommentPreview(commentData);
      
      // フォーマットされたプレビューの確認
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted).toContain('#'); // Issue/PR番号を含む
      expect(formatted).toContain('(comment'); // コメント識別子を含む
      expect(formatted).toContain('by @'); // 作成者情報を含む
    });

    test('should truncate long comment bodies appropriately', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // 長いコメント本文を含むモックデータ
      const mockCommentData: CommentData = {
        id: 123456,
        url: 'https://api.github.com/repos/test/repo/issues/comments/123456',
        html_url: 'https://github.com/test/repo/issues/1#issuecomment-123456',
        body: 'This is a very long comment body that should be truncated in the preview. '.repeat(10),
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/images/error/testuser.gif',
          html_url: 'https://github.com/testuser'
        },
        issue_url: 'https://api.github.com/repos/test/repo/issues/1'
      };

      const formatted = service.formatCommentPreview(mockCommentData);
      
      // プレビューが適切に切り詰められることを確認
      expect(formatted.length).toBeLessThan(200); // 適切な長さに切り詰め
      expect(formatted).toMatch(/\.{3}$/); // 省略記号で終わる
    });

    test('should handle markdown formatting in comments', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const mockCommentData: CommentData = {
        id: 123456,
        url: 'https://api.github.com/repos/test/repo/issues/comments/123456',
        html_url: 'https://github.com/test/repo/issues/1#issuecomment-123456',
        body: '**Bold text** and `code snippet` with [link](https://example.com)',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        user: {
          login: 'testuser',
          avatar_url: 'https://github.com/images/error/testuser.gif',
          html_url: 'https://github.com/testuser'
        },
        issue_url: 'https://api.github.com/repos/test/repo/issues/1'
      };

      const formatted = service.formatCommentPreview(mockCommentData);
      
      // マークダウンが適切に処理されることを確認
      expect(formatted).toBeDefined();
      // プレビューではマークダウンは保持またはプレーンテキストに変換
      expect(formatted).toContain('Bold text');
      expect(formatted).toContain('code snippet');
    });
  });

  describe('Performance and Reliability', () => {
    
    test('should complete comment fetching within reasonable time', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const startTime = Date.now();
      await service.fetchCommentData(TEST_ISSUE_COMMENT_URL);
      const endTime = Date.now();
      
      // 2秒以内に完了することを確認（パフォーマンス要件）
      expect(endTime - startTime).toBeLessThan(2000);
    });

    test('should handle multiple concurrent comment fetches', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const urls = [
        TEST_ISSUE_COMMENT_URL,
        TEST_PR_COMMENT_URL
      ];

      // 複数の並行リクエスト
      const promises = urls.map(url => service.fetchCommentData(url));
      const results = await Promise.allSettled(promises);
      
      // 少なくとも一つは成功することを期待
      const successful = results.filter(result => result.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with GitHub CLI', () => {
    
    test('should use gh api command for comment retrieval', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // GitHub CLIが利用可能であることを確認
      const isAvailable = await service.checkGhAvailability();
      expect(isAvailable).toBe(true);
      
      // コメントの取得
      const commentData = await service.fetchCommentData(TEST_ISSUE_COMMENT_URL);
      expect(commentData).toBeDefined();
    });

    test('should handle gh CLI authentication errors', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      
      // 無効なpathでサービスを初期化（認証エラーをシミュレート）
      const service = new GitHubService({ ghPath: '/invalid/path/to/gh' });
      
      await expect(service.fetchCommentData(TEST_ISSUE_COMMENT_URL))
        .rejects
        .toThrow(GitHubCommentError);
    });
  });
});