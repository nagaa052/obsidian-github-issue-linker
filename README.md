# Obsidian GitHub Issue Linker

GitHub CLIを使用してGitHub IssueのURLを自動的にタイトル付きMarkdownリンクに変換するObsidianプラグインです。

## 機能

- **自動URL変換**: GitHub Issue URLをペーストするだけで、自動的にIssueタイトル付きのMarkdownリンクに変換
- **クロスプラットフォーム対応**: macOS、Windows、Linuxでの自動GitHub CLI検出
- **柔軟なパス解決**: 多段階フォールバック戦略による堅牢なGitHub CLI検出
- **インテリジェントキャッシュ**: パフォーマンス向上とAPI呼び出し削減のためのタイトルキャッシュ機能
- **堅牢なエラーハンドリング**: タイトル取得に失敗した場合の元URLへのグレースフルフォールバック
- **設定可能なオプション**: キャッシュ期間、サイズ、通知設定、GitHub CLIパスのカスタマイズ
- **ユーザーフレンドリーUI**: 自動検出、テスト機能、インストールガイダンス付き設定画面
- **ネイティブ統合**: Obsidianの組み込みペースト処理を使用したシームレスな体験

## 前提条件

このプラグインを使用する前に、以下を準備してください：

1. **GitHub CLI (`gh`) のインストール**
   - インストール: https://cli.github.com/
   - インストール確認: `gh --version`

2. **GitHub認証の設定**
   - 実行: `gh auth login`
   - プロンプトに従ってGitHubアカウントで認証

## インストール

### 手動インストール

1. [リリースページ](../../releases)から最新版をダウンロード
2. ファイルをObsidian vaultの `.obsidian/plugins/obsidian-github-issue-linker/` ディレクトリに展開
3. ObsidianのCommunity Plugins設定でプラグインを有効化

### 開発版インストール

1. vaultのプラグインディレクトリにリポジトリをクローン:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/nagaa052/obsidian-github-issue-linker.git
   ```

2. 依存関係をインストールしてビルド:
   ```bash
   cd obsidian-github-issue-linker
   npm install
   npm run build
   ```

3. Obsidianの設定でプラグインを有効化

## 使用方法

1. **基本的な使用方法**: GitHub IssueのURLをコピーしてObsidianノートにペースト
   
   **変換前**: `https://github.com/owner/repo/issues/123`
   
   **変換後**: `[認証フローの重大なバグを修正](https://github.com/owner/repo/issues/123)`

2. **処理フィードバック**: プラグインはタイトル取得中に通知を表示し、成功または失敗を示します

3. **自動フォールバック**: タイトル取得に失敗した場合（ネットワーク問題、プライベートリポジトリなど）、元のURLがフォールバックとして貼り付けられます

## 設定

**設定 → Community Plugins → GitHub Issue Linker** からプラグイン設定にアクセス:

### 利用可能な設定

- **プラグインを有効化**: プラグインのオン/オフ切り替え
- **GitHub CLIパス**: GitHub CLI実行ファイルのカスタムパス設定
  - **Auto-detect**: 自動検出ボタンでシステム内のGitHub CLIを検索
  - **Test**: 現在の設定パスの動作確認
  - **インストールガイド**: GitHub CLIインストール手順の表示
- **キャッシュTTL（分）**: Issueタイトルをキャッシュする期間（デフォルト: 60分）
- **キャッシュサイズ**: キャッシュするタイトルの最大数（デフォルト: 100）
- **通知を表示**: 処理と結果の通知を表示（デフォルト: 有効）
- **サポートするリソースタイプ**: 現在はIssuesのみサポート（Pull Requestサポートは将来予定）

## 技術詳細

### アーキテクチャ

プラグインはクリーンなサービス指向アーキテクチャに従っています：

- **メインプラグインクラス**: Obsidianライフサイクルとペーストイベントの処理
- **GitHubService**: GitHub CLI連携とキャッシュ管理
- **PathResolver**: クロスプラットフォームGitHub CLIパス解決とバリデーション
- **設定管理**: バリデーション付きの設定可能オプション
- **定数**: 一元化された設定とパターン

### URLパターン

プラグインは以下のパターンに一致するGitHub Issue URLを認識します：
```
https://github.com/[owner]/[repo]/issues/[number]
```

### キャッシュ戦略

- 設定可能なTTLとサイズ制限付きの**インメモリキャッシュ**
- キャッシュがサイズ制限に達した場合の**FIFO削除**
- TTL設定に基づく**自動期限切れ**

### エラーハンドリング

プラグインは様々なエラーシナリオを適切に処理します：

- **GitHub CLI利用不可**: ユーザー通知付きでプラグインを無効化
- **認証問題**: 解決手順付きの明確なエラーメッセージ
- **ネットワークタイムアウト**: フォールバック動作付きの設定可能タイムアウト
- **プライベートリポジトリ**: アクセス問題の適切なエラーハンドリング
- **レート制限**: GitHub APIレート制限の検出とユーザーフィードバック

## 開発

### ビルド

```bash
# ウォッチモード付き開発ビルド
npm run dev

# プロダクションビルド
npm run build
```

### プロジェクト構造

```
.
├── src/
│   ├── main.ts           # プラグインエントリーポイント
│   ├── GitHubService.ts  # GitHub CLIサービス層
│   ├── PathResolver.ts   # クロスプラットフォームパス解決
│   ├── settings.ts       # 設定管理
│   └── constants.ts      # 定数とパターン
├── main.ts               # esbuildエントリーポイント
├── manifest.json         # プラグインマニフェスト
├── package.json          # 依存関係とスクリプト
└── esbuild.config.mjs    # ビルド設定
```

### 主要な依存関係

- **obsidian**: Obsidian APIタイプとユーティリティ
- **esbuild**: 高速TypeScriptコンパイルとバンドル
- **TypeScript**: 型安全性とモダンJavaScript機能

## トラブルシューティング

### プラグインが読み込まれない

1. **GitHub CLIの確認**: ターミナルで `gh --version` が動作することを確認
2. **認証の確認**: `gh auth status` で認証状態を確認
3. **コンソールの確認**: Developer Toolsを開いてエラーメッセージを確認

### GitHub CLIが見つからない

プラグインがGitHub CLIを見つけられない場合：

1. **自動検出を使用**: 
   - 設定画面の「GitHub CLI Path」セクションで「Auto-detect」ボタンをクリック
   - システム内の一般的なインストール場所を自動検索

2. **手動パス設定**:
   - ターミナルで `which gh` (macOS/Linux) または `where gh` (Windows) を実行
   - 出力されたパスを設定画面の「GitHub CLI Path」フィールドに入力
   - 「Test」ボタンで動作確認

3. **インストールパスの確認**:
   - **macOS**: `/opt/homebrew/bin/gh` (Apple Silicon) または `/usr/local/bin/gh` (Intel)
   - **Windows**: `C:\Program Files\GitHub CLI\gh.exe`
   - **Linux**: `/usr/bin/gh` または `/usr/local/bin/gh`

4. **GitHub CLIの再インストール**:
   - 必要に応じて、設定画面の「ⓘ」ボタンからインストールガイドを確認

### URLが変換されない

1. **URLフォーマットの確認**: URLがGitHub Issueパターンに一致することを確認
2. **プラグインステータスの確認**: 設定でプラグインが有効化されていることを確認
3. **GitHub CLIのテスト**: ターミナルで `gh issue view [URL]` を手動実行してテスト

### 権限の問題

1. **プライベートリポジトリ**: リポジトリへのアクセス権限があることを確認
2. **認証**: 必要に応じて `gh auth login` を再実行
3. **トークンスコープ**: GitHubトークンが適切な権限を持っていることを確認

## 制限事項

- **デスクトップ版のみ**: このプラグインはNode.jsの `child_process` を必要とし、Obsidianのモバイル版とは互換性がありません
- **GitHub CLI依存**: `gh` CLIのインストールと認証が必要
- **Issuesのみ**: 現在はGitHub Issuesのみサポート（Pull Requestサポートは予定中）
- **ネットワーク必要**: Issueタイトルの取得が必要なため、オフラインでは動作しません

## 今後の拡張予定

- **Pull Requestサポート**: GitHub PR URLのリンク変換
- **カスタマイズ可能なリンクフォーマット**: ユーザー定義のリンク形式オプション
- **バッチ処理**: 単一ペーストでの複数URL処理
- **リポジトリショートカット**: リポジトリ相対のIssue参照サポート（例: `#123`）

## 貢献

1. リポジトリをフォーク
2. フィーチャーブランチを作成: `git checkout -b feature-name`
3. テストと共に変更を実装
4. プルリクエストを提出

## ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## サポート

- **Issues**: バグ報告は[GitHub Issues](../../issues)へ
- **Discussions**: 質問は[GitHub Discussions](../../discussions)で
- **Wiki**: 追加ドキュメントは[プロジェクトwiki](../../wiki)に