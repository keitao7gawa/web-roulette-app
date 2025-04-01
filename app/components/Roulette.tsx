'use client';

import { motion } from 'framer-motion';
import { PlayIcon } from '@heroicons/react/24/solid';
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
}

// 定数
const MIN_DURATION = 4;
const MAX_DURATION = 6;

export default function Roulette({ options, weights, onSegmentColorChange, colors, onResultDetermined }: RouletteProps) {
  const {
    validOptions,
    rotation,
    isSpinning,
    showResult,
    highlightedIndex,
    selectedIndex,
    fontSizes,
    startSpinning,
    handleRouletteStop,
    calculateSegmentData,
    optimizeTextDisplay
  } = useRoulette({
    options,
    weights,
    colors,
    onSegmentColorChange,
    onResultDetermined
  });

  return (
    <div className="flex flex-col items-center">
      {/* 結果表示 */}
      <motion.div
        className="text-2xl font-bold mb-4 text-center min-h-[2em]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ 
          opacity: isSpinning || showResult ? 1 : 0,
          y: isSpinning || showResult ? 0 : -20
        }}
        transition={{ duration: 0.5 }}
      >
        {isSpinning ? (
          <motion.div 
            className="text-primary"
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
        ) : showResult && selectedIndex !== null && selectedIndex >= 0 && selectedIndex < validOptions.length ? (
          `「${validOptions[selectedIndex]}」が選ばれました！`
        ) : null}
      </motion.div>

      <div className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] mx-auto mb-8">
        {/* 針（右側に配置） - 中心から外側に向けて修正 */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 z-10 w-10 h-8 flex items-center justify-end">
          <div className="w-0 h-0 border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent border-r-[24px] border-r-red-600" />
        </div>

        <motion.svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          animate={{ rotate: rotation }}
          transition={{
            duration: MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION),
            ease: [0.32, 0.72, 0.35, 1.0],
            onComplete: handleRouletteStop
          }}
        >
          {validOptions.map((option, index) => {
            const { path, textX, textY, textRotation, color} = calculateSegmentData(index);
            
            const isHighlighted = highlightedIndex === index;
            const baseFontSize = fontSizes[index];
            const fontSize = isHighlighted ? baseFontSize * 1.25 : baseFontSize;
            const displayText = option ? optimizeTextDisplay(option, fontSize) : '';
            
            return (
              <g key={index}>
                <path
                  d={path}
                  fill={color}
                  stroke={isHighlighted ? "yellow" : "white"}
                  strokeWidth={isHighlighted ? "3" : "1"}
                  style={{
                    transform: isHighlighted ? "scale(1.05)" : "scale(1)",
                    filter: isHighlighted ? "brightness(1.3)" : "brightness(1)",
                    transition: "all 0.3s ease"
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
                    textShadow: "0px 0px 2px rgba(0,0,0,0.7)"
                  }}
                >
                  {displayText}
                </text>
              </g>
            );
          })}
        </motion.svg>
        
        {/* 中心の円とボタン */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full border-4 border-primary shadow-lg flex items-center justify-center">
          <button
            onClick={startSpinning}
            disabled={validOptions.length < 2}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              validOptions.length < 2
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            <PlayIcon className="w-8 h-8 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}