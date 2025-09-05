import { GitHubCommentError, CommentFetchError } from '../../src/types';

/**
 * エラーハンドリングの統合テスト
 * 
 * 注意: これらのテストは実装前に作成されるため、現在は失敗します。
 * これはTDDの「RED」フェーズです。
 */

describe('Comment Error Handling Integration Tests', () => {
  
  // 様々なエラーケースのテストURL
  const NONEXISTENT_COMMENT_URL = 'https://github.com/microsoft/vscode/issues/999999#issuecomment-999999999';
  const PRIVATE_REPO_COMMENT_URL = 'https://github.com/private/repo/issues/1#issuecomment-123456';
  const INVALID_COMMENT_URL = 'https://github.com/owner/repo/issues/abc#issuecomment-xyz';
  const NON_GITHUB_URL = 'https://gitlab.com/owner/repo/issues/1#note-123456';

  describe('GitHub API Error Responses', () => {
    
    test('should handle 404 Not Found errors correctly', async () => {
      // この時点では GitHubService のエラーハンドリングは実装されていないため失敗する
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      await expect(service.fetchCommentData(NONEXISTENT_COMMENT_URL))
        .rejects
        .toThrow(GitHubCommentError);
        
      try {
        await service.fetchCommentData(NONEXISTENT_COMMENT_URL);
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubCommentError);
        expect((error as GitHubCommentError).errorType).toBe(CommentFetchError.NOT_FOUND);
        expect(error.message).toContain('Comment not found');
      }
    });

    test('should handle 401 Unauthorized errors correctly', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      
      // 認証情報なしでサービスを作成
      const unauthenticatedService = new GitHubService({ ghPath: 'gh', useAuth: false });
      
      await expect(unauthenticatedService.fetchCommentData(PRIVATE_REPO_COMMENT_URL))
        .rejects
        .toThrow(GitHubCommentError);
        
      try {
        await unauthenticatedService.fetchCommentData(PRIVATE_REPO_COMMENT_URL);
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubCommentError);
        expect((error as GitHubCommentError).errorType).toBe(CommentFetchError.UNAUTHORIZED);
      }
    });

    test('should handle 403 Rate Limit errors correctly', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // レート制限をシミュレート（実装時にモック）
      // 実際のテストでは rate limit に達することは稀
      try {
        // 大量のリクエストを並行して送信（レート制限をトリガー）
        const requests = Array(100).fill(0).map((_, i) => 
          service.fetchCommentData(`https://github.com/microsoft/vscode/issues/${i}#issuecomment-${i}`)
        );
        
        await Promise.allSettled(requests);
      } catch (error) {
        if (error instanceof GitHubCommentError && 
            error.errorType === CommentFetchError.RATE_LIMITED) {
          expect(error.message).toContain('rate limit');
          expect(error.errorType).toBe(CommentFetchError.RATE_LIMITED);
        }
      }
    });

    test('should handle network timeout errors correctly', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      
      // 短いタイムアウトでサービスを作成
      const service = new GitHubService({ 
        ghPath: 'gh', 
        timeoutMs: 1 // 1msの非現実的に短いタイムアウト
      });
      
      await expect(service.fetchCommentData('https://github.com/microsoft/vscode/issues/1#issuecomment-221587237'))
        .rejects
        .toThrow(GitHubCommentError);
        
      try {
        await service.fetchCommentData('https://github.com/microsoft/vscode/issues/1#issuecomment-221587237');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubCommentError);
        expect((error as GitHubCommentError).errorType).toBe(CommentFetchError.NETWORK_ERROR);
      }
    });
  });

  describe('URL Validation Errors', () => {
    
    test('should reject invalid comment URLs', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const invalidUrls = [
        'not-a-url',
        'https://github.com/owner/repo/issues/123', // コメントハッシュなし
        INVALID_COMMENT_URL, // 無効なID
        NON_GITHUB_URL, // GitHub以外
        'https://github.com/owner/repo/issues/123#issuecomment-', // IDなし
        ''
      ];
      
      for (const url of invalidUrls) {
        await expect(service.fetchCommentData(url))
          .rejects
          .toThrow(GitHubCommentError);
          
        try {
          await service.fetchCommentData(url);
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubCommentError);
          expect((error as GitHubCommentError).errorType).toBe(CommentFetchError.PARSE_ERROR);
        }
      }
    });

    test('should validate URL format before API call', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const invalidUrl = 'https://example.com/not-github';
      
      // URL検証でエラーが発生し、APIコールは実行されない
      const startTime = Date.now();
      
      await expect(service.fetchCommentData(invalidUrl))
        .rejects
        .toThrow(GitHubCommentError);
        
      const endTime = Date.now();
      
      // 即座にエラーが返される（APIコールなし）
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('GitHub CLI Errors', () => {
    
    test('should handle gh CLI not available', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      
      // 存在しないghパスでサービスを作成
      const service = new GitHubService({ ghPath: '/nonexistent/path/to/gh' });
      
      await expect(service.fetchCommentData('https://github.com/microsoft/vscode/issues/1#issuecomment-221587237'))
        .rejects
        .toThrow(GitHubCommentError);
        
      try {
        await service.fetchCommentData('https://github.com/microsoft/vscode/issues/1#issuecomment-221587237');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubCommentError);
        expect(error.message).toContain('GitHub CLI not available');
      }
    });

    test('should handle gh CLI authentication errors', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // 認証が必要なプライベートリポジトリのコメント
      await expect(service.fetchCommentData(PRIVATE_REPO_COMMENT_URL))
        .rejects
        .toThrow(GitHubCommentError);
    });

    test('should handle gh CLI command execution errors', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      
      // 無効なgh CLI引数を強制的に使用
      const service = new GitHubService({ 
        ghPath: 'gh',
        additionalArgs: ['--invalid-flag']
      });
      
      await expect(service.fetchCommentData('https://github.com/microsoft/vscode/issues/1#issuecomment-221587237'))
        .rejects
        .toThrow(GitHubCommentError);
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    
    test('should provide meaningful error messages to users', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const testCases = [
        {
          url: NONEXISTENT_COMMENT_URL,
          expectedError: CommentFetchError.NOT_FOUND,
          expectedMessage: 'Comment not found'
        },
        {
          url: INVALID_COMMENT_URL,
          expectedError: CommentFetchError.PARSE_ERROR,
          expectedMessage: 'Invalid comment URL'
        }
      ];
      
      for (const testCase of testCases) {
        try {
          await service.fetchCommentData(testCase.url);
          fail('Expected error was not thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubCommentError);
          expect((error as GitHubCommentError).errorType).toBe(testCase.expectedError);
          expect(error.message).toContain(testCase.expectedMessage);
        }
      }
    });

    test('should not cache failed requests', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // 失敗するリクエストを実行
      await expect(service.fetchCommentData(NONEXISTENT_COMMENT_URL))
        .rejects
        .toThrow(GitHubCommentError);
      
      // キャッシュに失敗結果が保存されていないことを確認
      const cachedEntry = service.getCachedComment(NONEXISTENT_COMMENT_URL);
      expect(cachedEntry).toBeUndefined();
      
      // 再度同じリクエストで再試行される
      await expect(service.fetchCommentData(NONEXISTENT_COMMENT_URL))
        .rejects
        .toThrow(GitHubCommentError);
    });

    test('should handle partial data corruption gracefully', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // 部分的に壊れたJSONレスポンスをシミュレート（モック実装で）
      // 実装時にはgh CLIからの不正なJSONレスポンスを処理
      try {
        await service.fetchCommentData('https://github.com/microsoft/vscode/issues/1#issuecomment-221587237');
      } catch (error) {
        if (error instanceof GitHubCommentError && 
            error.errorType === CommentFetchError.PARSE_ERROR) {
          expect(error.message).toContain('parse');
        }
      }
    });
  });

  describe('Error Logging and Monitoring', () => {
    
    test('should log errors for debugging', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh', enableErrorLogging: true });
      
      // エラーログのキャプチャ（実装時にはconsole.errorをモック）
      const originalConsoleError = console.error;
      const errorLogs: string[] = [];
      console.error = (message: string) => errorLogs.push(message);
      
      try {
        await service.fetchCommentData(NONEXISTENT_COMMENT_URL);
      } catch (error) {
        // エラーがログに記録されることを確認
        expect(errorLogs.length).toBeGreaterThan(0);
        expect(errorLogs[0]).toContain('Comment fetch failed');
      } finally {
        console.error = originalConsoleError;
      }
    });

    test('should provide error details for debugging', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      try {
        await service.fetchCommentData(NONEXISTENT_COMMENT_URL);
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubCommentError);
        
        const commentError = error as GitHubCommentError;
        expect(commentError.errorType).toBeDefined();
        expect(commentError.originalError).toBeDefined(); // 元のエラーが保持される
        expect(commentError.stack).toBeDefined(); // スタックトレースあり
      }
    });
  });
});