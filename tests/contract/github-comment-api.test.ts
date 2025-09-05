import { CommentData, CommentFetchError } from '../../src/types';

/**
 * GitHub Comment API 契約テスト
 * 
 * 注意: これらのテストは実装前に作成されるため、現在は失敗します。
 * これはTDDの「RED」フェーズです。
 */

describe('GitHub Comment API Contract Tests', () => {
  // テスト用の実際のコメントURL（パブリックリポジトリ）
  const TEST_ISSUE_COMMENT_URL = 'https://github.com/microsoft/vscode/issues/1#issuecomment-221587237';
  const TEST_PR_COMMENT_URL = 'https://github.com/facebook/react/pull/1#issuecomment-1234567890';
  
  // 存在しないコメントのURL
  const NONEXISTENT_COMMENT_URL = 'https://github.com/microsoft/vscode/issues/999999#issuecomment-999999999';

  describe('Issue Comment API', () => {
    test('should fetch valid issue comment data', async () => {
      // この時点では GitHubService.fetchCommentData は存在しないため失敗する
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const result = await service.fetchCommentData(TEST_ISSUE_COMMENT_URL);
      
      // GitHub API契約の検証
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.body).toBeDefined();
      expect(result.user.login).toBeDefined();
      expect(result.html_url).toContain('github.com');
      expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });

    test('should handle non-existent issue comment', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      await expect(service.fetchCommentData(NONEXISTENT_COMMENT_URL))
        .rejects
        .toThrow('Comment not found');
    });
  });

  describe('PR Comment API', () => {
    test('should fetch valid PR comment data', async () => {
      // この時点では GitHubService.fetchCommentData は存在しないため失敗する
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const result = await service.fetchCommentData(TEST_PR_COMMENT_URL);
      
      // GitHub API契約の検証
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.body).toBeDefined();
      expect(result.user.login).toBeDefined();
      expect(result.html_url).toContain('github.com');
    });
  });

  describe('API Response Format', () => {
    test('should return comment data matching CommentData interface', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const result = await service.fetchCommentData(TEST_ISSUE_COMMENT_URL);
      
      // CommentDataインターフェースとの契約検証
      expect(typeof result.id).toBe('number');
      expect(typeof result.url).toBe('string');
      expect(typeof result.html_url).toBe('string');
      expect(typeof result.body).toBe('string');
      expect(typeof result.created_at).toBe('string');
      expect(typeof result.updated_at).toBe('string');
      expect(typeof result.user.login).toBe('string');
      expect(typeof result.user.avatar_url).toBe('string');
      expect(typeof result.user.html_url).toBe('string');
      expect(typeof result.issue_url).toBe('string');
    });
  });

  describe('Error Handling', () => {
    test('should throw appropriate errors for various failure cases', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // 404 エラー
      await expect(service.fetchCommentData(NONEXISTENT_COMMENT_URL))
        .rejects
        .toThrow();
        
      // 無効なURL
      await expect(service.fetchCommentData('https://invalid-url'))
        .rejects
        .toThrow();
        
      // GitHub以外のURL
      await expect(service.fetchCommentData('https://gitlab.com/project/repo/issues/1#note_123'))
        .rejects
        .toThrow();
    });
  });
});

// ヘルパー関数：テストで使用する模擬データ
export const mockCommentData: CommentData = {
  id: 221587237,
  url: 'https://api.github.com/repos/microsoft/vscode/issues/comments/221587237',
  html_url: 'https://github.com/microsoft/vscode/issues/1#issuecomment-221587237',
  body: 'This is a test comment body with markdown **formatting**.',
  created_at: '2016-05-12T10:30:00Z',
  updated_at: '2016-05-12T10:30:00Z',
  user: {
    login: 'testuser',
    avatar_url: 'https://github.com/images/error/testuser_happy.gif',
    html_url: 'https://github.com/testuser'
  },
  issue_url: 'https://api.github.com/repos/microsoft/vscode/issues/1'
};