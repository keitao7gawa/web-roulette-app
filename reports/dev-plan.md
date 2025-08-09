# 開発計画（Web Roulette App）

対象レポート: `reports/structure-review.md`

## 目的
- 保守性・パフォーマンス・拡張性の向上（UI/UXは維持または改善）
- 小さなPR単位で安全に段階的に改善

## 原則
- 関心分離（ロジック/表示）
- メモ化と再計算削減
- 型・ユーティリティの共通化
- 設定・アセットの整合性
- CI（lint/typecheck/build/test）を常にグリーン

## フェーズ概要とPR粒度
- PR1: メモ化 + 型切り出し + アイコン暫定修正（クイックウィン）
- PR2: 重みロジック抽出（`app/lib/weights.ts`）
- PR3: マニフェスト/README のアセット整合
- PR4: Next/ESLint 設定の軽微拡充
- PR5: CSS責務整理（range スライダーのユーティリティ化）
- PR6: Client/Server 境界の最適化
- PR7: weights ロジックのユニットテスト導入

## 完了基準（全体）
- `npm run lint && npm run typecheck && npm run build` 成功（テスト導入後は `npm test` も）
- PWA/Lighthouse のアイコン・マニフェスト関連エラーなし
- 初期JSペイロードと再描画の削減（PR6）
- `app/page.tsx` の責務圧縮（ロジックは lib/hook に移動）

## 参照可能なタスク（各PRごとの実行プロンプト）
- [PR1: メモ化 + 型切り出し + アイコン暫定修正](./task-PR1-memo-and-types.md)
- [PR2: 重みロジック抽出（lib化）](./task-PR2-weights-lib.md)
- [PR3: マニフェスト/README のアセット整合](./task-PR3-manifest-assets.md)
- [PR4: Next/ESLint 設定の軽微拡充](./task-PR4-configs.md)
- [PR5: CSS責務整理](./task-PR5-css-slim.md)
- [PR6: Client/Server 境界の最適化](./task-PR6-client-boundary.md)
- [PR7: weights ロジックのテスト追加](./task-PR7-weights-tests.md)

## 進行管理チェックリスト
- [ ] PR1 完了・マージ
- [ ] PR2 完了・マージ
- [ ] PR3 完了・マージ
- [ ] PR4 完了・マージ
- [ ] PR5 完了・マージ
- [ ] PR6 完了・マージ
- [ ] PR7 完了・マージ
