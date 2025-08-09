'use client';

import { useState, useRef, useMemo } from 'react';
import { PlusIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Roulette from './components/Roulette';
import { getColor } from './constants/colors';
import { Confetti } from './components/Confetti';
import type { Option } from './types/option';
import {
  redistributeWeights as redistributeWeightsUtil,
  equalizeWeights as equalizeWeightsUtil,
  shuffleOptions as shuffleOptionsUtil,
  processForDisplay,
} from './lib/weights';

export default function Home() {
  const [options, setOptions] = useState<Option[]>([{ text: '', weight: 100 }]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isEditing, setIsEditing] = useState<boolean[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const rouletteContainerRef = useRef<HTMLDivElement>(null);

  // モバイル端末かどうかを判定する関数
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

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
        const redistributed = redistributeWeightsUtil(newOptions, index, true);
        setOptions(redistributed);
        return;
      } else if (!wasEmpty && isNowEmpty) {
        // 入力ありから空に変わった場合は重みを他に分配
        const redistributed = redistributeWeightsUtil(newOptions, index, false);
        redistributed[index].text = value;
        setOptions(redistributed);
        return;
      }
    }
    
    // それ以外の場合は単純に値を更新
    newOptions[index].text = value;
    setOptions(newOptions);
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
      // まず対象の選択肢の重みを更新（小数点第3位まで計算）
      newOptions[index].weight = Math.round(newWeight * 1000) / 1000;
      
      // 残りの重み
      const remainingWeight = 100 - newWeight;
      
      if (remainingWeight > 0) {
        // 他の選択肢の現在の重みの合計を計算
        const otherTotalWeight = otherValidIndices.reduce((sum, i) => sum + newOptions[i].weight, 0);
        
        if (otherTotalWeight > 0) {
          // 各選択肢の元の比率を保ちながら残りの重みを分配（小数点第3位まで計算）
          otherValidIndices.forEach(i => {
            const ratio = newOptions[i].weight / otherTotalWeight;
            newOptions[i].weight = Math.round(remainingWeight * ratio * 1000) / 1000;
          });
          
          // 合計を100%に正規化（小数点第3位まで）
          const total = newOptions.reduce((sum, opt) => sum + opt.weight, 0);
          if (Math.abs(total - 100) > 0.001) {
            const scale = 100 / total;
            otherValidIndices.forEach(i => {
              newOptions[i].weight = Math.round(newOptions[i].weight * scale * 1000) / 1000;
            });
          }
        } else {
          // 他の選択肢の重みが全て0の場合は均等分配（小数点第3位まで計算）
          const equalShare = Math.round(remainingWeight / otherValidIndices.length * 1000) / 1000;
          const totalShares = equalShare * otherValidIndices.length;
          const adjustment = (remainingWeight - totalShares) / otherValidIndices.length;
          
          otherValidIndices.forEach(i => {
            newOptions[i].weight = Math.round((equalShare + adjustment) * 1000) / 1000;
          });
        }
      } else {
        // 残りの重みがない場合（100%を超えている場合）
        const minWeight = 0.001; // 最小値を0.001%に設定
        otherValidIndices.forEach(i => {
          newOptions[i].weight = minWeight;
        });
        // 対象の選択肢の重みを調整（小数点第3位まで計算）
        newOptions[index].weight = Math.round((100 - (otherValidIndices.length * minWeight)) * 1000) / 1000;
      }
    } else {
      // 他の有効な選択肢がない場合は100%に設定
      newOptions[index].weight = 100;
    }
    
    setOptions(newOptions);
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

      // モバイル端末の場合は1回のEnterで次の選択肢へ
      if (isMobileDevice()) {
        addOption();
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
          if (inputs.length > index + 1) {
            inputs[index + 1].focus();
          }
        }, 10);
        return;
      }

      // PCの場合は編集状態の管理
      if (!isEditing[index]) {
        // 編集開始
        setIsEditing(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      } else {
        // 編集完了，新しい選択肢を追加
        setIsEditing(prev => {
          const newState = [...prev];
          newState[index] = false;
          return newState;
        });
        
        addOption();
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
          if (inputs.length > index + 1) {
            inputs[index + 1].focus();
          }
        }, 10);
      }
    }
    
    if (e.key === 'Backspace' && options[index].text.trim() === '' && options.length > 1) {
      e.preventDefault();
      removeOption(index);
      
      // モバイル端末でもPCと同様に，削除後に上の選択肢にフォーカスを移動
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
        const focusIndex = index === 0 ? 0 : index - 1;
        if (inputs.length > 0 && inputs[focusIndex]) {
          // モバイル端末ではフォーカスを設定する前に少し遅延を入れる
          if (isMobileDevice()) {
            setTimeout(() => {
              inputs[focusIndex].focus();
            }, 50);
          } else {
            inputs[focusIndex].focus();
          }
        }
      }, 10);
    }
  };

  const spinRoulette = () => {
    const validOptionsCount = options.filter(opt => opt.text.trim() !== '').length;
    if (validOptionsCount < 1) return;
    
    setIsSpinning(true);
  };

  const handleResultDetermined = (result: string) => {
    // 「オプションを入力してください」というダミーの結果の場合は特別処理
    if (result === 'オプションを入力してください') {
      // ダミーの選択肢が選ばれた場合、結果表示しない
      setIsSpinning(false);
      return;
    } else {
      // 実際の結果の場合は紙吹雪エフェクトを表示
      setShowConfetti(true);
      setIsSpinning(false);
      
      // 3秒後に紙吹雪を非表示にする
      setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
    }
  };

  const getOptionColor = (index: number): string => {
    return getColor(index);
  };

  // 有効な選択肢の数を取得
  const validOptionsCount = options.filter(opt => opt.text.trim() !== '').length;

  // 重みを均等に分配する関数
  const equalizeWeights = () => {
    if (isSpinning) return;
    
    const newOptions = equalizeWeightsUtil(options);
    setOptions(newOptions);
  };

  // 選択肢をシャッフルする関数
  const shuffleOptions = () => {
    if (isSpinning) return;
    const shuffled = shuffleOptionsUtil(options);
    if (shuffled !== options) setOptions(shuffled);
  };

  // 表示用データ（ユーティリティで1回評価）
  const processed = useMemo(() => processForDisplay(options, getColor), [options]);

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-light to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-accent dark:text-accent tracking-tight">
          ルーレットアプリ
        </h1>
        
        <div className="text-center mb-8 text-gray-700 dark:text-gray-200 text-base sm:text-lg md:text-xl flex flex-col items-center font-medium">
          <p className="mb-2">📋 リストに選択肢を追加</p>
          <p className="mb-2">📊 確率スライダーで調整</p>
          <p className="mb-2">🎯 ルーレット中央のボタンでスピン！</p>
        </div>
        
        {/* 重みの大きい選択肢を分割して表示する */}
        <div className="gradient-border mb-10 relative" ref={rouletteContainerRef}>
          <div className="p-0.5 relative">
            <Confetti isActive={showConfetti} containerRef={rouletteContainerRef} />
            <Roulette
              options={processed.processedOptions}
              weights={processed.processedWeights}
              colors={processed.processedColors}
              isSpinning={isSpinning}
              onSpin={spinRoulette}
              onSegmentColorChange={() => {}}
              onResultDetermined={handleResultDetermined}
            />
          </div>
        </div>
        
        <div className="space-y-2 mb-8 mt-10">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 text-accent">選択肢リスト</h2>
          <div className={`grid grid-cols-1 gap-3 ${isSpinning ? 'opacity-50 pointer-events-none' : ''}`}>
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
                  className={`my-2 transition-all duration-300 ease-in-out ${
                    isSpinning ? "notransition" : ""
                  } ${
                    isFocused 
                      ? "scale-[1.03] z-10" 
                      : "scale-[0.98] opacity-90"
                  }`}
                >
                  <div className={`flex items-center space-x-3 transition-all duration-200 ${
                    isFocused 
                      ? 'bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-lg shadow-lg shadow-black/5 dark:shadow-white/5 p-2.5 border border-white/10' 
                      : 'bg-transparent p-2'
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
                          borderWidth: isFocused ? '4px' : '3px',
                        }}
                        className={`w-full rounded-md focus:outline-none transition-all ${
                          isSpinning ? "notransition bg-gray-100 cursor-not-allowed" : ""
                        } ${
                          isFocused 
                            ? "text-base sm:text-lg font-medium shadow-sm py-2 px-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" 
                            : "text-sm py-1.5 px-2.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        }`}
                        disabled={isSpinning}
                        readOnly={isSpinning}
                      />
                    </div>
                    
                    {/* 重みスライダー（有効な選択肢のみ表示） */}
                    {isValid ? (
                      <div className="flex-[3] flex items-center gap-3 transition-all duration-200">
                        <input
                          type="range"
                          min="0.1"
                          max="100"
                          step="0.1"
                          value={option.weight}
                          onChange={(e) => updateWeight(index, parseFloat(e.target.value))}
                          className={`flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none ${
                            isSpinning ? "opacity-50" : ""
                          } ${
                            isFocused ? "opacity-100" : "opacity-80"
                          }`}
                          style={{
                            accentColor: isValid ? getOptionColor(validIndex !== -1 ? validIndex : 0) : undefined,
                            color: isValid ? getOptionColor(validIndex !== -1 ? validIndex : 0) : undefined
                          }}
                          disabled={isSpinning || validOptionsCount <= 1}
                        />
                        <span className="w-16 text-right font-medium transition-all" 
                              style={{ 
                                color: isValid ? getOptionColor(validIndex !== -1 ? validIndex : 0) : undefined,
                                fontSize: isFocused ? '1rem' : '0.875rem'
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
                        isSpinning || options.length <= 1
                          ? "text-gray-400 cursor-not-allowed notransition" 
                          : "text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      } ${
                        isFocused ? "opacity-100 scale-110" : "opacity-60 scale-90"
                      }`}
                      disabled={isSpinning || options.length <= 1}
                      aria-disabled={isSpinning || options.length <= 1}
                    >
                      <TrashIcon className={`${isFocused ? "w-5 h-5 sm:w-6 sm:h-6" : "w-4 h-4"} transition-all`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between items-center mt-6 pt-3">
            <button
              onClick={addOption}
              className={`flex items-center gap-2 text-sm sm:text-base px-3 py-2 rounded-md ${
                isSpinning 
                  ? "text-gray-400 cursor-not-allowed notransition" 
                  : "text-primary hover:text-primary/80 hover:bg-primary/10"
              }`}
              disabled={isSpinning}
              aria-disabled={isSpinning}
            >
              <PlusIcon className="w-5 h-5" />
              <span>選択肢を追加</span>
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={shuffleOptions}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm sm:text-base ${
                  isSpinning || validOptionsCount <= 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed notransition dark:bg-gray-700 dark:text-gray-500" 
                    : "bg-primary/20 text-primary hover:bg-primary/30 dark:bg-primary/10 dark:text-primary/90 dark:hover:bg-primary/20"
                }`}
                disabled={isSpinning || validOptionsCount <= 1}
                aria-disabled={isSpinning || validOptionsCount <= 1}
              >
                <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>シャッフル</span>
              </button>
              
              <button
                onClick={equalizeWeights}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm sm:text-base ${
                  isSpinning || validOptionsCount <= 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed notransition dark:bg-gray-700 dark:text-gray-500" 
                    : "bg-secondary/20 text-secondary hover:bg-secondary/30 dark:bg-secondary/10 dark:text-secondary/90 dark:hover:bg-secondary/20"
                }`}
                disabled={isSpinning || validOptionsCount <= 1}
                aria-disabled={isSpinning || validOptionsCount <= 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>均等化</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* プライバシー保護メッセージ */}
      <footer className="text-center py-4 mt-6 text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
        <p className="text-sm flex flex-col items-center justify-center gap-1">
          <span className="flex items-center gap-1">
            <span className="text-base">🔒</span> 
            <span className="font-medium"><strong>プライバシー保護</strong></span> 
            <span className="text-base">🔒</span>
          </span>
          <span className="mt-1">すべての処理はブラウザ内で完結し，</span>
          <span>データが外部に送信されることはありません．<span className="text-yellow-500"></span></span>
        </p>
        <div className="mt-3 flex items-center justify-center">
          <a 
            href="https://github.com/keitao7gawa/web-roulette-app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="w-4 h-4">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>View on GitHub</span>
          </a>
        </div>
        <div className="mt-3 flex items-center justify-center">
          <a
            href="https://x.com/keitao7gawa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
          >
            <Image src="/x-logo.svg" alt="X Logo" width={16} height={16} className="w-4 h-4" />
            <span>keitao7gawa</span>
          </a>
        </div>
      </footer>
    </main>
  );
}
