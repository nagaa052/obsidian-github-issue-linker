# Implementation Plan: GitHubコメントリンクサポート

**Branch**: `001-issues-pr-https` | **Date**: 2025-09-05 | **Spec**: [/specs/001-issues-pr-https/spec.md](spec.md)
**Input**: Feature specification from `/specs/001-issues-pr-https/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✓ 機能仕様書を正常に読み込み
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✓ プロジェクトタイプ: Obsidianプラグイン (TypeScript)
   → ✓ Structure Decision: 既存構造を踏襲
3. Evaluate Constitution Check section below
   → ✓ シンプルな拡張として実装可能
   → ✓ 既存パターンに従う
4. Execute Phase 0 → research.md
   → ✓ 技術的不確定要素を全て解決
5. Execute Phase 1 → contracts, data-model.md, quickstart.md
   → ✓ API契約、データモデル、クイックスタート作成完了
6. Re-evaluate Constitution Check section
   → ✓ 新たな複雑性は導入されていない
7. Plan Phase 2 → タスク生成アプローチを記述
   → ✓ タスク生成戦略を定義
8. STOP - Ready for /tasks command
```

## Summary
GitHub Issue/PRコメントへの直接リンクを検出し、`gh api`コマンドを使用してコメント内容を取得・表示する機能を実装。既存のIssue/PRリンク処理機能を拡張し、コメントURLパターンに対応。

## Technical Context
**Language/Version**: TypeScript 4.7.4  
**Primary Dependencies**: Obsidian API, Node.js child_process  
**Storage**: メモリ内キャッシュ (Map)  
**Testing**: Jest (既存テストフレームワーク)  
**Target Platform**: Obsidian Desktop (macOS, Windows, Linux)  
**Project Type**: Obsidianプラグイン  
**Performance Goals**: コメント取得 < 2秒  
**Constraints**: GitHub API レート制限 (認証時: 5000/時)  
**Scale/Scope**: 単一プラグイン機能拡張

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**: ✓
- Projects: 1 (既存プラグインへの機能追加)
- Using framework directly? Yes (Obsidian APIを直接使用)
- Single data model? Yes (CommentDataインターフェース)
- Avoiding patterns? Yes (不要なパターンなし)

**Architecture**: ✓
- 既存のGitHubServiceクラスを拡張
- コメント取得メソッドを追加
- 既存のキャッシュメカニズムを活用

**Testing (NON-NEGOTIABLE)**: ✓
- RED-GREEN-Refactor cycle enforced
- 契約テストから開始
- 統合テストで実際のgh CLIを使用
- モックは最小限

**Observability**: ✓
- console.log/errorで構造化ログ
- Obsidian通知システムでユーザーフィードバック

**Versioning**: ✓
- Version: 1.2.0 (マイナーバージョンアップ)
- 後方互換性維持

## Project Structure

### Documentation (this feature)
```
specs/001-issues-pr-https/
├── spec.md              # 機能仕様書 (作成済)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (作成済)
├── data-model.md        # Phase 1 output (作成済)
├── quickstart.md        # Phase 1 output (作成済)
├── contracts/           # Phase 1 output (作成済)
│   └── github-comment-api.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── constants.ts         # 定数定義（URL正規表現追加）
├── GitHubService.ts     # サービスクラス（コメント機能追加）
├── main.ts             # メインプラグイン（変更なし）
├── settings.ts         # 設定（変更なし）
└── PathResolver.ts     # パス解決（変更なし）

tests/
├── GitHubService.test.ts  # 既存テスト拡張
└── fixtures/             # テストデータ
```

**Structure Decision**: 既存構造を維持、新機能は既存クラスへの拡張として実装

## Phase 0: Outline & Research
✓ **完了** - `research.md`に以下を文書化:
- GitHub CLI `gh api`コマンドでのコメント取得方法
- コメントURL形式の解析パターン
- キャッシュ戦略（既存メカニズム活用）
- 表示形式（インラインプレビュー）
- エラーハンドリング方針
- 認証（既存のgh認証を活用）

## Phase 1: Design & Contracts
✓ **完了** - 以下のアーティファクトを生成:

1. **data-model.md**: 
   - CommentDataインターフェース
   - CommentCacheEntry構造
   - CommentLinkInfo解析結果
   - バリデーションルール

2. **contracts/github-comment-api.yaml**:
   - GET /repos/{owner}/{repo}/issues/comments/{comment_id}
   - GET /repos/{owner}/{repo}/pulls/comments/{comment_id}
   - レスポンススキーマ定義

3. **quickstart.md**:
   - 基本的な使用方法
   - テストシナリオ
   - トラブルシューティング
   - 検証手順

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. 定数定義の更新（URL正規表現追加）
2. データ型定義の追加
3. GitHubServiceクラスへのメソッド追加:
   - isGitHubCommentUrl()
   - parseCommentUrl()
   - fetchCommentData()
4. キャッシュ拡張
5. エラーハンドリング追加
6. テスト作成:
   - 単体テスト（URL解析、キャッシュ）
   - 統合テスト（API呼び出し）
   - E2Eテスト（Obsidian環境）

**Ordering Strategy**:
1. 定数・型定義 [P]
2. テストファースト（失敗するテスト作成）
3. 実装（テストをグリーンに）
4. リファクタリング
5. ドキュメント更新

**Estimated Output**: 15-20 numbered, ordered tasks in tasks.md

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following TDD)  
**Phase 5**: Validation (run tests, execute quickstart.md)

## Complexity Tracking
*No violations - シンプルな機能拡張として実装*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (なし)

---
*Based on existing project patterns - See existing implementation for reference*