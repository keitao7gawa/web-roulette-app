'use client';

import { motion } from 'framer-motion';
import { PlayIcon } from '@heroicons/react/24/solid';
import { XCircleIcon } from '@heroicons/react/24/outline';
import { useRoulette } from '../hooks/useRoulette';

// 型定義
interface RouletteProps {
  options: string[];
  weights?: number[];
  onSegmentColorChange: (index: number, color: string) => void;
  colors: string[];
  onResultDetermined?: (result: string) => void;
  isSpinning: boolean;
  onSpin: () => void;
  onExclude?: (text: string) => void;
  onExcludeIndex?: (index: number) => void;
}

// 定数
const MIN_DURATION = 4;
const MAX_DURATION = 6;

export default function Roulette({ options, weights, onSegmentColorChange, colors, onResultDetermined, isSpinning, onSpin, onExclude, onExcludeIndex }: RouletteProps) {
  const {
    validOptions,
    rotation,
    showResult,
    highlightedIndex,
    selectedIndex,
    fontSizes,
    startSpinning,
    handleRouletteStop,
    calculateSegmentData,
    optimizeTextDisplay,
    appPhase
  } = useRoulette({
    options,
    weights,
    colors,
    onSegmentColorChange,
    onResultDetermined
  });

  // スピンボタンのクリックハンドラ
  const handleSpinClick = () => {
    const isPlaceholderOnly = validOptions.length === 1 && validOptions[0] === 'オプションを入力してください';
    if (isPlaceholderOnly || validOptions.length < 1 || isSpinning) return;
    startSpinning();
    onSpin();
  };

  // 入力が必要なメッセージを表示するかどうか判断（入力フェーズのみ）
  const isPlaceholderOnly = validOptions.length === 1 && validOptions[0] === 'オプションを入力してください';
  const showInputMessage = isPlaceholderOnly;
  const hasValidSelection = selectedIndex !== null && selectedIndex >= 0 && selectedIndex < validOptions.length;
  const shouldShowTopMessage =
    isSpinning ||
    showInputMessage ||
    (appPhase === 'ready' && !isPlaceholderOnly) ||
    (appPhase === 'result' && showResult && hasValidSelection);

  return (
    <div className="flex flex-col items-center">
      {/* 結果表示 */}
      <motion.div
        className="text-2xl sm:text-3xl font-bold mb-8 text-center min-h-[3em] font-heading mt-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ 
          opacity: shouldShowTopMessage ? 1 : 0,
          y: shouldShowTopMessage ? 0 : -20
        }}
        transition={{ duration: 0.5 }}
      >
        {isSpinning ? (
          <motion.div 
            className="text-primary dark:text-primary"
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [1, 0.8, 1] 
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            抽選中...
          </motion.div>
        ) : showInputMessage ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="p-3 px-5 rounded-lg bg-primary/10 text-primary dark:bg-primary/20"
          >
            選択肢を入力してください
          </motion.div>
        ) : appPhase === 'ready' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="p-3 px-5 rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            中央のボタンを押して抽選を開始
          </motion.div>
        ) : appPhase === 'result' && showResult && selectedIndex !== null && selectedIndex >= 0 && selectedIndex < validOptions.length ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="p-3 px-5 rounded-lg bg-accent/10 text-accent dark:bg-accent/20 inline-flex items-center gap-3 flex-wrap justify-center"
          >
            <span>「{validOptions[selectedIndex]}」が選ばれました！</span>
            {(onExcludeIndex || onExclude) && (
              <button
                type="button"
                onClick={() => {
                  if (onExcludeIndex) onExcludeIndex(selectedIndex);
                  else if (onExclude) onExclude(validOptions[selectedIndex]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                aria-label="この選択肢を抽選対象から除外"
              >
                <XCircleIcon className="w-4 h-4" />
                この選択肢を除外
              </button>
            )}
          </motion.div>
        ) : null}
      </motion.div>

      <div className="relative w-80 h-80 sm:w-[26rem] sm:h-[26rem] md:w-[30rem] md:h-[30rem] mx-auto mb-10">
        {/* カスタム装飾: 外側のリング（選択肢が複数ある場合のみ表示） */}
        {validOptions.length > 1 && (
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 dark:border-primary/20 shadow-lg"></div>
        )}
        
        {/* 針（右側に配置） */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 z-10 w-12 h-10 flex items-center justify-end">
          <div 
            className="w-0 h-0 border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent border-r-[30px] border-r-white" 
            style={{
              filter: "drop-shadow(0 0 3px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 2px #FFBE0B)",
              boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)"
            }}
          />
        </div>

        <motion.svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-xl"
          animate={{ rotate: rotation }}
          transition={{
            duration: MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION),
            ease: [0.32, 0.72, 0.35, 1.0],
            onComplete: handleRouletteStop
          }}
        >
          {/* 背景円（選択肢が複数ある場合のみ表示） */}
          {validOptions.length > 1 && (
            <circle cx="50" cy="50" r="49" fill="#2D3748" className="dark:opacity-80" />
          )}
          
          {validOptions.map((option, index) => {
            const { path, textX, textY, textRotation, color} = calculateSegmentData(index);
            
            const isHighlighted = highlightedIndex === index && showResult;
            const baseFontSize = fontSizes[index];
            const fontSize = isHighlighted ? baseFontSize * 1.25 : baseFontSize;
            const displayText = option ? optimizeTextDisplay(option, fontSize) : '';
            
            return (
              <g key={index}>
                {validOptions.length === 1 ? (
                  <>
                    <circle
                      cx="50"
                      cy="50"
                      r="48"
                      fill={colors[0]}
                      stroke={isHighlighted ? "#FFBE0B" : "rgba(255,255,255,0.2)"}
                      strokeWidth={isHighlighted ? "4" : "1"}
                      style={{
                        transform: isHighlighted ? "scale(1)" : "scale(1)",
                        filter: isHighlighted ? "brightness(1.3)" : "brightness(1)",
                        transition: "all 0.5s ease"
                      }}
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize={fontSize}
                      fontWeight={isHighlighted ? "bold" : "normal"}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                      style={{
                        transition: "all 0.3s ease",
                        textShadow: "0px 0px 3px rgba(0,0,0,0.9)"
                      }}
                    >
                      {displayText}
                    </text>
                  </>
                ) : (
                  <>
                    <path
                      d={path}
                      fill={color}
                      stroke={isHighlighted ? "#FFBE0B" : "rgba(255,255,255,0.2)"}
                      strokeWidth={isHighlighted ? "3" : "1"}
                      style={{
                        transform: isHighlighted ? "scale(1.02)" : "scale(1)",
                        filter: isHighlighted ? "brightness(1.3)" : "brightness(1)",
                        transition: "all 0.5s ease"
                      }}
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize={fontSize}
                      fontWeight={isHighlighted ? "bold" : "normal"}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                      style={{
                        transition: "all 0.3s ease",
                        textShadow: isHighlighted 
                          ? "0px 0px 5px rgba(255,190,11,0.8), 0px 0px 3px rgba(0,0,0,0.9)"
                          : "0px 0px 3px rgba(0,0,0,0.9)"
                      }}
                    >
                      {displayText}
                    </text>
                  </>
                )}
              </g>
            );
          })}
          
          {/* セグメントの境目に輝く装飾を追加（選択肢が1つの場合は表示しない） */}
          {validOptions.length > 1 && (
            <circle 
              cx="50" 
              cy="50" 
              r="48.5" 
              fill="none" 
              stroke="rgba(255,255,255,0.2)" 
              strokeWidth="0.5" 
            />
          )}
        </motion.svg>
        
        {/* 中心の円とボタン */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-white dark:bg-gray-800 rounded-full border-4 border-primary dark:border-primary/70 shadow-lg flex items-center justify-center">
          <button
            onClick={handleSpinClick}
            disabled={isPlaceholderOnly || validOptions.length < 1 || isSpinning}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isPlaceholderOnly || validOptions.length < 1 || isSpinning
                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 hover:scale-105'
            }`}
          >
            <PlayIcon className="w-12 h-12 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}