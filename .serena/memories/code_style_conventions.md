# コードスタイルと規約

## TypeScript設定
- **ターゲット**: ES2017
- **モジュール解決**: bundler
- **JSX**: preserve
- **厳密モード**: 有効
- **パスエイリアス**: `@/*` → `./*`

## 命名規約
- **ファイル名**: kebab-case（例：`options-editor.tsx`）
- **コンポーネント**: PascalCase（例：`OptionsEditor`）
- **変数・関数**: camelCase（例：`useRoulette`）
- **定数**: UPPER_SNAKE_CASE（例：`DEFAULT_WEIGHT`）

## コンポーネント構造
```typescript
// 1. インポート
import React from 'react';

// 2. 型定義
interface Props {
  // ...
}

// 3. コンポーネント定義
export default function ComponentName({ prop }: Props) {
  // 4. フック
  // 5. イベントハンドラー
  // 6. レンダリング
  return <div>...</div>;
}
```

## スタイリング規約
- **Tailwind CSS**: ユーティリティクラスを使用
- **カスタムカラー**: `tailwind.config.js`で定義済み
  - `primary`: #3A86FF
  - `secondary`: #00F5D4
  - `accent`: #FF006E
  - `dark`: #2D3748
  - `light`: #F7FAFC

## 型定義
- **インターフェース**: `interface`を使用（`type`より優先）
- **オプショナル**: `?`を使用
- **配列**: `Type[]`形式

## エラーハンドリング
- **ESLintルール**: 
  - `no-unused-vars`: 警告（`_`プレフィックスで無視可能）
  - `no-console`: 警告（`warn`, `error`は許可）

## テスト規約
- **テストファイル**: `*.test.ts`形式
- **テスト環境**: Node.js
- **カバレッジ**: v8プロバイダー使用