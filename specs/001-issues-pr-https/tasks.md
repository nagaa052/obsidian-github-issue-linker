# タスク: GitHubコメントリンクサポート

**入力**: `/specs/001-issues-pr-https/`の設計ドキュメント
**前提条件**: plan.md、research.md、data-model.md、contracts/

## 実行フロー (main)
```
1. feature directoryからplan.mdを読み込み
   → ✓ TypeScript Obsidianプラグイン、既存GitHubService拡張
2. オプション設計ドキュメントを読み込み:
   → data-model.md: CommentData、CommentCacheEntry、CommentLinkInfo → 型定義タスク
   → contracts/: GitHub APIエンドポイント → 契約テストタスク
   → research.md: gh api決定 → セットアップタスク
3. カテゴリー別にタスク生成:
   → Setup: 型定義、定数追加
   → Tests: 契約テスト、統合テスト
   → Core: URL解析、API呼び出し、キャッシュ
   → Integration: 既存GitHubService統合
   → Polish: 単体テスト、パフォーマンス、ドキュメント
4. タスクルールを適用:
   → 異なるファイル = [P]マーク（並列実行可能）
   → 同じファイル = 順次実行（[P]なし）
   → テストファースト（TDD）
5. タスクに連番付与（T001、T002...）
```

## フォーマット: `[ID] [P?] 説明`
- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- 説明には正確なファイルパスを含む

## フェーズ 3.1: セットアップ
- [ ] T001 [P] src/constants.tsにコメントURL正規表現パターンを追加
- [ ] T002 [P] src/types.ts（新規ファイル）にCommentDataインターフェースを追加
- [ ] T003 [P] src/types.tsにCommentCacheEntryインターフェースを追加
- [ ] T004 [P] src/types.tsにCommentLinkInfoインターフェースを追加
- [ ] T005 [P] src/types.tsにCommentTypeとCommentFetchErrorのenumを追加

## フェーズ 3.2: テストファースト（TDD）⚠️ 必ず3.3の前に完了
**重要: これらのテストは実装前に書かれ、必ず失敗する必要があります**
- [ ] T006 [P] tests/contract/github-comment-api.test.tsにGitHub issueコメントAPIの契約テストを作成
- [ ] T007 [P] tests/contract/github-comment-api.test.tsにGitHub PRコメントAPIの契約テストを作成
- [ ] T008 [P] tests/integration/comment-detection.test.tsにコメントURL検出の統合テストを作成
- [ ] T009 [P] tests/integration/comment-retrieval.test.tsにコメントデータ取得の統合テストを作成
- [ ] T010 [P] tests/integration/comment-caching.test.tsにコメントキャッシュの統合テストを作成
- [ ] T011 [P] tests/integration/comment-errors.test.tsにエラーハンドリングの統合テストを作成

## フェーズ 3.3: コア実装（テストが失敗してからのみ実行）
- [ ] T012 src/GitHubService.tsにisGitHubCommentUrlメソッドを追加
- [ ] T013 src/GitHubService.tsにparseCommentUrlメソッドを追加
- [ ] T014 src/GitHubService.tsにfetchCommentDataメソッドを追加
- [ ] T015 src/GitHubService.tsにformatCommentPreviewメソッドを追加
- [ ] T016 src/GitHubService.tsのキャッシュシステムをコメントデータ用に拡張
- [ ] T017 src/main.tsのメインペーストハンドラーにコメントURL処理を追加
- [ ] T018 src/GitHubService.tsにコメント操作のエラーハンドリングを追加

## フェーズ 3.4: 統合
- [ ] T019 src/constants.tsでコメントURLパターンの正規表現定数を更新
- [ ] T020 src/GitHubService.tsのisGitHubResourceUrlをコメントURL含むように拡張
- [ ] T021 src/constants.tsにコメント操作用の通知メッセージを追加
- [ ] T022 src/main.tsの既存URL検出フローにコメント処理を統合

## フェーズ 3.5: 仕上げ
- [ ] T023 [P] tests/unit/comment-parsing.test.tsにコメントURL解析の単体テストを作成
- [ ] T024 [P] tests/unit/comment-formatting.test.tsにコメントフォーマット機能の単体テストを作成
- [ ] T025 [P] tests/unit/comment-cache.test.tsにコメントキャッシュロジックの単体テストを作成
- [ ] T026 tests/performance/comment-performance.test.tsにコメント取得のパフォーマンステスト（2秒以内）を作成
- [ ] T027 [P] README.mdにコメントリンクサポートのドキュメントを更新
- [ ] T028 quickstart.mdの検証シナリオを実行
- [ ] T029 コメント機能のコードクリーンアップとリファクタリング

## 依存関係
- テスト（T006-T011）は実装（T012-T018）の前に完了
- T001はT012、T013をブロック（正規表現定数が必要）
- T002-T005はT014、T015、T016をブロック（型定義が必要）
- T012-T016はT017、T022の前に完了（コアメソッドが統合前に必要）
- 実装（T012-T022）は仕上げ（T023-T029）の前に完了

## 並列実行例
```
# フェーズ 3.1 - T001-T005を一緒に実行:
Task: "src/constants.tsにコメントURL正規表現パターンを追加"
Task: "src/types.tsにCommentDataインターフェースを追加"
Task: "src/types.tsにCommentCacheEntryインターフェースを追加"
Task: "src/types.tsにCommentLinkInfoインターフェースを追加"
Task: "src/types.tsにCommentTypeとCommentFetchErrorのenumを追加"

# フェーズ 3.2 - T006-T011を一緒に実行:
Task: "tests/contract/github-comment-api.test.tsにGitHub issueコメントAPIの契約テストを作成"
Task: "tests/integration/comment-detection.test.tsにコメントURL検出の統合テストを作成"
Task: "tests/integration/comment-retrieval.test.tsにコメントデータ取得の統合テストを作成"
Task: "tests/integration/comment-caching.test.tsにコメントキャッシュの統合テストを作成"
Task: "tests/integration/comment-errors.test.tsにエラーハンドリングの統合テストを作成"

# フェーズ 3.5 - T023-T025、T027を一緒に実行:
Task: "tests/unit/comment-parsing.test.tsにコメントURL解析の単体テストを作成"
Task: "tests/unit/comment-formatting.test.tsにコメントフォーマット機能の単体テストを作成"
Task: "tests/unit/comment-cache.test.tsにコメントキャッシュロジックの単体テストを作成"
Task: "README.mdにコメントリンクサポートのドキュメントを更新"
```

## 注意事項
- [P]タスク = 異なるファイル、依存関係なし
- 実装前にテストが失敗することを確認
- 一貫性のため既存GitHubServiceパターンを使用
- 既存Issue/PR機能との後方互換性を維持
- 既存エラーハンドリングと通知パターンに従う

## タスク生成ルール
*main()実行中に適用*

1. **契約書から**:
   - 各APIエンドポイント → 契約テストタスク [P]
   - GitHub コメントAPI → fetchCommentData実装
   
2. **データモデルから**:
   - 各インターフェース → 型定義タスク [P]
   - CommentData → APIレスポンス処理
   - CommentCacheEntry → キャッシュ拡張
   - CommentLinkInfo → URL解析
   
3. **リサーチ決定から**:
   - gh api使用 → API統合タスク
   - インラインプレビュー → フォーマットタスク
   - 既存キャッシュ → キャッシュ拡張タスク

4. **順序付け**:
   - 型 → テスト → コアメソッド → 統合 → 仕上げ
   - テストは実装開始前に失敗させる必要あり

## 検証チェックリスト
*main()が戻る前にチェック*

- [x] すべての契約に対応するテストがある
- [x] すべてのエンティティに型定義タスクがある
- [x] すべてのテストが実装より先にある
- [x] 並列タスクが本当に独立している
- [x] 各タスクが正確なファイルパスを指定
- [x] 同じファイルを変更する[P]タスクがない
- [x] TDDワークフローが強制されている（失敗テスト必須）
- [x] 既存コードベースとの統合が計画されている