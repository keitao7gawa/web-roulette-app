'use client';

import { motion } from 'framer-motion';
import { useRoulette } from '@/app/hooks/useRoulette';
import { RouletteMiniWindowProps } from '@/app/types/roulette-mini-window';

// 定数（ミニウィンドウ用に調整）
const MIN_DURATION = 4;
const MAX_DURATION = 6;
const MINI_FONT_SIZE_MULTIPLIER = 0.6; // ミニウィンドウ用のフォントサイズ倍率

export default function RouletteMiniWindow({
  options,
  weights,
  colors,
  isVisible
}: RouletteMiniWindowProps) {
  const {
    validOptions,
    rotation,
    showResult,
    highlightedIndex,
    fontSizes,
    handleRouletteStop,
    calculateSegmentData
  } = useRoulette({
    options,
    weights,
    colors,
    onSegmentColorChange: () => {}, // ミニウィンドウでは色変更機能は無効
    onResultDetermined: () => {} // ミニウィンドウでは結果決定機能は無効
  });

  // ミニウィンドウ用のフォントサイズを計算
  const miniFontSizes = fontSizes.map(size => size * MINI_FONT_SIZE_MULTIPLIER);

  // ミニウィンドウ用のテキスト最適化
  const optimizeMiniTextDisplay = (text: string, fontSize: number): string => {
    const maxLength = Math.floor(20 / (fontSize * 0.8)); // ミニウィンドウ用に短縮
    if (text.length > maxLength && maxLength > 2) {
      return text.substring(0, maxLength - 2) + '..';
    }
    return text;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed bottom-5 right-5 w-30 h-30 sm:bottom-8 sm:right-8 sm:w-36 sm:h-36 z-40 rounded-lg shadow-lg bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 backdrop-blur-sm"
      aria-label="Mini roulette window"
    >
      <div className="w-full h-full p-1">
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
          {/* 背景円（選択肢が複数ある場合のみ表示） */}
          {validOptions.length > 1 && (
            <circle cx="50" cy="50" r="49" fill="#2D3748" className="dark:opacity-80" />
          )}
          
          {validOptions.map((option, index) => {
            const { path, textX, textY, textRotation, color } = calculateSegmentData(index);
            
            const isHighlighted = highlightedIndex === index && showResult;
            const baseFontSize = miniFontSizes[index];
            const fontSize = isHighlighted ? baseFontSize * 1.25 : baseFontSize;
            const displayText = option ? optimizeMiniTextDisplay(option, fontSize) : '';
            
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
                      strokeWidth={isHighlighted ? "3" : "1"}
                      style={{
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
                        textShadow: "0px 0px 2px rgba(0,0,0,0.9)"
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
                      strokeWidth={isHighlighted ? "2" : "1"}
                      style={{
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
                          ? "0px 0px 3px rgba(255,190,11,0.8), 0px 0px 2px rgba(0,0,0,0.9)"
                          : "0px 0px 2px rgba(0,0,0,0.9)"
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
            <>
              {validOptions.map((_, index) => {
                const { path } = calculateSegmentData(index);
                return (
                  <path
                    key={`border-${index}`}
                    d={path}
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="0.5"
                    className="opacity-50"
                  />
                );
              })}
            </>
          )}
        </motion.svg>
      </div>
    </motion.div>
  );
}