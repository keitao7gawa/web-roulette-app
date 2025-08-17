'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { PlusIcon, TrashIcon, ArrowPathIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import type { Option } from '../types/option';
import { getColor } from '../constants/colors';
import { Confetti } from './Confetti';
import Roulette from './Roulette';
import {
  processForDisplay,
  equalizeWeights as equalizeWeightsUtil,
  shuffleOptions as shuffleOptionsUtil,
  redistributeWeights as redistributeWeightsUtil,
} from '../lib/weights';
import { parseBatchInput } from '../lib/batchInput';
import { hasEmptyOption, validateWeight, normalizeWeight } from '../lib/validation';
import { loadExcluded, saveExcluded } from '../lib/storage';

function genId() { return Math.random().toString(36).slice(2, 10); }

export default function OptionsEditor() {
  const [options, setOptions] = useState<Option[]>([{ id: genId(), text: '', weight: 100 }]);
  const [excludedTexts, setExcludedTexts] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isEditing, setIsEditing] = useState<boolean[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const rouletteContainerRef = useRef<HTMLDivElement>(null);
  const [weightEditIndex, setWeightEditIndex] = useState<number | null>(null);
  // load excluded on mount
  useEffect(() => {
    setExcludedTexts(loadExcluded());
  }, []);

  // オプション変更時に存在しないIDの除外フラグを自動クリーンアップ
  useEffect(() => {
    const presentIds = new Set(options.map((o) => o.id));
    const cleaned = excludedTexts.filter((id) => presentIds.has(id));
    if (cleaned.length !== excludedTexts.length) {
      setExcludedTexts(cleaned);
      saveExcluded(cleaned);
    }
  }, [options, excludedTexts]);

  const excludeText = (targetTextOrId: string) => {
    if (!targetTextOrId) return;
    // 1) 重みの再分配（除外するテキストの重みを残りに等分配）
    setOptions((current) => {
      const clone = current.map((o) => ({ ...o }));
      // 対象: 最初に一致した1件のみ（id一致優先、なければ最初のtext一致）
      let targetIndex = clone.findIndex((o) => o.id === targetTextOrId);
      if (targetIndex === -1) targetIndex = clone.findIndex((o) => o.text === targetTextOrId && o.text.trim() !== '');
      if (targetIndex === -1) return clone;

      const alreadyExcluded = new Set(excludedTexts); // ここはidのセット

      const totalToSpread = clone[targetIndex].weight;
      clone[targetIndex].weight = 0;

      // 分配先: 有効かつ未除外かつ対象インデックス以外
      const recipientIdx = clone
        .map((o, i) => ({ o, i }))
        .filter(({ o, i }) => o.text.trim() !== '' && i !== targetIndex && !alreadyExcluded.has(o.id))
        .map(({ i }) => i);
      if (recipientIdx.length > 0 && totalToSpread > 0) {
        const add = Math.round((totalToSpread / recipientIdx.length) * 1000) / 1000;
        recipientIdx.forEach((i) => {
          clone[i].weight = Math.round((clone[i].weight + add) * 1000) / 1000;
        });
      }
      return clone;
    });

    // 2) 除外リストへ反映
    setExcludedTexts((prev) => {
      // 保存はidで行う（なければtext）
      const target = options.find((o) => o.id === targetTextOrId)?.id || options.find((o) => o.text === targetTextOrId)?.id || targetTextOrId;
      const next = Array.from(new Set([...prev, target]));
      saveExcluded(next);
      return next;
    });
  };

  const reviveText = (id: string) => {
    setExcludedTexts((prev) => {
      const next = prev.filter((t) => t !== id);
      saveExcluded(next);
      // 等分配（簡易）
      setOptions((cur) => equalizeNonExcluded(cur));
      return next;
    });
  };

  // 重みの等分配（未除外のみ対象）
  const equalizeNonExcluded = (optionsList: Option[]): Option[] => {
    const excludedSet = new Set(excludedTexts);
    const cloned = optionsList.map(o => ({ ...o }));
    // 対象（未除外・非空）のインデックス
    const recipients = cloned
      .map((o, i) => (o.text.trim() !== '' && !excludedSet.has(o.id) ? i : -1))
      .filter(i => i !== -1) as number[];
    if (recipients.length === 0) return cloned;
    if (recipients.length === 1) {
      // 1件なら100%、他は0に
      cloned[recipients[0]].weight = 100;
    } else {
      const eq = Math.floor((100 / recipients.length) * 1000) / 1000;
      recipients.forEach((i, idx) => {
        if (idx === recipients.length - 1) {
          const otherSum = recipients.slice(0, -1).reduce((s) => s + eq, 0);
          cloned[i].weight = Math.round((100 - otherSum) * 1000) / 1000;
        } else {
          cloned[i].weight = eq;
        }
      });
    }
    // 除外・空行は0
    cloned.forEach((o) => { if (o.text.trim() === '' || excludedSet.has(o.id)) o.weight = 0; });
    return cloned;
  };


  // Batch input states
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchMode, setBatchMode] = useState<'append' | 'replace'>('append');
  const [batchError, setBatchError] = useState<string | null>(null);

  const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const addOption = () => {
    if (isSpinning) return;
    // 既に空の選択肢がある場合は新規追加せずにそこへフォーカス
    const emptyIndex = options.findIndex((opt) => opt.text.trim() === '');
    if (emptyIndex !== -1) {
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
        if (inputs[emptyIndex]) inputs[emptyIndex].focus();
      }, 10);
      return;
    }
    // 空が無ければ新規作成し、直後にフォーカス
    const next = [...options, { id: genId(), text: '', weight: 0 }];
    setOptions(next);
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 10);
  };

  const removeOption = (index: number) => {
    if (isSpinning) return;

    const optionToRemove = options[index];
    const remainingOptions = options.filter((_, i) => i !== index);

    if (optionToRemove.text.trim() !== '' && optionToRemove.weight > 0) {
      const excludedSet = new Set(excludedTexts);
      const validNonExcluded = remainingOptions.filter(opt => opt.text.trim() !== '' && !excludedSet.has(opt.id));
      const validCount = validNonExcluded.length;

      if (validCount > 0) {
        const weightToRedistribute = optionToRemove.weight;
        const addPer = Math.round((weightToRedistribute / validCount) * 1000) / 1000;
        const distributedTotal = addPer * validCount;
        const remainder = Math.round((weightToRedistribute - distributedTotal) * 1000) / 1000;

        const updatedOptions = remainingOptions.map(opt => {
          if (opt.text.trim() === '' || excludedSet.has(opt.id)) return opt;
          return { ...opt, weight: Math.round((opt.weight + addPer) * 1000) / 1000 };
        });

        if (validNonExcluded.length > 0 && Math.abs(remainder) > 0) {
          const firstValidIndex = remainingOptions.findIndex(opt => opt.text.trim() !== '' && !excludedSet.has(opt.id));
          if (firstValidIndex >= 0) {
            updatedOptions[firstValidIndex].weight = Math.round((updatedOptions[firstValidIndex].weight + remainder) * 1000) / 1000;
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

    if ((wasEmpty && !isNowEmpty) || (!wasEmpty && isNowEmpty)) {
      if (wasEmpty && !isNowEmpty) {
        newOptions[index].text = value;
        const equalized = equalizeNonExcluded(newOptions);
        setOptions(equalized);
        return;
      } else if (!wasEmpty && isNowEmpty) {
        newOptions[index].text = value;
        const equalized = equalizeNonExcluded(newOptions);
        setOptions(equalized);
        return;
      }
    }

    newOptions[index].text = value;
    setOptions(newOptions);
  };

  const updateWeight = (index: number, newWeight: number) => {
    if (isSpinning) return;

    const newOptions = [...options];
    const currentOption = newOptions[index];
    if (currentOption.text.trim() === '' || excludedTexts.includes(currentOption.id)) return;

    const oldWeight = currentOption.weight;
    const delta = newWeight - oldWeight;
    if (delta === 0) return;

    const excludedSetForUpdate = new Set(excludedTexts);
    const otherValidIndices = newOptions
      .map((opt, i) => (i !== index && opt.text.trim() !== '' && !excludedSetForUpdate.has(opt.id) ? i : -1))
      .filter(i => i !== -1);

    if (otherValidIndices.length > 0) {
      newOptions[index].weight = Math.round(newWeight * 1000) / 1000;
      const remainingWeight = 100 - newWeight;

      if (remainingWeight > 0) {
        const otherTotalWeight = otherValidIndices.reduce((sum, i) => sum + newOptions[i].weight, 0);
        if (otherTotalWeight > 0) {
          otherValidIndices.forEach(i => {
            const ratio = newOptions[i].weight / otherTotalWeight;
            newOptions[i].weight = Math.round(remainingWeight * ratio * 1000) / 1000;
          });

          const total = newOptions.reduce((sum, opt) => sum + opt.weight, 0);
          if (Math.abs(total - 100) > 0.001) {
            const scale = 100 / total;
            otherValidIndices.forEach(i => {
              newOptions[i].weight = Math.round(newOptions[i].weight * scale * 1000) / 1000;
            });
          }
        } else {
          const equalShare = Math.round((remainingWeight / otherValidIndices.length) * 1000) / 1000;
          const totalShares = equalShare * otherValidIndices.length;
          const adjustment = (remainingWeight - totalShares) / otherValidIndices.length;
          otherValidIndices.forEach(i => {
            newOptions[i].weight = Math.round((equalShare + adjustment) * 1000) / 1000;
          });
        }
      } else {
        const minWeight = 0.001;
        otherValidIndices.forEach(i => {
          newOptions[i].weight = minWeight;
        });
        newOptions[index].weight = Math.round((100 - otherValidIndices.length * minWeight) * 1000) / 1000;
      }
    } else {
      newOptions[index].weight = 100;
    }

    setOptions(newOptions);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (isSpinning) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (options[index].text.trim() === '') return;

      const hasEmptyOption = options.some(opt => opt.text.trim() === '');
      if (hasEmptyOption) {
        const emptyIndex = options.findIndex(opt => opt.text.trim() === '');
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
          if (inputs.length > emptyIndex) inputs[emptyIndex].focus();
        }, 10);
        return;
      }

      if (isMobileDevice()) {
        addOption();
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
          if (inputs.length > index + 1) inputs[index + 1].focus();
        }, 10);
        return;
      }

      if (!isEditing[index]) {
        setIsEditing(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      } else {
        setIsEditing(prev => {
          const newState = [...prev];
          newState[index] = false;
          return newState;
        });
        addOption();
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
          if (inputs.length > index + 1) inputs[index + 1].focus();
        }, 10);
      }
    }

    if (e.key === 'Backspace' && options[index].text.trim() === '' && options.length > 1) {
      e.preventDefault();
      removeOption(index);
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"]');
        const focusIndex = index === 0 ? 0 : index - 1;
        if (inputs.length > 0 && inputs[focusIndex]) {
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
    if (result === 'オプションを入力してください') {
      setIsSpinning(false);
      return;
    } else {
      setShowConfetti(true);
      setIsSpinning(false);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  const getOptionColor = (index: number): string => getColor(index);
  const validOptionsCount = options.filter(opt => opt.text.trim() !== '' && !excludedTexts.includes(opt.id)).length;

  const equalizeWeights = () => {
    if (isSpinning) return;
    const newOptions = equalizeNonExcluded(options);
    setOptions(newOptions);
  };

  const shuffleOptions = () => {
    if (isSpinning) return;
    const shuffled = shuffleOptionsUtil(options);
    if (shuffled !== options) setOptions(shuffled);
  };

  const reviveAll = () => {
    if (excludedTexts.length === 0) return;
    // 1) 除外IDをクリア
    setExcludedTexts([]);
    saveExcluded([]);
    // 2) 全有効項目で等分配（空は0）
    setOptions((prev) => {
      const cloned = prev.map((o) => ({ ...o }));
      const recipients = cloned
        .map((o, i) => (o.text.trim() !== '' ? i : -1))
        .filter((i) => i !== -1) as number[];
      if (recipients.length === 0) return cloned;
      if (recipients.length === 1) {
        cloned[recipients[0]].weight = 100;
        return cloned;
      }
      const eq = Math.floor((100 / recipients.length) * 1000) / 1000;
      recipients.forEach((i, idx) => {
        if (idx === recipients.length - 1) {
          const otherSum = eq * (recipients.length - 1);
          cloned[i].weight = Math.round((100 - otherSum) * 1000) / 1000;
        } else {
          cloned[i].weight = eq;
        }
      });
      return cloned;
    });
  };

  const filteredOptionsForDisplay = useMemo(() => {
    const excludedSet = new Set(excludedTexts);
    // オブジェクト同一性を保つため、除外されていない元の参照をそのまま返す
    const valid = options.filter((o) => o.text.trim() !== '' && !excludedSet.has(o.id));
    return valid.length > 0 ? valid : options; // 全除外回避: 全部除外されたら元配列を渡し、ガードはRoulette側のplaceholderで対応
  }, [options, excludedTexts]);

  const processed = useMemo(() => processForDisplay(filteredOptionsForDisplay, getColor), [filteredOptionsForDisplay, excludedTexts]);

  // Apply batch input
  const handleApplyBatch = () => {
    setBatchError(null);
    const parsed = parseBatchInput(batchText);
    if (parsed.length === 0) {
      setBatchError('有効な行が見つかりません');
      return;
    }

    const newOptionObjs: Option[] = parsed.map((text) => ({ id: genId(), text, weight: 0 }));
    let next: Option[] = options;
    
    if (batchMode === 'append') {
      // 既存を維持したまま新規を末尾に追加（除外は残す・空は0%のまま）
      next = [...options, ...newOptionObjs];
    } else {
      next = [...newOptionObjs];
    }

    next = equalizeNonExcluded(next);
    setOptions(next);
    setIsBatchOpen(false);
    setBatchText('');
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-light to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-accent dark:text-accent tracking-tight">ルーレットアプリ</h1>

        <div className="text-center mb-8 text-gray-700 dark:text-gray-200 text-base sm:text-lg md:text-xl flex flex-col items-center font-medium">
          <p className="mb-2">📋 リストに選択肢を追加</p>
          <p className="mb-2">📊 確率スライダーで調整</p>
          <p className="mb-2">🎯 ルーレット中央のボタンでスピン！</p>
        </div>

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
              onExclude={(text) => excludeText(text)}
              onExcludeIndex={(displayIdx) => {
                // displayIdx は processed配列のインデックス -> SourceIndices から特定
                const src = processed.processedSourceIndices?.[displayIdx];
                if (src == null || src < 0) return;
                const target = filteredOptionsForDisplay[src];
                if (target) excludeText(target.id);
              }}
            />
          </div>
        </div>

        <div className="space-y-2 mb-8 mt-10">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 text-accent">選択肢リスト</h2>
        {/* Batch input panel */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsBatchOpen((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm sm:text-base font-medium
              bg-gradient-to-r from-primary/90 to-accent/90 text-white shadow-sm
              hover:from-primary hover:to-accent active:scale-[0.99]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
              transition border border-white/10 dark:border-white/5`}
          >
            <ClipboardDocumentListIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{isBatchOpen ? '一括入力を閉じる' : '一括入力'}</span>
          </button>
          {isBatchOpen && (
            <div className="mt-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white/50 dark:bg-gray-900/40 backdrop-blur-sm">
              <div className="space-y-4">
                {/* テキストエリアと反映方法を横並びに配置 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                  {/* テキストエリアセクション */}
                  <div className="lg:col-span-2 space-y-2 flex flex-col">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      テキスト（改行/Markdownリスト対応）
                    </label>
                    <textarea
                      value={batchText}
                      onChange={(e) => setBatchText(e.target.value)}
                      className="w-full h-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={`- りんご\n- バナナ\n- みかん`}
                    />
                  </div>

                  {/* 反映方法セクション */}
                  <div className="space-y-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">反映方法</span>
                    <div
                      role="group"
                      aria-label="一括入力の反映方法"
                      className="flex flex-col gap-2"
                    >
                      <button
                        type="button"
                        aria-pressed={batchMode === 'append'}
                        onClick={() => setBatchMode('append')}
                        className={`px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 text-left ${
                          batchMode === 'append'
                            ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-500/20'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        追加
                        <div className="text-xs mt-1 opacity-80">
                          既存の選択肢に追加
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-pressed={batchMode === 'replace'}
                        onClick={() => setBatchMode('replace')}
                        className={`px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 text-left ${
                          batchMode === 'replace'
                            ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-500/20'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        置換
                        <div className="text-xs mt-1 opacity-80">
                          既存の選択肢を置換
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* エラーメッセージ */}
                {batchError && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md border border-red-200 dark:border-red-800">
                    {batchError}
                  </div>
                )}

                {/* アクションボタンセクション */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBatchOpen(false)}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBatch}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    反映
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
          <div className={`grid grid-cols-1 gap-3 ${isSpinning ? 'opacity-50 pointer-events-none' : ''}`}>
            {options.map((option, index) => {
              // 有効配列の位置はUI色付けには使用しない（ルーレット表示順に合わせる）
              const isFocused = focusedIndex === index;
              const isValid = option.text.trim() !== '';
              const isExcluded = excludedTexts.includes(option.id);
              const displayIndex = !isExcluded && isValid
                ? filteredOptionsForDisplay.findIndex((o) => o === option)
                : -1;
              const displayColor = displayIndex >= 0 ? getOptionColor(displayIndex) : undefined;
              const displayPercentage = isValid ? option.weight : 0;

              return (
                <div key={index} className={`my-2 transition-all duration-300 ease-in-out ${isSpinning ? 'notransition' : ''} ${isFocused ? 'scale-[1.03] z-10' : 'scale-[0.98] opacity-90'} ${isExcluded ? 'opacity-50' : ''}`}>
                  <div className={`flex items-center space-x-3 transition-all duration-200 ${isFocused ? 'bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-lg shadow-lg shadow-black/5 dark:shadow-white/5 p-2.5 border border-white/10' : 'bg-transparent p-2'}`}>
                    <div className="flex-[2]">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          onFocus={() => setFocusedIndex(index)}
                          onBlur={() => setFocusedIndex(null)}
                          placeholder={`選択肢 ${index + 1}`}
                          style={{ borderColor: isValid && !isExcluded && displayColor ? displayColor : '#e5e7eb', borderWidth: isFocused ? '4px' : '3px' }}
                          className={`flex-1 rounded-md focus:outline-none transition-all ${isSpinning ? 'notransition bg-gray-100 cursor-not-allowed' : ''} ${isFocused ? 'text-base sm:text-lg font-medium shadow-sm py-2 px-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500' : 'text-sm py-1.5 px-2.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400'}`}
                          disabled={isSpinning}
                          readOnly={isSpinning}
                        />
                        {isExcluded && (
                          <button
                            type="button"
                            onClick={() => reviveText(option.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            aria-label="この選択肢の除外を解除"
                          >
                            復活
                          </button>
                        )}
                      </div>
                    </div>

                    {isValid && !isExcluded ? (
                      <div className="flex-[3] flex items-center gap-3 transition-all duration-200">
                        <input
                          type="range"
                          min="0.1"
                          max="100"
                          step="0.1"
                          value={option.weight}
                          onChange={(e) => updateWeight(index, parseFloat(e.target.value))}
                          className={`range flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none ${isSpinning ? 'opacity-50' : ''} ${isFocused ? 'opacity-100' : 'opacity-80'}`}
                          style={{ accentColor: isValid && !isExcluded ? displayColor : undefined, color: isValid && !isExcluded ? displayColor : undefined }}
                          disabled={isSpinning || validOptionsCount <= 1}
                        />
                        {weightEditIndex === index ? (
                          <input
                            id={`weight-input-${index}`}
                            type="number"
                            inputMode="decimal"
                            step={0.1}
                            min={0.1}
                            max={100}
                            autoFocus
                            defaultValue={isValid ? option.weight.toFixed(1) : ''}
                            onFocus={(e) => e.currentTarget.select()}
                            onKeyDown={(e) => {
                              if (!isValid) return;
                              if (e.key === 'Escape') {
                                setWeightEditIndex(null);
                              }
                              if (e.key === 'Enter') {
                                const raw = Number((e.target as HTMLInputElement).value);
                                const normalized = normalizeWeight(raw, 0.1, 100, 1);
                                if (validateWeight(normalized)) updateWeight(index, normalized);
                                setWeightEditIndex(null);
                              }
                            }}
                            onBlur={(e) => {
                              if (!isValid) return;
                              const raw = Number(e.currentTarget.value);
                              const normalized = normalizeWeight(raw, 0.1, 100, 1);
                              if (validateWeight(normalized) && normalized !== option.weight) {
                                updateWeight(index, normalized);
                              }
                              setWeightEditIndex(null);
                            }}
                            className={`w-20 text-right rounded-md px-2 py-1 text-sm border ${
                              isValid ? 'border-gray-300 dark:border-gray-700' : 'border-transparent'
                            } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                            aria-label="割合数値入力"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setWeightEditIndex(index)}
                            className="w-16 text-right font-medium transition-all focus:outline-none focus:underline"
                            style={{ color: isValid && !isExcluded ? displayColor : undefined, fontSize: isFocused ? '1rem' : '0.875rem' }}
                            aria-label="割合を編集"
                          >
                            {displayPercentage.toFixed(1)}%
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex-[3] flex items-center gap-3">
                        <span className="text-xs text-gray-400">—</span>
                      </div>
                    )}

                    <button
                      onClick={() => removeOption(index)}
                      className={`flex-none transition-all ${isSpinning || options.length <= 1 ? 'text-gray-400 cursor-not-allowed notransition' : 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'} ${isFocused ? 'opacity-100 scale-110' : 'opacity-60 scale-90'}`}
                      disabled={isSpinning || options.length <= 1}
                      aria-disabled={isSpinning || options.length <= 1}
                    >
                      <TrashIcon className={`${isFocused ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-4 h-4'} transition-all`} />
                    </button>
                    {/* 復活ボタンは右側スライダー領域に移動済み */}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-6 pt-3">
            <button
              onClick={addOption}
              className={`flex items-center gap-2 text-sm sm:text-base px-3 py-2 rounded-md ${
                isSpinning || hasEmptyOption(options)
                  ? 'text-gray-400 cursor-not-allowed notransition'
                  : 'text-primary hover:text-primary/80 hover:bg-primary/10'
              }`}
              disabled={isSpinning || hasEmptyOption(options)}
              aria-disabled={isSpinning || hasEmptyOption(options)}
            >
              <PlusIcon className="w-5 h-5" />
              <span>選択肢を追加</span>
            </button>

            <div className="flex gap-2">
              {excludedTexts.length >= 2 && (
                <button
                  onClick={reviveAll}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm sm:text-base ${
                    isSpinning
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed notransition dark:bg-gray-700 dark:text-gray-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                  disabled={isSpinning}
                  aria-disabled={isSpinning}
                  aria-label="除外された選択肢をすべて復活"
                >
                  一括復活
                </button>
              )}
              <button
                onClick={shuffleOptions}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm sm:text-base ${isSpinning || validOptionsCount <= 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed notransition dark:bg-gray-700 dark:text-gray-500' : 'bg-primary/20 text-primary hover:bg-primary/30 dark:bg-primary/10 dark:text-primary/90 dark:hover:bg-primary/20'}`}
                disabled={isSpinning || validOptionsCount <= 1}
                aria-disabled={isSpinning || validOptionsCount <= 1}
              >
                <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>シャッフル</span>
              </button>

              <button
                onClick={equalizeWeights}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm sm:text-base ${isSpinning || validOptionsCount <= 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed notransition dark:bg-gray-700 dark:text-gray-500' : 'bg-secondary/20 text-secondary hover:bg-secondary/30 dark:bg-secondary/10 dark:text-secondary/90 dark:hover:bg-secondary/20'}`}
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
