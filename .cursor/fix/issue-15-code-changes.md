# Issue #15: 具体的なコード変更内容

## 変更ファイル一覧

1. `app/lib/weights.ts` - `processForDisplay`関数の修正
2. `app/hooks/useRoulette.ts` - 重み計算ロジックの修正
3. `app/components/Roulette.tsx` - デバッグログの追加（オプション）

## 詳細なコード変更

### 1. `app/lib/weights.ts` の修正

#### 修正前（問題のあるコード）
```typescript
export function processForDisplay(optionsList: Option[], colorResolver: (_index: number) => string, noOptionsText: string = "オプションを入力してください"): ProcessedDisplay {
  const validOptions = optionsList.filter(opt => opt.text.trim() !== "");
  
  if (validOptions.length === 0) {
    return {
      processedOptions: [noOptionsText],
      processedWeights: [100],
      processedColors: [colorResolver(0)],
      processedSourceIndices: [0]
    };
  }

  const processedOptions: string[] = [];
  const processedWeights: number[] = [];
  const optionIndices: number[] = [];

  const splitIndices: number[] = [];

  const totalWeight = validOptions.reduce((sum, opt) => sum + opt.weight, 0);
  const averageWeight = totalWeight / validOptions.length;

  // 中央値の計算
  const sortedWeights = [...validOptions].map(opt => opt.weight).sort((a, b) => a - b);
  const medianWeight = sortedWeights.length % 2 === 0
    ? (sortedWeights[sortedWeights.length / 2 - 1] + sortedWeights[sortedWeights.length / 2]) / 2
    : sortedWeights[Math.floor(sortedWeights.length / 2)];

  const baseWeight = Math.min(averageWeight, medianWeight);
  const SPLIT_RATIO = 1.5;
  const splitThreshold = baseWeight * SPLIT_RATIO;

  // 分割対象の特定
  validOptions.forEach((option, index) => {
    if (option.weight >= splitThreshold && option.weight >= 20) {
      splitIndices.push(index);
    }
  });

  // 分割処理
  validOptions.forEach((option, index) => {
    if (splitIndices.includes(index)) {
      const halfWeight = Math.floor((option.weight / 2) * 10) / 10;
      const remainder = option.weight - halfWeight * 2;

      processedOptions.push(option.text);
      processedWeights.push(halfWeight + remainder);
      optionIndices.push(index);
    } else {
      processedOptions.push(option.text);
      processedWeights.push(option.weight);
      optionIndices.push(index);
    }
  });

  // 分割された選択肢の2番目の部分を追加
  splitIndices.forEach(originalIndex => {
    const option = validOptions[originalIndex];
    const halfWeight = Math.floor((option.weight / 2) * 10) / 10;
    
    processedOptions.push(option.text);
    processedWeights.push(halfWeight);
    optionIndices.push(originalIndex);
  });

  const processedColors = optionIndices.map(index => colorResolver(index));

  return {
    processedOptions,
    processedWeights,
    processedColors,
    processedSourceIndices: optionIndices
  };
}
```

#### 修正後（シンプルなコード）
```typescript
export function processForDisplay(optionsList: Option[], colorResolver: (_index: number) => string, noOptionsText: string = "オプションを入力してください"): ProcessedDisplay {
  const validOptions = optionsList.filter(opt => opt.text.trim() !== "");
  
  if (validOptions.length === 0) {
    return {
      processedOptions: [noOptionsText],
      processedWeights: [100],
      processedColors: [colorResolver(0)],
      processedSourceIndices: [0]
    };
  }

  // シンプルな処理：分割ロジックを削除
  const processedOptions = validOptions.map(opt => opt.text);
  const processedWeights = validOptions.map(opt => opt.weight);
  const processedColors = validOptions.map((_, index) => colorResolver(index));
  const processedSourceIndices = validOptions.map((_, index) => index);

  return {
    processedOptions,
    processedWeights,
    processedColors,
    processedSourceIndices
  };
}
```

### 2. `app/hooks/useRoulette.ts` の修正

#### 修正前（問題のあるコード）
```typescript
const validWeights = useMemo(() => {
  if (!weights) return validOptions.map(() => 1);
  return options
    .map((option, index) => ({ option, weight: weights[index] || 1 }))
    .filter(item => item.option && item.option.trim() !== '')
    .map(item => item.weight);
}, [validOptions, weights, options]);
```

#### 修正後（安定したコード）
```typescript
const validWeights = useMemo(() => {
  if (!weights || weights.length === 0) {
    return validOptions.map(() => 1);
  }
  
  // シンプルな重み計算：optionsとweightsの配列長を一致させる
  const result: number[] = [];
  
  for (let i = 0; i < validOptions.length; i++) {
    if (i < weights.length) {
      result.push(weights[i]);
    } else {
      result.push(1); // デフォルト値
    }
  }
  
  return result;
}, [validOptions, weights]);
```

#### 追加するエラーハンドリング
```typescript
const segmentAngles = useMemo(() => {
  if (totalWeight === 0) {
    console.warn('Total weight is 0, using equal distribution');
    return validOptions.map(() => 360 / validOptions.length);
  }
  
  if (validWeights.length !== validOptions.length) {
    console.error('Mismatch between options and weights length:', {
      optionsLength: validOptions.length,
      weightsLength: validWeights.length
    });
    return validOptions.map(() => 360 / validOptions.length);
  }
  
  return validWeights.map(weight => (weight / totalWeight) * 360);
}, [validWeights, totalWeight, validOptions]);
```

### 3. `app/components/Roulette.tsx` の修正（オプション）

#### 追加するデバッグログ
```typescript
// デバッグ用のログ（本番環境では削除）
useEffect(() => {
  console.log('Roulette Debug Info:', {
    validOptions,
    validWeights,
    totalWeight,
    segmentAngles,
    colors
  });
}, [validOptions, validWeights, totalWeight, segmentAngles, colors]);
```

## 変更の影響分析

### 削除される機能
1. **選択肢の分割表示**: 重みが高い選択肢を2つに分割する機能
2. **複雑な重み計算**: 分割後の重みの再分配ロジック
3. **動的な選択肢管理**: 分割による選択肢数の動的変更

### 保持される機能
1. **基本的なルーレット表示**: 選択肢と重みに基づくルーレット描画
2. **重み設定**: スライダーによる重みの変更
3. **スピン機能**: ルーレットの回転と結果表示
4. **選択肢管理**: 選択肢の追加・削除・編集

### 改善される点
1. **安定性**: 複雑な分割ロジックによる不具合の解消
2. **パフォーマンス**: 不要な処理の削除による高速化
3. **デバッグ性**: シンプルな構造による問題の特定が容易
4. **保守性**: コードの理解と修正が容易

## テスト用のサンプルデータ

### 正常ケース
```typescript
const testOptions = [
  { id: '1', text: '選択肢A', weight: 50 },
  { id: '2', text: '選択肢B', weight: 30 },
  { id: '3', text: '選択肢C', weight: 20 }
];
```

### エラーケース1: 重みの合計が100%でない
```typescript
const testOptions = [
  { id: '1', text: '選択肢A', weight: 60 },
  { id: '2', text: '選択肢B', weight: 50 }
];
```

### エラーケース2: 空の選択肢がある
```typescript
const testOptions = [
  { id: '1', text: '選択肢A', weight: 50 },
  { id: '2', text: '', weight: 30 },
  { id: '3', text: '選択肢C', weight: 20 }
];
```

### エラーケース3: 重みが0
```typescript
const testOptions = [
  { id: '1', text: '選択肢A', weight: 0 },
  { id: '2', text: '選択肢B', weight: 100 }
];
```

## 修正後の期待される動作

### 正常な動作
1. **2つの選択肢**: 選択肢A(70%), 選択肢B(30%) → ルーレットが2分割で表示
2. **3つの選択肢**: 選択肢A(50%), 選択肢B(30%), 選択肢C(20%) → ルーレットが3分割で表示
3. **重み変更**: スライダーで重みを変更すると，ルーレットの表示が即座に更新

### エラーハンドリング
1. **重みの合計が100%でない**: 自動的に正規化して表示
2. **空の選択肢**: 自動的に除外して表示
3. **重みが0**: デフォルト値(1)を使用して表示

## パフォーマンスの改善

### 修正前
- 複雑な分割ロジックによる計算コスト
- 動的な配列操作によるメモリ使用量の増加
- 不必要な再計算の発生

### 修正後
- シンプルな配列操作による高速化
- メモリ使用量の削減
- 不要な再計算の排除

## 今後の拡張性

### 分割機能の再実装
修正後も分割機能は再実装可能です：

1. **段階的な実装**: 基本的な機能が安定してから実装
2. **テストの充実**: 自動テストを追加してから実装
3. **ユーザーフィードバック**: 実際の需要を確認してから実装

### 新機能の追加
シンプルな構造により，以下の機能が追加しやすくなります：

1. **アニメーション効果**: ルーレットの回転アニメーション
2. **音響効果**: スピン時の音響フィードバック
3. **テーマ機能**: ルーレットの色やデザインの変更
4. **統計機能**: 選択結果の履歴や統計表示