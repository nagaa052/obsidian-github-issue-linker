# QuickStart Guide - GitHub Comment Link Support

## 概要
この機能により、GitHub Issue/PRのコメントへの直接リンクをObsidianノートに貼り付けると、自動的にコメント内容を取得して表示します。

## 前提条件
1. GitHub CLI (`gh`) がインストール済み
2. `gh auth login` で認証済み
3. Obsidian GitHub Issue Linker プラグインが有効

## 基本的な使い方

### 1. コメントリンクのコピー
GitHubでコメントの時刻部分をクリックして、コメントへの直接リンクをコピー：
```
https://github.com/owner/repo/issues/123#issuecomment-456789
```

### 2. Obsidianに貼り付け
ノートにリンクを貼り付けると、自動的に以下の形式に変換されます：
```markdown
[#123 (comment by @username)](url) - "コメント内容のプレビュー..."
```

## 対応するURL形式

### Issueコメント
```
https://github.com/{owner}/{repo}/issues/{number}#issuecomment-{id}
```

### Pull Requestコメント
```
https://github.com/{owner}/{repo}/pull/{number}#issuecomment-{id}
```

### PRレビューコメント（ディスカッション）
```
https://github.com/{owner}/{repo}/pull/{number}#discussion_r{id}
```

## テストシナリオ

### シナリオ1: パブリックリポジトリのコメント取得
1. パブリックリポジトリのIssueコメントURLをコピー
2. Obsidianノートに貼り付け
3. 期待結果: コメント内容が自動的に表示される

### シナリオ2: プライベートリポジトリのコメント取得
1. アクセス権限のあるプライベートリポジトリのコメントURLをコピー
2. Obsidianノートに貼り付け
3. 期待結果: 認証済みであればコメント内容が表示される

### シナリオ3: 削除されたコメント
1. 削除されたコメントのURLを貼り付け
2. 期待結果: "コメントが見つかりません" エラーメッセージ

### シナリオ4: 複数コメントの同時処理
1. 複数のコメントURLを連続して貼り付け
2. 期待結果: 各コメントが独立して取得・表示される

## トラブルシューティング

### エラー: "GitHub CLI not available"
解決方法：
1. `gh` コマンドをインストール
2. プラグイン設定で `gh` のパスを確認

### エラー: "Requires authentication"
解決方法：
1. `gh auth login` を実行
2. GitHub アカウントで認証

### エラー: "API rate limit exceeded"
解決方法：
1. しばらく待つ（通常1時間）
2. 認証済みユーザーは制限が緩和される

## 設定オプション

### キャッシュ設定
- **TTL**: コメントデータのキャッシュ保持時間（デフォルト: 60分）
- **最大キャッシュサイズ**: 保持するコメント数（デフォルト: 100）

### 表示設定
- **プレビュー文字数**: コメントプレビューの最大文字数（デフォルト: 100）
- **日付フォーマット**: タイムスタンプの表示形式

## 検証手順

### 機能検証
1. 新しいObsidianノートを作成
2. テスト用コメントURL: `https://github.com/microsoft/vscode/issues/1#issuecomment-221587237`
3. URLを貼り付けて変換を確認
4. キャッシュが効いているか確認（同じURLを再度貼り付け）

### パフォーマンス検証
1. 10個のコメントURLを準備
2. 一度に貼り付け
3. 全て正常に変換されることを確認
4. 処理時間が許容範囲内であることを確認

## 既知の制限事項
- GitHub Enterprise Server はサポート対象外（将来対応予定）
- コメントの編集履歴は表示されない
- 添付画像はプレビューに含まれない
- リアルタイム更新はサポートしない（キャッシュ期間内は古いデータ）