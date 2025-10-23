# Issue #15: ルーレットの重み設定と表示の不整合問題

## 問題の概要

**Issue URL**: https://github.com/keitao7gawa/web-roulette-app/issues/15

### 症状
1. **重み設定とルーレット表示の不整合**: スライダーで設定した重みの割合と，実際のルーレットのパイの割合が一致しない
2. **選択肢の並び順の問題**: 3つ程度の選択肢がある場合，スライダーで重みを変更しても重みの高い順に並ばない
3. **ルーレットの描画異常**: 複数の選択肢があるにも関わらず，SVG要素が正しく描画されない

### 現在の状態（再現済み）
- **選択肢**: 選択肢A, 選択肢B, 選択肢C
- **重み設定**: 53.9%, 32.4%, 13.7% (合計100%)
- **実際の表示**: ルーレットが正しく描画されていない（パス数: 1, テキスト数: 0）

## 技術的分析

### 1. データフローの問題

```
OptionsEditor → processForDisplay → Roulette → useRoulette → SVG描画
     ↓              ↓                ↓           ↓
  重み設定      選択肢分割・再配置    描画データ   実際の描画
```

**問題箇所**: `processForDisplay`関数での選択肢分割ロジックが，ルーレット描画に必要なデータ構造を破壊している

### 2. 根本原因の特定

#### A. `processForDisplay`関数の問題
**ファイル**: `app/lib/weights.ts`

```typescript
// 問題のある分割ロジック
const SPLIT_RATIO = 1.5;
const splitThreshold = baseWeight * SPLIT_RATIO;

validOptions.forEach((option, index) => {
  if (option.weight >= splitThreshold && option.weight >= 20) {
    splitIndices.push(index); // 分割対象を特定
  }
});
```

**問題点**:
- 重みが高い選択肢を2つに分割する処理が，ルーレットの描画ロジックと整合性を取れていない
- 分割後の選択肢のインデックス管理が複雑で，元の選択肢との対応関係が失われる
- 分割処理により，`validOptions`と`validWeights`の配列長が一致しなくなる

#### B. `useRoulette`フックの問題
**ファイル**: `app/hooks/useRoulette.ts`

```typescript
const validWeights = useMemo(() => {
  if (!weights) return validOptions.map(() => 1);
  return options
    .map((option, index) => ({ option, weight: weights[index] || 1 }))
    .filter(item => item.option && item.option.trim() !== '')
    .map(item => item.weight);
}, [validOptions, weights, options]);
```

**問題点**:
- `processForDisplay`で処理された`processedWeights`を受け取るが，元の`options`配列との対応関係が失われている
- 分割された選択肢の重み計算が正しく行われていない

#### C. SVG描画の問題
**ファイル**: `app/components/Roulette.tsx`

```typescript
{validOptions.map((option, index) => {
  const { path, textX, textY, textRotation, color} = calculateSegmentData(index);
  // ...
})}
```

**問題点**:
- `validOptions`と`segmentAngles`の配列長が一致しない
- 分割処理により，実際の選択肢数と描画すべきセグメント数が異なる

### 3. 具体的な不具合の流れ

1. **ユーザーが重みを設定** (53.9%, 32.4%, 13.7%)
2. **`processForDisplay`が実行される**
   - 重みが高い選択肢（53.9%）が分割対象として判定される
   - 分割処理により，選択肢と重みの配列が再構成される
3. **`useRoulette`で重み計算**
   - 分割された配列を正しく処理できず，`segmentAngles`の計算が失敗
4. **SVG描画で異常**
   - セグメント数と選択肢数が一致しない
   - 結果として，正しいルーレットが描画されない

## 影響範囲

### 機能への影響
- **ルーレット機能の完全な停止**: 複数選択肢でのルーレットが正常に動作しない
- **重み設定の無効化**: ユーザーが設定した重みが反映されない
- **ユーザー体験の大幅な悪化**: アプリの主要機能が使用できない状態

### コードへの影響
- `processForDisplay`関数: 分割ロジックの見直しが必要
- `useRoulette`フック: 重み計算ロジックの修正が必要
- `Roulette`コンポーネント: 描画ロジックの安定化が必要

## 緊急度

**🔴 最高優先度**: アプリの主要機能が完全に停止している状態のため，即座の修正が必要

## 関連ファイル

- `app/lib/weights.ts` - `processForDisplay`関数
- `app/hooks/useRoulette.ts` - 重み計算ロジック
- `app/components/Roulette.tsx` - SVG描画ロジック
- `app/components/OptionsEditor.tsx` - 重み設定UI

## テストケース

### 再現手順
1. アプリを起動
2. 3つの選択肢を追加（例: 選択肢A, 選択肢B, 選択肢C）
3. スライダーで重みを設定（例: 60%, 30%, 10%）
4. ルーレットの表示を確認

### 期待される動作
- 設定した重みの割合でルーレットのパイが描画される
- 重みの高い順に選択肢が並ぶ
- 各選択肢のテキストが正しく表示される

### 実際の動作
- ルーレットが正しく描画されない
- 選択肢のテキストが表示されない
- 重みの設定が反映されない