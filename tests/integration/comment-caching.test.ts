import { CommentData, CommentCacheEntry } from '../../src/types';

/**
 * コメントキャッシュの統合テスト
 * 
 * 注意: これらのテストは実装前に作成されるため、現在は失敗します。
 * これはTDDの「RED」フェーズです。
 */

describe('Comment Caching Integration Tests', () => {
  
  const TEST_COMMENT_URL = 'https://github.com/microsoft/vscode/issues/1#issuecomment-221587237';
  const TEST_COMMENT_URL_2 = 'https://github.com/facebook/react/pull/1#issuecomment-123456';

  describe('Cache Storage and Retrieval', () => {
    
    test('should cache comment data after first fetch', async () => {
      // この時点では GitHubService のキャッシュ機能は拡張されていないため失敗する
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // 最初の取得（キャッシュなし）
      const startTime1 = Date.now();
      const commentData1 = await service.fetchCommentData(TEST_COMMENT_URL);
      const endTime1 = Date.now();
      const firstFetchTime = endTime1 - startTime1;
      
      // 二回目の取得（キャッシュあり）
      const startTime2 = Date.now();
      const commentData2 = await service.fetchCommentData(TEST_COMMENT_URL);
      const endTime2 = Date.now();
      const secondFetchTime = endTime2 - startTime2;
      
      // 同じデータが返されることを確認
      expect(commentData1.id).toBe(commentData2.id);
      expect(commentData1.body).toBe(commentData2.body);
      
      // 二回目の方が高速であることを確認（キャッシュヒット）
      expect(secondFetchTime).toBeLessThan(firstFetchTime);
      expect(secondFetchTime).toBeLessThan(100); // キャッシュヒットは100ms以下
    });

    test('should store cache entry with correct metadata', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      await service.fetchCommentData(TEST_COMMENT_URL);
      
      // キャッシュエントリの取得（この機能は実装される必要がある）
      const cacheEntry: CommentCacheEntry | undefined = service.getCachedComment(TEST_COMMENT_URL);
      
      expect(cacheEntry).toBeDefined();
      expect(cacheEntry!.data).toBeDefined();
      expect(cacheEntry!.timestamp).toBeGreaterThan(0);
      expect(cacheEntry!.ttl).toBeGreaterThan(0);
      expect(cacheEntry!.formattedTitle).toBeDefined();
      expect(cacheEntry!.preview).toBeDefined();
    });

    test('should respect cache TTL settings', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      
      // 短いTTLでサービスを作成
      const shortTtlSettings = { ghPath: 'gh', cacheTtlMinutes: 0.001 }; // 約0.06秒
      const service = new GitHubService(shortTtlSettings);
      
      // 最初の取得
      await service.fetchCommentData(TEST_COMMENT_URL);
      
      // TTL期限まで待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // キャッシュが期限切れになっていることを確認
      const startTime = Date.now();
      await service.fetchCommentData(TEST_COMMENT_URL);
      const endTime = Date.now();
      
      // 再度APIを呼び出している（時間がかかる）ことを確認
      expect(endTime - startTime).toBeGreaterThan(50);
    });

    test('should handle cache size limits', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      
      // 小さなキャッシュサイズでサービスを作成
      const smallCacheSettings = { ghPath: 'gh', cacheSize: 2 };
      const service = new GitHubService(smallCacheSettings);
      
      const urls = [
        TEST_COMMENT_URL,
        TEST_COMMENT_URL_2,
        'https://github.com/microsoft/vscode/issues/2#issuecomment-333333'
      ];
      
      // キャッシュサイズを超えてデータを取得
      for (const url of urls) {
        try {
          await service.fetchCommentData(url);
        } catch (error) {
          // 存在しないURLでもキャッシュの動作をテストできる
        }
      }
      
      // 最初のエントリが削除されていることを確認
      const firstEntry = service.getCachedComment(urls[0]);
      expect(firstEntry).toBeUndefined();
      
      // 最新のエントリは存在することを確認
      const lastEntry = service.getCachedComment(urls[urls.length - 1]);
      expect(lastEntry).toBeDefined();
    });
  });

  describe('Cache Key Generation', () => {
    
    test('should generate consistent cache keys for same URLs', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      const url1 = TEST_COMMENT_URL;
      const url2 = TEST_COMMENT_URL; // 同じURL
      const url3 = TEST_COMMENT_URL.toUpperCase(); // 大文字小文字が異なる
      
      await service.fetchCommentData(url1);
      
      // 同じURLは同じキャッシュエントリを返す
      const cache1 = service.getCachedComment(url1);
      const cache2 = service.getCachedComment(url2);
      expect(cache1).toBe(cache2);
      
      // 大文字小文字の違いは区別される（URLは大文字小文字を区別）
      const cache3 = service.getCachedComment(url3);
      expect(cache3).toBeUndefined();
    });
  });

  describe('Cache Invalidation', () => {
    
    test('should allow manual cache clearing', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // データをキャッシュ
      await service.fetchCommentData(TEST_COMMENT_URL);
      const cachedEntry = service.getCachedComment(TEST_COMMENT_URL);
      expect(cachedEntry).toBeDefined();
      
      // キャッシュをクリア
      service.clearCache();
      
      // キャッシュが削除されていることを確認
      const clearedEntry = service.getCachedComment(TEST_COMMENT_URL);
      expect(clearedEntry).toBeUndefined();
    });

    test('should allow selective cache invalidation', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // 複数のURLをキャッシュ
      await service.fetchCommentData(TEST_COMMENT_URL);
      await service.fetchCommentData(TEST_COMMENT_URL_2);
      
      // 一つだけ削除
      service.removeCachedComment(TEST_COMMENT_URL);
      
      // 削除されたエントリは存在しない
      const removedEntry = service.getCachedComment(TEST_COMMENT_URL);
      expect(removedEntry).toBeUndefined();
      
      // 他のエントリは存在する
      const remainingEntry = service.getCachedComment(TEST_COMMENT_URL_2);
      expect(remainingEntry).toBeDefined();
    });
  });

  describe('Cache Performance', () => {
    
    test('should provide significant performance improvement', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // 最初の取得（APIコール）
      const start1 = Date.now();
      await service.fetchCommentData(TEST_COMMENT_URL);
      const end1 = Date.now();
      const apiCallTime = end1 - start1;
      
      // 二回目の取得（キャッシュヒット）
      const start2 = Date.now();
      await service.fetchCommentData(TEST_COMMENT_URL);
      const end2 = Date.now();
      const cacheHitTime = end2 - start2;
      
      // キャッシュヒットが大幅に高速であることを確認
      expect(cacheHitTime).toBeLessThan(apiCallTime * 0.1); // 10分の1以下の時間
      expect(cacheHitTime).toBeLessThan(50); // 50ms以下
    });

    test('should handle concurrent cache access correctly', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // 同じURLを並行して複数回取得
      const promises = Array(5).fill(0).map(() => 
        service.fetchCommentData(TEST_COMMENT_URL)
      );
      
      const results = await Promise.all(promises);
      
      // 全て同じデータが返されることを確認
      results.forEach(result => {
        expect(result.id).toBe(results[0].id);
        expect(result.body).toBe(results[0].body);
      });
      
      // キャッシュに一つだけエントリが存在することを確認
      const cacheEntry = service.getCachedComment(TEST_COMMENT_URL);
      expect(cacheEntry).toBeDefined();
    });
  });

  describe('Cache Statistics and Monitoring', () => {
    
    test('should track cache hit and miss statistics', async () => {
      const { GitHubService } = await import('../../src/GitHubService');
      const service = new GitHubService({ ghPath: 'gh' });
      
      // 統計リセット
      service.resetCacheStats();
      
      // キャッシュミス
      await service.fetchCommentData(TEST_COMMENT_URL);
      let stats = service.getCacheStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
      
      // キャッシュヒット
      await service.fetchCommentData(TEST_COMMENT_URL);
      stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });
});