# Data Model

## 1. CommentData

GitHub コメント情報を表すデータ構造

```typescript
interface CommentData {
  // 基本識別情報
  id: number;                    // コメントID (例: 3243595867)
  url: string;                   // 完全URL
  html_url: string;              // ブラウザで表示可能なURL
  
  // コメント内容
  body: string;                  // マークダウン形式のコメント本文
  body_text?: string;            // プレーンテキスト版（オプション）
  
  // メタデータ
  created_at: string;            // 作成日時 (ISO 8601形式)
  updated_at: string;            // 更新日時 (ISO 8601形式)
  
  // 作成者情報
  user: {
    login: string;              // GitHubユーザー名
    avatar_url: string;         // アバターURL
    html_url: string;           // ユーザープロフィールURL
  };
  
  // 関連情報
  issue_url: string;             // 親Issue/PRのAPI URL
  issue_number: number;          // Issue/PR番号
}
```

## 2. CommentCacheEntry

キャッシュ管理用の拡張データ構造

```typescript
interface CommentCacheEntry {
  // コメントデータ
  data: CommentData;
  
  // キャッシュメタデータ
  timestamp: number;              // キャッシュ時刻（Unix timestamp）
  ttl: number;                    // TTL設定値（ミリ秒）
  
  // 表示用プロパティ
  formattedTitle: string;         // フォーマット済みタイトル
  preview: string;                // プレビューテキスト（最初の100文字）
}
```

## 3. CommentLinkInfo

URL解析結果を表すデータ構造

```typescript
interface CommentLinkInfo {
  // リポジトリ情報
  owner: string;                  // リポジトリ所有者
  repo: string;                   // リポジトリ名
  
  // Issue/PR情報
  issueNumber: number;            // Issue/PR番号
  isPullRequest: boolean;        // PRフラグ
  
  // コメント情報
  commentId: number;              // コメントID
  commentType: 'issue' | 'discussion'; // コメント種別
  
  // 元URL
  originalUrl: string;            // パースした元のURL
}
```

## 4. 定数とEnum

```typescript
// コメントタイプ
enum CommentType {
  ISSUE = 'issue',              // Issue/PRコメント
  DISCUSSION = 'discussion'      // PRディスカッションコメント
}

// エラータイプ
enum CommentFetchError {
  NOT_FOUND = 'NOT_FOUND',      // コメントが見つからない
  UNAUTHORIZED = 'UNAUTHORIZED', // 認証エラー
  RATE_LIMITED = 'RATE_LIMITED', // APIレート制限
  NETWORK_ERROR = 'NETWORK_ERROR', // ネットワークエラー
  PARSE_ERROR = 'PARSE_ERROR'    // パースエラー
}
```

## 5. バリデーションルール

### URL形式
- 必須: `https://github.com/` で始まる
- Issue形式: `/{owner}/{repo}/issues/{number}#issuecomment-{id}`
- PR形式: `/{owner}/{repo}/pull/{number}#issuecomment-{id}`
- PRディスカッション: `/{owner}/{repo}/pull/{number}#discussion_r{id}`

### コメントID
- 数値型
- 1以上の整数
- 最大値: 2^53 - 1 (JavaScript の安全な整数範囲)

### キャッシュTTL
- デフォルト: 3600000 (60分)
- 最小値: 60000 (1分)
- 最大値: 86400000 (24時間)

## 6. 状態遷移

### コメント取得フロー
1. **初期状態**: URL検出
2. **解析中**: URL形式チェック、パース
3. **キャッシュ確認**: 有効なキャッシュの存在チェック
4. **API呼び出し**: キャッシュミス時のAPI実行
5. **データ処理**: レスポンス解析、フォーマット
6. **完了/エラー**: 結果の表示またはエラー処理

### キャッシュ状態
- **未キャッシュ**: データなし
- **有効**: TTL内のデータ存在
- **期限切れ**: TTL超過、再取得必要
- **エラーキャッシュ**: エラー情報を短期間保持