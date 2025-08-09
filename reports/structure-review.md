# 構成レビュー: 現在のファイル構成の問題点と改善提案

対象: Next.js 15 App Router プロジェクト (`/app` 直下で完結する小規模アプリ)

---

## 概要
現状は小規模でシンプルですが、スケール時に保守性・可読性・再利用性で課題が発生しそうな構成です。特に `app/page.tsx` に状態管理・UI・ロジックが集中しており関心分離が不十分です。また、`public` アセットの参照不整合や設定ファイルの未活用も見られます。

---

## 主要な問題点

1. コンポーネント/ロジックの集中と肥大化
   - `app/page.tsx` に以下が同居：
     - 入力フォームの状態・重みの再分配・シャッフル等のビジネスロジック
     - ルーレット描画用の前処理（重い `getProcessedOptionsForRouletteDisplay`）
     - UI レンダリング
   - ルーレット可視化(`Roulette`)は描画責務に絞られているが、`page.tsx` 側が肥大化しやすい。

2. 計算の毎回実行とメモ化欠如
   - `getProcessedOptionsForRouletteDisplay()` を JSX 内で3回直接呼び出し、同一計算を重複実行。
   - 重い配列操作（分割・最適位置探索）があるため、`useMemo` 化が望ましい。

3. ディレクトリ構成の拡張性不足
   - `app/components`, `app/hooks`, `app/constants` は良い出発点だが、機能単位のまとまり(roulette)が横断。
   - 将来的な拡張（結果履歴、プリセット保存、共有など）に対し、機能モジュールの分割が未整備。

4. アセット参照の不整合
   - `app/manifest.json` で参照される `favicon-96x96.png`, `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png` が `public/` に存在しない。
   - `app/page.tsx` のフッターで `/x-icon.png` を参照するが `public/x-icon.png` が存在しない。
   - README の `public/screenshot.png` も存在しない。

5. Tailwind v4 とグローバル CSS の責務混在
   - `app/globals.css` に Tailwind のディレクティブとテーマ変数、UI コンポーネント固有スタイル（range スライダー）が同居。
   - コンポーネント固有のスタイルは出来る限りユーティリティ/クラス化してローカライズすべき。

6. ESLint/Next 設定のデフォルト放置
   - `next.config.ts` が空（PWA/画像最適化/ヘッダー/実験フラグ未設定）。
   - `eslint.config.mjs` は最低限。ルール/ignore/ts型整合の管理が弱い。

7. 型の散在と明確なドメイン型の欠如
   - `Option` 型が `page.tsx` 内部定義。ロジック共有・テスト容易性の面で `types/` へ切り出しが妥当。

8. クライアント境界の最適化余地
   - `app/page.tsx` とレンダリングの大半が `use client` 下にある。サーバーコンポーネントを活用し、クライアント部分を必要最小限に分割可能。

9. テストと検証の不在
   - 単体テスト/スナップショット/型テストなし。重み再分配のビジネスロジックは回帰が起きやすい。

---

## 改善提案（構成の方向性）

1. 機能モジュールの分割（機能別フォルダ）
   - `app/(roulette)/` 配下に機能を集約:
     - `app/(roulette)/components/Roulette.tsx`
     - `app/(roulette)/components/Confetti.tsx`
     - `app/(roulette)/hooks/useRoulette.ts`
     - `app/(roulette)/lib/weights.ts`（重み再分配・正規化・分割ロジック）
     - `app/(roulette)/types/index.ts`（`Option` 他）
     - `app/(roulette)/constants/colors.ts`
   - `app/page.tsx` はプレゼンテーション/配線に限定。

2. 高コスト計算のメモ化と一回評価
   - `const processed = useMemo(() => getProcessedOptionsForRouletteDisplay(options), [options]);`
   - 子へは `processed.processedOptions` などを渡す。

3. アセット整備/自動生成
   - `public/` に不足ファイルを追加（`favicon-96x96.png`, `web-app-manifest-*.png`, `x-icon.png`, `screenshot.png`）。
   - もしくは `next-pwa` 等の導入時に自動生成タスクを追加。

4. CSS 責務の整理
   - スライダー用の見た目はユーティリティクラス化し、`globals.css` から汎用のみ残す。
   - Tailwind v4 のデザイントークンは `@theme` を活用しつつ、コンポーネントでユーティリティ中心に。

5. 設定の拡充
   - `next.config.ts`：`images`, `headers`, `experimental`、`crossOrigin`, `reactStrictMode` 等を明示。
   - ESLint：`@typescript-eslint`/import ルール導入、バウンダリルール（循環禁止）など。

6. 型・ユーティリティの共通化
   - `app/types/option.ts` へ `Option` を移動。
   - `app/lib/weights.ts` に `redistributeWeights`, `normalizeWeights`, `equalizeWeights`, `shuffleOptions`, `processForDisplay` を分離しテスト可能に。

7. クライアント分割
   - サーバーコンポーネントの `page` から、`OptionsEditor`（client）、`RouletteCanvas`（client）を分離。
   - データ永続化（LocalStorage）は小さな client component に限定。

8. テスト導入
   - `vitest`/`jest` で `weights` ロジックのユニットテスト追加。

9. パスエイリアスの活用
   - 既に `@/*` があるため、相対パスを整理（`../hooks` -> `@/app/(roulette)/hooks` など）。

---

## 小規模リファクタの例（すぐ効く項目）

- `getProcessedOptionsForRouletteDisplay()` の一回評価と依存配列の導入。
- `public/` の不足アセットを追加 or 参照を既存ファイルに変更。
- `Option` 型の切り出し。
- `next.config.ts` へ基本設定（`reactStrictMode: true` 等）。

---

## 中長期的な構成（将来機能に備える）

```
app/
  (roulette)/
    components/
      Roulette.tsx
      Confetti.tsx
      OptionsEditor.tsx
    hooks/
      useRoulette.ts
    lib/
      weights.ts
    types/
      option.ts
    constants/
      colors.ts
  page.tsx
public/
  favicon-96x96.png
  web-app-manifest-192x192.png
  web-app-manifest-512x512.png
  x-icon.png
```

---

## 影響と期待効果
- 関心分離によりコードの見通しと変更容易性が向上。
- 計算のメモ化で不要な再計算が減り、パフォーマンス改善。
- アセット参照不整合の解消で PWA/SEO 品質向上。
- 型・ユーティリティ分離によりテスト容易性と再利用性向上。
