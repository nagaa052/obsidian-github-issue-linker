// GitHub Comment related type definitions

/**
 * GitHub コメント情報を表すデータ構造
 */
export interface CommentData {
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
  issue_number?: number;         // Issue/PR番号（計算プロパティ）
}

/**
 * キャッシュ管理用の拡張データ構造
 */
export interface CommentCacheEntry {
  // コメントデータ
  data: CommentData;
  
  // キャッシュメタデータ
  timestamp: number;              // キャッシュ時刻（Unix timestamp）
  ttl: number;                    // TTL設定値（ミリ秒）
  
  // 表示用プロパティ
  formattedTitle: string;         // フォーマット済みタイトル
  preview: string;                // プレビューテキスト（最初の100文字）
}

/**
 * URL解析結果を表すデータ構造
 */
export interface CommentLinkInfo {
  // リポジトリ情報
  owner: string;                  // リポジトリ所有者
  repo: string;                   // リポジトリ名
  
  // Issue/PR情報
  issueNumber: number;            // Issue/PR番号
  isPullRequest: boolean;        // PRフラグ
  
  // コメント情報
  commentId: number;              // コメントID
  commentType: CommentType;       // コメント種別
  
  // 元URL
  originalUrl: string;            // パースした元のURL
}

/**
 * コメントタイプ
 */
export enum CommentType {
  ISSUE = 'issue',              // Issue/PRコメント
  DISCUSSION = 'discussion'      // PRディスカッションコメント
}

/**
 * エラータイプ
 */
export enum CommentFetchError {
  NOT_FOUND = 'NOT_FOUND',      // コメントが見つからない
  UNAUTHORIZED = 'UNAUTHORIZED', // 認証エラー
  RATE_LIMITED = 'RATE_LIMITED', // APIレート制限
  NETWORK_ERROR = 'NETWORK_ERROR', // ネットワークエラー
  PARSE_ERROR = 'PARSE_ERROR'    // パースエラー
}

/**
 * コメント取得エラークラス
 */
export class GitHubCommentError extends Error {
  constructor(
    message: string,
    public readonly errorType: CommentFetchError,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GitHubCommentError';
  }
}