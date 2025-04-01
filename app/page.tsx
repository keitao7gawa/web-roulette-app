'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Roulette from './components/Roulette';

// 20色以上のカラーパレット
const COLORS = [
  '#FF9999', // サーモンピンク
  '#99CCFF', // スカイブルー
  '#99FF99', // ライトグリーン
  '#FFB366', // ライトオレンジ
  '#FF99CC', // ピンク
  '#9999FF', // ラベンダー
  '#FFFF99', // ライトイエロー
  '#FF99FF', // マゼンタ
  '#99FFFF', // アクアブルー
  '#FFB399', // コーラル
  '#CC99FF', // ライトパープル
  '#FF9966', // ピーチ
  '#99FF66', // ライムグリーン
  '#66B2FF', // ドッジブルー
  '#FF66B2', // ホットピンク
  '#B2FF66', // イエローグリーン
  '#66FFB2', // ミントグリーン
  '#B266FF', // パープル
  '#FFB266', // アプリコット
  '#66FFE6', // ターコイズ
  '#FF6666', // ライトレッド
  '#66FF66', // ブライトグリーン
  '#6666FF', // ブライトブルー
  '#FFE666', // バナナイエロー
];

// 選択肢の型定義
interface Option {
  text: string;
  weight: number; // 重み（1〜100の範囲）
}

export default function Home() {
  const [options, setOptions] = useState<Option[]>([{ text: '', weight: 100 }]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const addOption = () => {
    if (isSpinning) return;
    
    // 追加時に既存のオプションがあれば、空の選択肢には重みを割り当てない
    setOptions([...options, { text: '', weight: 0 }]);
  };

  const removeOption = (index: number) => {
    if (isSpinning) return;
    
    const optionToRemove = options[index];
    const remainingOptions = options.filter((_, i) => i !== index);
    
    // 削除する選択肢に重みがある場合、他の有効な選択肢に再分配
    if (optionToRemove.text.trim() !== '' && optionToRemove.weight > 0) {
      const validOptions = remainingOptions.filter(opt => opt.text.trim() !== '');
      const validCount = validOptions.length;
      
      if (validCount > 0) {
        const weightToRedistribute = optionToRemove.weight;
        const weightPerOption = Math.floor(weightToRedistribute / validCount);
        const remainder = weightToRedistribute - (weightPerOption * validCount);
        
        // 重みを再分配
        const updatedOptions = remainingOptions.map(opt => {
          if (opt.text.trim() === '') return opt; // 空のオプションはそのまま
          return { ...opt, weight: opt.weight + weightPerOption };
        });
        
        // 余りは最初の有効なオプションに加える
        if (remainder > 0 && validOptions.length > 0) {
          const firstValidIndex = remainingOptions.findIndex(opt => opt.text.trim() !== '');
          if (firstValidIndex >= 0) {
            updatedOptions[firstValidIndex].weight += remainder;
          }
        }
        
        setOptions(updatedOptions);
        return;
      }
    }
    
    setOptions(remainingOptions);
  };

  const updateOption = (index: number, value: string) => {
    if (isSpinning) return;
    
    const newOptions = [...options];
    const oldValue = newOptions[index].text;
    const wasEmpty = oldValue.trim() === '';
    const isNowEmpty = value.trim() === '';
    
    // 空から入力あり、または入力ありから空に変わる場合は重みを調整
    if ((wasEmpty && !isNowEmpty) || (!wasEmpty && isNowEmpty)) {
      if (wasEmpty && !isNowEmpty) {
        // 空から入力ありに変わった場合は有効な選択肢で均等に重みを振り直す
        // まず値を更新してから重みを再分配する
        newOptions[index].text = value;
        redistributeWeights(newOptions, index, true);
        setOptions(newOptions);
        return;
      } else if (!wasEmpty && isNowEmpty) {
        // 入力ありから空に変わった場合は重みを他に分配
        redistributeWeights(newOptions, index, false);
        newOptions[index].text = value;
        setOptions(newOptions);
        return;
      }
    }
    
    // それ以外の場合は単純に値を更新
    newOptions[index].text = value;
    setOptions(newOptions);
  };

  // 重みを再分配する関数
  const redistributeWeights = (optionsList: Option[], changedIndex: number, isNewValid: boolean) => {
    // 有効なオプションを特定（空でないオプション）
    const validIndices = optionsList
      .map((opt, i) => i !== changedIndex && opt.text.trim() !== '' ? i : -1)
      .filter(i => i !== -1);
    
    if (isNewValid) {
      // 新しく有効になる場合、既存の有効なオプションから均等に重みを分配
      if (validIndices.length > 0) {
        const totalToShare = 100;
        const newWeight = Math.floor(totalToShare / (validIndices.length + 1));
        const remainder = totalToShare - (newWeight * (validIndices.length + 1));
        
        // 既存の有効なオプションに重みを設定
        validIndices.forEach(i => {
          optionsList[i].weight = newWeight;
        });
        
        // 新しく有効になるオプションに重みを設定
        optionsList[changedIndex].weight = newWeight + remainder;
      } else {
        // 他に有効なオプションがない場合、100%に設定
        optionsList[changedIndex].weight = 100;
      }
    } else {
      // 無効になる場合、このオプションの重みを他の有効なオプションに分配
      const weightToRedistribute = optionsList[changedIndex].weight;
      
      if (validIndices.length > 0 && weightToRedistribute > 0) {
        const weightPerOption = Math.floor(weightToRedistribute / validIndices.length);
        const remainder = weightToRedistribute - (weightPerOption * validIndices.length);
        
        // 重みを再分配
        validIndices.forEach((i, index) => {
          optionsList[i].weight += weightPerOption + (index === 0 ? remainder : 0);
        });
      }
      
      // 無効になるオプションの重みをゼロに
      optionsList[changedIndex].weight = 0;
    }
    
    // 合計が100%になるよう正規化
    normalizeWeights(optionsList);
  };

  // スライダーで重みを更新
  const updateWeight = (index: number, newWeight: number) => {
    if (isSpinning) return;
    
    const newOptions = [...options];
    const currentOption = newOptions[index];
    
    // テキストが空の選択肢は処理しない
    if (currentOption.text.trim() === '') return;
    
    // 変更前の重み
    const oldWeight = currentOption.weight;
    // 変化量
    const delta = newWeight - oldWeight;
    
    if (delta === 0) return; // 変化なしなら何もしない
    
    // 他の有効なオプションを特定
    const otherValidIndices = newOptions
      .map((opt, i) => i !== index && opt.text.trim() !== '' ? i : -1)
      .filter(i => i !== -1);
    
    // 他の選択肢がある場合は調整
    if (otherValidIndices.length > 0) {
      // 合計で100%になるように他の選択肢の重みを均等に調整
      // まず対象の選択肢の重みを更新
      newOptions[index].weight = newWeight;
      
      // 残りの重み
      const remainingWeight = 100 - newWeight;
      
      // 残りの重みを他の選択肢に均等に分配
      if (remainingWeight > 0) {
        // 均等な重み（小数点第一位まで計算）
        const equalShare = Math.round((remainingWeight / otherValidIndices.length) * 10) / 10;
        // 合計を計算して余りを調整
        const totalShares = equalShare * (otherValidIndices.length - 1);
        // 最後の要素の値（100%になるように調整）
        const lastShare = Math.round((remainingWeight - totalShares) * 10) / 10;
        
        // 各選択肢に重みを設定
        otherValidIndices.forEach((i, idx) => {
          if (idx === otherValidIndices.length - 1) {
            // 最後の選択肢には調整値を設定
            newOptions[i].weight = lastShare;
          } else {
            newOptions[i].weight = equalShare;
          }
        });
      } else {
        // 残りの重みがない場合（100%を超えている場合）
        // 各選択肢の重みを最小値に設定
        otherValidIndices.forEach(i => {
          newOptions[i].weight = 0.1; // 最小値を0.1%に設定
        });
        
        // 対象の選択肢の重みを調整して合計が100%になるようにする
        const otherSum = otherValidIndices.length * 0.1; // 各選択肢の重みが最小値の場合の合計
        newOptions[index].weight = Math.round((100 - otherSum) * 10) / 10;
      }
    } else {
      // 他の有効な選択肢がない場合は100%に設定
      newOptions[index].weight = 100;
    }
    
    setOptions(newOptions);
  };

  // 重みの合計が100になるように正規化する
  const normalizeWeights = (optionsList: Option[]) => {
    // 有効な選択肢の合計重みを計算
    const validOptions = optionsList.filter(opt => opt.text.trim() !== '');
    const totalWeight = validOptions.reduce((sum, opt) => sum + opt.weight, 0);
    
    if (totalWeight === 0 || Math.abs(totalWeight - 100) < 0.1) return; // 調整不要
    
    // スケーリング係数
    const scale = 100 / totalWeight;
    
    // 各オプションの重みを調整
    validOptions.forEach((opt, index) => {
      const originalIndex = optionsList.findIndex(o => o === opt);
      if (originalIndex >= 0) {
        if (index === validOptions.length - 1) {
          // 最後のオプションは合計が100になるように調整（丸め誤差対策）
          const otherSum = validOptions
            .slice(0, validOptions.length - 1)
            .reduce((sum, o) => {
              const idx = optionsList.findIndex(opt => opt === o);
              return sum + (idx >= 0 ? optionsList[idx].weight : 0);
            }, 0);
          optionsList[originalIndex].weight = Math.round((100 - otherSum) * 10) / 10;
        } else {
          // それ以外のオプションはスケーリング（小数点第一位まで計算）
          optionsList[originalIndex].weight = Math.round((opt.weight * scale) * 10) / 10;
        }
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (isSpinning) return;
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // 現在の選択肢が空白の場合は新しい選択肢を追加しない
      if (options[index].text.trim() === '') return;
      
      // 既に空白の選択肢が存在する場合は新しい選択肢を追加しない
      const hasEmptyOption = options.some(opt => opt.text.trim() === '');
      if (hasEmptyOption) {
        // 最初の空白選択肢にフォーカスを移動
        const emptyIndex = options.findIndex(opt => opt.text.trim() === '');
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
          if (inputs.length > emptyIndex) {
            inputs[emptyIndex].focus();
          }
        }, 10);
        return;
      }
      
      // 条件を満たせば新しい選択肢を追加
      addOption();
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
        if (inputs.length > index + 1) {
          inputs[index + 1].focus();
        }
      }, 10);
    }
    
    if (e.key === 'Backspace' && options[index].text.trim() === '' && options.length > 1) {
      e.preventDefault();
      removeOption(index);
      
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
        const focusIndex = index === 0 ? 0 : index - 1;
        if (inputs.length > 0 && inputs[focusIndex]) {
          inputs[focusIndex].focus();
        }
      }, 10);
    }
  };

  const spinRoulette = () => {
    if (options.filter(opt => opt.text.trim() !== '').length < 2) return;
    
    setIsSpinning(true);
    setResult(null);
  };

  const handleResultDetermined = (result: string) => {
    setResult(result);
    setIsSpinning(false);
  };

  const getOptionColor = (index: number): string => {
    return COLORS[index % COLORS.length];
  };

  // 有効な選択肢（空でない）とその重みを取得
  const getValidOptionsWithWeights = () => {
    return options
      .filter(opt => opt.text.trim() !== '')
      .map(opt => ({
        text: opt.text,
        weight: opt.weight
      }));
  };

  // 有効な選択肢の数を取得
  const validOptionsCount = options.filter(opt => opt.text.trim() !== '').length;

  // 重みを均等に分配する関数
  const equalizeWeights = () => {
    if (isSpinning) return;
    
    const newOptions = [...options];
    const validOptions = newOptions.filter(opt => opt.text.trim() !== '');
    const validCount = validOptions.length;
    
    if (validCount <= 1) return; // 有効な選択肢が1つ以下なら何もしない
    
    // 均等な重みを計算（小数点第一位まで計算）
    const equalWeight = Math.floor((100 / validCount) * 10) / 10;
    
    // 全ての有効な選択肢の重みを設定
    validOptions.forEach((opt, index) => {
      const originalIndex = newOptions.findIndex(o => o === opt);
      if (originalIndex >= 0) {
        if (index === validOptions.length - 1) {
          // 最後の選択肢は合計が100になるように調整
          const otherSum = validOptions
            .slice(0, validOptions.length - 1)
            .reduce((sum, o) => {
              const idx = newOptions.findIndex(opt => opt === o);
              return sum + (idx >= 0 ? newOptions[idx].weight : 0);
            }, 0);
          newOptions[originalIndex].weight = Math.round((100 - otherSum) * 10) / 10;
        } else {
          newOptions[originalIndex].weight = equalWeight;
        }
      }
    });
    
    // 空の選択肢は重み0に設定
    newOptions.forEach(opt => {
      if (opt.text.trim() === '') {
        opt.weight = 0;
      }
    });
    
    setOptions(newOptions);
  };

  // 重みの大きい選択肢を表示用に分割する
  const getProcessedOptionsForRouletteDisplay = () => {
    const validOptions = options.filter(opt => opt.text.trim() !== '');
    
    // 処理後の選択肢と重みを格納する配列
    const processedOptions: string[] = [];
    const processedWeights: number[] = [];
    // 分割された選択肢の元のインデックスを追跡するための配列
    const optionIndices: number[] = []; // 各セグメントの元の選択肢のインデックス
    
    // 分割が必要な選択肢と通常の選択肢を識別
    const splitIndices: number[] = [];
    
    // 動的に分割閾値を計算
    // 1. 重みの平均値を計算
    const totalWeight = validOptions.reduce((sum, opt) => sum + opt.weight, 0);
    const averageWeight = totalWeight / validOptions.length;
    
    // 2. 重みの中央値を計算（奇数個なら中央、偶数個なら中央2つの平均）
    const sortedWeights = [...validOptions].sort((a, b) => a.weight - b.weight).map(opt => opt.weight);
    const medianWeight = sortedWeights.length % 2 === 0
      ? (sortedWeights[sortedWeights.length / 2 - 1] + sortedWeights[sortedWeights.length / 2]) / 2
      : sortedWeights[Math.floor(sortedWeights.length / 2)];
    
    // 3. 比較基準値を決定（平均と中央値の小さい方を使用して、極端な値の影響を抑える）
    const baseWeight = Math.min(averageWeight, medianWeight);
    
    // 分割の基準となる倍率（設定可能にしたい場合は状態として保持することも可能）
    const SPLIT_RATIO = 1.5;
    
    // 重みが基準値の何倍以上なら分割するか
    const splitThreshold = baseWeight * SPLIT_RATIO;
    
    console.log(`分割情報 - 平均: ${averageWeight.toFixed(1)}%, 中央値: ${medianWeight.toFixed(1)}%, 基準値: ${baseWeight.toFixed(1)}%, 分割閾値: ${splitThreshold.toFixed(1)}%`);
    
    // まず分割が必要な選択肢のインデックスを特定
    validOptions.forEach((option, index) => {
      if (option.weight >= splitThreshold && option.weight >= 20) { // 最低20%以上の重みがあるものだけ分割
        splitIndices.push(index);
        console.log(`"${option.text}" (${option.weight.toFixed(1)}%) を分割します - 閾値 ${splitThreshold.toFixed(1)}% を超過`);
      }
    });
    
    // すべての選択肢を一旦配列に追加
    validOptions.forEach((option, index) => {
      if (splitIndices.includes(index)) {
        // 重みを2つに分割
        const halfWeight = Math.floor(option.weight / 2 * 10) / 10; // 小数点第一位まで計算
        const remainder = option.weight - (halfWeight * 2);
        
        // 1つ目の分割セグメントを追加
        processedOptions.push(option.text);
        processedWeights.push(halfWeight + remainder);
        optionIndices.push(index); // 元の選択肢のインデックスを記録
      } else {
        // 閾値未満の場合はそのまま追加
        processedOptions.push(option.text);
        processedWeights.push(option.weight);
        optionIndices.push(index); // 元の選択肢のインデックスを記録
      }
    });
    
    // 分割が必要な選択肢の2つ目のセグメントを離れた位置に挿入
    splitIndices.forEach((originalIndex, i) => {
      const option = validOptions[originalIndex];
      const halfWeight = Math.floor(option.weight / 2 * 10) / 10; // 小数点第一位まで計算
      
      // 分割したセグメントの最初の位置を探す
      const firstSegmentIndex = processedOptions.findIndex((opt, idx) => 
        opt === option.text && optionIndices[idx] === originalIndex
      );
      
      if (firstSegmentIndex === -1) return; // 安全対策：最初のセグメントが見つからない場合はスキップ
      
      // セグメント総数
      const totalCount = processedOptions.length;
      
      // 理想的には元のセグメントの反対側（180度）に配置
      // ルーレット上の角度として考えると、半周（totalCount/2）離れた位置が最適
      let idealOffset = Math.floor(totalCount / 2);
      
      // 最低でも2つ以上離れた位置に配置（隣接を防ぐ）
      const minOffset = Math.max(2, Math.floor(totalCount / 4));
      
      // 挿入位置を計算（元のセグメントから半周離れた位置、循環考慮）
      let insertPosition = (firstSegmentIndex + idealOffset) % totalCount;
      
      // 他の分割セグメントと近すぎないように調整
      // すでに分割されたセグメントの位置を確認
      const otherSplitSegments = splitIndices
        .slice(0, i)
        .map(idx => {
          // 各分割セグメントの両方の位置を特定
          const segments = processedOptions
            .map((opt, optIdx) => optIdx)
            .filter(optIdx => optionIndices[optIdx] === idx);
          return segments;
        })
        .flat();
      
      // 分割セグメント同士が近すぎないように調整
      let attempts = 0;
      let bestPosition = insertPosition;
      let maxDistance = 0;
      
      // 最適な位置を探索（周囲±3位置）
      for (let offset = -3; offset <= 3; offset++) {
        const testPosition = (insertPosition + offset + totalCount) % totalCount;
        
        // この位置が元のセグメントから十分離れているかチェック
        const distanceFromOriginal = Math.min(
          Math.abs(testPosition - firstSegmentIndex),
          totalCount - Math.abs(testPosition - firstSegmentIndex)
        );
        
        // この位置が他の分割セグメントから十分離れているかチェック
        let minDistanceFromOthers = totalCount;
        for (const otherPos of otherSplitSegments) {
          const distance = Math.min(
            Math.abs(testPosition - otherPos),
            totalCount - Math.abs(testPosition - otherPos)
          );
          minDistanceFromOthers = Math.min(minDistanceFromOthers, distance);
        }
        
        // 元のセグメントと他の分割セグメントからの距離の最小値を計算
        const minTotalDistance = Math.min(distanceFromOriginal, minDistanceFromOthers);
        
        // より良い位置が見つかったら更新
        if (minTotalDistance > maxDistance) {
          maxDistance = minTotalDistance;
          bestPosition = testPosition;
        }
      }
      
      // 最適な位置に2つ目のセグメントを挿入
      processedOptions.splice(bestPosition, 0, option.text);
      processedWeights.splice(bestPosition, 0, halfWeight);
      optionIndices.splice(bestPosition, 0, originalIndex);
      
      // デバッグ情報
      console.log(`分割セグメント "${option.text}" の配置: 最初=${firstSegmentIndex}, 2つ目=${bestPosition}, 距離=${maxDistance}`);
    });
    
    // 各選択肢の色を管理するための配列
    const processedColors = optionIndices.map(index => COLORS[index % COLORS.length]);
    
    return { processedOptions, processedWeights, processedColors };
  };

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 text-primary">
          ルーレットアプリ
        </h1>
        
        {/* 重みの大きい選択肢を分割して表示する */}
        <Roulette
          options={getProcessedOptionsForRouletteDisplay().processedOptions}
          weights={getProcessedOptionsForRouletteDisplay().processedWeights}
          colors={getProcessedOptionsForRouletteDisplay().processedColors}
          isSpinning={isSpinning}
          onSpin={spinRoulette}
          onSegmentColorChange={() => {}}
          onResultDetermined={handleResultDetermined}
        />
        
        <div className="space-y-1 mb-6 mt-6">
          <h2 className="text-lg font-bold text-center mb-3">選択肢リスト</h2>
          <div className={`grid grid-cols-1 gap-1 ${isSpinning ? 'opacity-50 pointer-events-none' : ''}`}>
            {options.map((option, index) => {
              const validOptions = options.filter(opt => opt.text.trim() !== '');
              const validIndex = validOptions.findIndex(opt => opt === option);
              const isFocused = focusedIndex === index;
              const isValid = option.text.trim() !== '';
              
              // 各選択肢の重みを計算（有効な選択肢の合計が100%になるように）
              const displayPercentage = isValid 
                ? option.weight 
                : 0;
              
              return (
                <div 
                  key={index} 
                  className={`my-1.5 transition-all duration-300 ease-in-out ${
                    isSpinning ? "notransition" : ""
                  } ${
                    isFocused 
                      ? "scale-[1.05] z-10" 
                      : "scale-[0.96] opacity-80"
                  }`}
                >
                  <div className={`flex items-center space-x-2 transition-all duration-200 ${
                    isFocused 
                      ? 'bg-white rounded-lg shadow-md p-1.5' 
                      : 'bg-transparent p-1'
                  }`}>
                    {/* 入力部分 */}
                    <div className="flex-[2]">
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        placeholder={`選択肢 ${index + 1}`}
                        style={{
                          borderColor: isValid ? getOptionColor(validIndex !== -1 ? validIndex : 0) : '#e5e7eb',
                          borderWidth: isFocused ? '2px' : '1px',
                          backgroundColor: isFocused ? 'white' : '#f9fafb',
                        }}
                        className={`w-full rounded-md focus:outline-none transition-all ${
                          isSpinning ? "notransition bg-gray-100" : ""
                        } ${
                          isFocused 
                            ? "text-base font-medium shadow-sm py-1.5 px-2.5"
                            : "text-xs py-1 px-2"
                        }`}
                        disabled={isSpinning}
                      />
                    </div>
                    
                    {/* 重みスライダー（有効な選択肢のみ表示） */}
                    {isValid ? (
                      <div className="flex-[3] flex items-center gap-2 transition-all duration-200">
                        <input
                          type="range"
                          min="0.1"
                          max="100"
                          step="0.1"
                          value={option.weight}
                          onChange={(e) => updateWeight(index, parseFloat(e.target.value))}
                          className={`flex-1 h-2 bg-gray-200 rounded-full appearance-none ${
                            isSpinning ? "opacity-50" : ""
                          } ${
                            isFocused ? "opacity-100" : "opacity-80"
                          }`}
                          style={{
                            accentColor: isValid ? getOptionColor(validIndex !== -1 ? validIndex : 0) : undefined
                          }}
                          disabled={isSpinning || validOptionsCount <= 1}
                        />
                        <span className="w-14 text-right text-xs font-medium transition-all" 
                              style={{ 
                                color: isValid ? getOptionColor(validIndex !== -1 ? validIndex : 0) : undefined,
                                fontSize: isFocused ? '0.875rem' : '0.75rem'
                              }}>
                          {displayPercentage.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex-[3]"></div>
                    )}
                    
                    {/* 削除ボタン */}
                    <button
                      onClick={() => removeOption(index)}
                      className={`flex-none transition-all ${
                        isSpinning 
                          ? "text-gray-400 cursor-not-allowed notransition" 
                          : "text-red-500 hover:text-red-700"
                      } ${
                        isFocused ? "opacity-100 scale-110" : "opacity-60 scale-90"
                      }`}
                      disabled={isSpinning}
                    >
                      <TrashIcon className={`${isFocused ? "w-5 h-5" : "w-3.5 h-3.5"} transition-all`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between items-center mt-3">
            <button
              onClick={addOption}
              className={`flex items-center gap-1 text-sm ${
                isSpinning 
                  ? "text-gray-400 cursor-not-allowed notransition" 
                  : "text-primary hover:text-primary/80"
              }`}
              disabled={isSpinning}
            >
              <PlusIcon className="w-4 h-4" />
              選択肢を追加
            </button>
            
            <button
              onClick={equalizeWeights}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm ${
                isSpinning || validOptionsCount <= 1
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed notransition" 
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
              }`}
              disabled={isSpinning || validOptionsCount <= 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              均等化
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
