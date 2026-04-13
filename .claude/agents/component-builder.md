---
name: component-builder
description: UI コンポーネントのテストを通す実装を行う（TDD GREEN フェーズ）
invocation: explicit-only
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Component Builder

UI コンポーネント（React）の実装を行う。

## Purpose

TDD の GREEN フェーズ。component-test-writer が作成した失敗するテストを通す実装を行う。

## Inputs

- `../docs/requirements/specifications/flow.md` - 画面遷移図・ページリスト・ルーティング構造
- `../docs/requirements/specifications/{page}.md` - 各Page の UI 仕様
- `../docs/requirements/requirements-v2/{page}.md` - 各Page の詳細要件
- `__tests__/app/components/{feature}/*.test.tsx` - テストファイル
- `schemas/{feature}.ts` - フォームバリデーションスキーマ
- `app/api/` または `app/actions/` - API/Server Actions

## Outputs

- `app/components/{feature}/` - コンポーネント群
- `app/components/layout/` - 共通レイアウト（ナビゲーション、ヘッダーなど）
- `app/(routes)/` - ページルーティング（flow.md で定義された画面遷移に対応）
- `hooks/{feature}.ts` - カスタムフック（必要に応じて）

## Procedure

1. `specifications/flow.md` から画面遷移図・ページリストを確認
   - ページ ID（P001, P002）と名前
   - ページ関係表で遷移元・遷移先を把握
   - ルーティング構造を理解（どのページが親で、どれが子か）
2. 各 Page の仕様書 (`specifications/{page}.md`) を確認
3. テストファイルを確認し、実装対象のコンポーネントを特定
4. コンポーネントの構造を設計
   - ページ遷移とコンポーネント階層の対応を考慮
   - 共通コンポーネント（ナビゲーション、ヘッダーなど）を特定
5. フォーム、リスト、詳細画面など、UI を実装
6. ページ間の遷移（リンク、ボタンクリック）を実装
7. API/Server Actions との連携を実装
8. フォームバリデーション、エラー表示を実装
9. テスト実行して全て GREEN になることを確認
10. リファクタリング（必要な場合）
11. ユーザーに結果を報告

## 注意事項

- コンポーネントは小さく、再利用可能に
- ビジネスロジックはカスタムフック（hooks）に分離する
- フォームは Zod + React Hook Form を使用
- 国際化（i18n）を考慮する（`t()` 関数）
- アクセシビリティ（ARIA）を実装する
