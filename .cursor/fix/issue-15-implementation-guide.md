# Issue #15: 実装ガイド

## 修正の実装手順

### Step 1: `processForDisplay`関数の修正

**ファイル**: `app/lib/weights.ts`

#### 現在の問題のあるコード
```typescript
export function processForDisplay(optionsList: Option[], colorResolver: (_index: number) => string, noOptionsText: string = "オプションを入力してください"): ProcessedDisplay {
  const validOptions = optionsList.filter(opt => opt.text.trim() !== "");
  
  // ... 分割ロジック（問題の原因）
  const splitIndices: number[] = [];
  const SPLIT_RATIO = 1.5;
  const splitThreshold = baseWeight * SPLIT_RATIO;
  
  validOptions.forEach((option, index) => {
    if (option.weight >= splitThreshold && option.weight >= 20) {
      splitIndices.push(index);
    }
  });
  
  // ... 複雑な分割処理
}
```

#### 修正後のコード
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

### Step 2: `useRoulette`フックの安定化

**ファイル**: `app/hooks/useRoulette.ts`

#### 現在の問題のあるコード
```typescript
const validWeights = useMemo(() => {
  if (!weights) return validOptions.map(() => 1);
  return options
    .map((option, index) => ({ option, weight: weights[index] || 1 }))
    .filter(item => item.option && item.option.trim() !== '')
    .map(item => item.weight);
}, [validOptions, weights, options]);
```

#### 修正後のコード
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

### Step 3: エラーハンドリングの強化

**ファイル**: `app/hooks/useRoulette.ts`

#### 追加するコード
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

### Step 4: デバッグログの追加

**ファイル**: `app/components/Roulette.tsx`

#### 追加するコード
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

## テスト手順

### 1. 基本的な動作確認

```bash
# アプリを起動
npm run dev

# ブラウザで http://localhost:3000 を開く
```

### 2. テストケース

#### テストケース1: 2つの選択肢
1. 選択肢A, 選択肢Bを追加
2. 重みを70%, 30%に設定
3. ルーレットが正しく表示されることを確認
4. スピン機能が動作することを確認

#### テストケース2: 3つの選択肢
1. 選択肢A, 選択肢B, 選択肢Cを追加
2. 重みを50%, 30%, 20%に設定
3. ルーレットが正しく表示されることを確認
4. 各選択肢のテキストが表示されることを確認

#### テストケース3: 極端な重み設定
1. 選択肢A, 選択肢Bを追加
2. 重みを99%, 1%に設定
3. ルーレットが正しく表示されることを確認
4. 重みの割合が視覚的に反映されることを確認

### 3. エラーハンドリングの確認

#### エラーケース1: 重みの合計が100%でない場合
1. 選択肢A, 選択肢Bを追加
2. 重みを60%, 50%に設定（合計110%）
3. アプリがクラッシュしないことを確認

#### エラーケース2: 空の選択肢がある場合
1. 選択肢A, 空の選択肢, 選択肢Bを追加
2. 重みを50%, 30%, 20%に設定
3. 空の選択肢が無視されることを確認

## デプロイ手順

### 1. 修正のコミット

```bash
# 変更をステージング
git add app/lib/weights.ts app/hooks/useRoulette.ts

# コミット
git commit -m "fix: ルーレットの重み表示問題を修正

- processForDisplay関数の分割ロジックを無効化
- useRouletteフックの重み計算を簡素化
- エラーハンドリングを強化

Fixes #15"
```

### 2. プルリクエストの作成

```bash
# ブランチを作成
git checkout -b fix/roulette-weight-display-issue-15

# プッシュ
git push origin fix/roulette-weight-display-issue-15
```

### 3. テストの実行

```bash
# テストを実行
npm test

# ビルドを確認
npm run build
```

## 修正後の検証項目

### 機能面の検証
- [ ] 複数選択肢でのルーレット表示
- [ ] 重み設定の正確な反映
- [ ] スピン機能の正常動作
- [ ] 選択肢の追加・削除機能
- [ ] 重みの変更機能

### パフォーマンス面の検証
- [ ] ページの読み込み速度
- [ ] ルーレットの描画速度
- [ ] メモリ使用量
- [ ] レスポンシブデザイン

### エラーハンドリング面の検証
- [ ] 不正なデータでのクラッシュ回避
- [ ] エラーメッセージの表示
- [ ] ログの出力
- [ ] フォールバック機能

## 今後の改善点

### 短期（1-2週間）
1. 自動テストの追加
2. エラーログの監視
3. ユーザーフィードバックの収集

### 中期（1-2ヶ月）
1. 分割機能の再実装検討
2. パフォーマンスの最適化
3. アクセシビリティの向上

### 長期（3-6ヶ月）
1. 新機能の追加
2. アーキテクチャの改善
3. スケーラビリティの向上