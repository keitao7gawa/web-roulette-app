'use client';

import { motion } from 'framer-motion';
import { PlayIcon } from '@heroicons/react/24/solid';
import { useEffect, useState, useMemo, useRef } from 'react';

// 型定義
interface RouletteProps {
  options: string[];
  weights?: number[];  // 各選択肢の重み（省略可能）
  isSpinning: boolean;
  onSpin: () => void;
  onSegmentColorChange: (index: number, color: string) => void;
  colors: string[];
  onResultDetermined?: (result: string) => void; // 結果が決定したときに呼び出されるコールバック
}

interface SegmentData {
  path: string;
  textX: number;
  textY: number;
  textRotation: number;
  color: string;
  isDuplicate: boolean;
  duplicateIndex: number;
}

// 定数
const CENTRAL_POINT = 50;
const SEGMENT_RADIUS = 45;
const TEXT_RADIUS = 30;
const BASE_SPINS = 5; // 基本の回転数
const MIN_DURATION = 4; // 最小アニメーション時間（秒）
const MAX_DURATION = 6; // 最大アニメーション時間（秒）
const MAX_FONT_SIZE = 8; // 最大フォントサイズをさらに小さく（12→8）
const MIN_FONT_SIZE = 3; // 最小フォントサイズをさらに小さく（4→3）

export default function Roulette({ options, weights, isSpinning, onSpin, onSegmentColorChange, colors, onResultDetermined }: RouletteProps) {
  // 空のオプションを除外
  const validOptions = useMemo(() => {
    // optionsが未定義または空の場合はデフォルト値を返す
    if (!options || options.length === 0) {
      return ['サンプル'];
    }
    return options.filter(option => option && option.trim() !== '');
  }, [options]);
  
  // 有効な選択肢の重みを取得（指定がない場合はすべて1）
  const validWeights = useMemo(() => {
    if (!weights) return validOptions.map(() => 1);
    // optionsとweightsの有効なものだけを抽出
    return options
      .map((option, index) => ({ option, weight: weights[index] || 1 }))
      .filter(item => item.option && item.option.trim() !== '')
      .map(item => item.weight);
  }, [validOptions, weights, options]);
  
  // 重みの合計を計算
  const totalWeight = useMemo(() => validWeights.reduce((sum, weight) => sum + weight, 0), [validWeights]);
  
  // 各セグメントの角度を計算（重みに基づく）
  const segmentAngles = useMemo(() => {
    if (totalWeight === 0) return validOptions.map(() => 360 / validOptions.length);
    return validWeights.map(weight => (weight / totalWeight) * 360);
  }, [validWeights, totalWeight, validOptions.length]);
  
  // 選択肢ごとのフォントサイズを事前計算してキャッシュ
  const fontSizes = useMemo(() => {
    return validOptions.map(option => {
      // テキストの長さと選択肢の数の両方を考慮したフォントサイズの計算
      const textLength = option.length;
      const segmentAngle = segmentAngles[validOptions.indexOf(option)];
      
      // セグメント角度から基本サイズを決定（角度が小さいほど小さく）
      // 角度が45度未満の場合は、その比率に応じて最大サイズを調整
      const angleRatio = Math.min(1, segmentAngle / 45);
      const baseSegmentSize = MAX_FONT_SIZE * angleRatio;
      
      // テキスト長による補正（長いほど小さく）
      let sizeRatio;
      if (textLength <= 1) {
        // 1文字の場合
        sizeRatio = 1.0;
      } else if (textLength <= 3) {
        // 2-3文字
        sizeRatio = 0.9;
      } else if (textLength <= 5) {
        // 4-5文字
        sizeRatio = 0.8;
      } else if (textLength <= 8) {
        // 6-8文字
        sizeRatio = 0.7;
      } else if (textLength <= 12) {
        // 9-12文字
        sizeRatio = 0.6;
      } else if (textLength <= 16) {
        // 13-16文字
        sizeRatio = 0.5;
      } else {
        // 17文字以上
        sizeRatio = 0.4;
      }
      
      let size = baseSegmentSize * sizeRatio;
      
      // 選択肢の数による追加補正（選択肢が多いほど小さく）
      const optionCountFactor = Math.max(0.45, Math.min(0.9, 5 / validOptions.length));
      size *= optionCountFactor;
      
      // セグメントが小さすぎる場合（30度未満）は、さらに小さく調整
      if (segmentAngle < 30) {
        size *= Math.max(0.45, segmentAngle / 30);
      }
      
      // 最小・最大サイズの制限
      return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
    });
  }, [validOptions, segmentAngles]);

  const [rotation, setRotation] = useState<number>(0);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const prevRotationRef = useRef<number>(0);

  // 結果のインデックスを計算
  const calculateFinalIndex = (targetDegrees: number): number => {
    // 回転角度を0-359の範囲に正規化
    const normalizedDegrees = ((targetDegrees % 360) + 360) % 360;
    
    // 0度が真上、時計回りに増加する角度系で考える
    // 90度（右側）が針の位置になるように調整
    const needlePosition = 90; // 針の位置を右側（3時の位置）に変更
    const relativeAngle = (needlePosition - normalizedDegrees + 360) % 360;
    
    // 重みに基づくセグメント境界を計算
    let cumulativeAngle = 0;
    for (let i = 0; i < segmentAngles.length; i++) {
      cumulativeAngle += segmentAngles[i];
      if (relativeAngle < cumulativeAngle) {
        return i;
      }
    }
    
    // 万が一計算誤差などでどのセグメントにも属さない場合は最後のセグメントを返す
    return validOptions.length - 1;
  };

  // ルーレットの回転処理
  useEffect(() => {
    if (isSpinning) {
      // 結果表示をリセット
      setShowResult(false);
      setHighlightedIndex(null);
      setSelectedIndex(null);

      // ランダムなセグメントを選択
      const targetIndex = Math.floor(Math.random() * validOptions.length);
      
      // 針の位置（90度、右側）を基準に目標セグメントが来るための角度を計算
      const needlePosition = 90;
      
      // 目標セグメントまでの累積角度を計算
      let cumulativeAngle = 0;
      for (let i = 0; i < targetIndex; i++) {
        cumulativeAngle += segmentAngles[i];
      }
      
      // セグメント内の位置をランダムに選択（0〜セグメント角度の範囲）
      const segmentOffset = Math.random() * segmentAngles[targetIndex];
      
      // 目標位置の角度を計算
      const targetRotation = (needlePosition - (cumulativeAngle + segmentOffset) + 360) % 360;
      
      // 基本の回転数をよりランダムに（5〜10回転）
      const spins = 5 + Math.floor(Math.random() * 6);
      const baseRotation = spins * 360;
      
      // さらにランダム性を追加（追加の回転角度として±20度）
      const extraRotation = Math.random() * 40 - 20;
      
      // 前回の回転角度を取得し、新しい回転角度を計算
      const currentRotation = prevRotationRef.current;
      const newRotation = currentRotation + baseRotation + targetRotation + extraRotation;
      
      console.log(`回転開始 - 現在の角度: ${currentRotation}°`);
      console.log(`目標インデックス: ${targetIndex}`);
      console.log(`針の位置: ${needlePosition}°`);
      console.log(`累積角度: ${cumulativeAngle}°`);
      console.log(`セグメント角度: ${segmentAngles[targetIndex]}°`);
      console.log(`セグメント内オフセット: ${segmentOffset}°`);
      console.log(`目標回転角度: ${targetRotation}°`);
      console.log(`基本回転: ${baseRotation}°（${spins}回転）`);
      console.log(`追加回転: ${extraRotation}°`);
      console.log(`計算: ${currentRotation} + ${baseRotation} + ${targetRotation} + ${extraRotation}`);
      console.log(`最終角度: ${newRotation}°`);
      
      // 新しい回転角度を設定
      setRotation(newRotation);
      prevRotationRef.current = newRotation;
    }
  }, [isSpinning, segmentAngles, validOptions.length]);

  // ルーレットが停止したときの処理
  const handleRouletteStop = (): void => {
    // 最終的な回転角度から結果のインデックスを計算
    const finalIndex = calculateFinalIndex(rotation);
    console.log(`ルーレット停止 - 最終角度: ${rotation}°, 選択インデックス: ${finalIndex}`);
    
    // 結果を設定
    setHighlightedIndex(finalIndex);
    setSelectedIndex(finalIndex);
    setShowResult(true);
    
    // 選択されたセグメントの色を親コンポーネントに通知
    const selectedColor = colors[finalIndex % colors.length];
    onSegmentColorChange(finalIndex, selectedColor);
    
    // 結果を親コンポーネントに通知
    if (onResultDetermined && finalIndex >= 0 && finalIndex < validOptions.length) {
      onResultDetermined(validOptions[finalIndex]);
    }
  };
  
  // 同じテキストを持つセグメントを検出するためのマップを作成
  const textSegmentMap = useMemo(() => {
    const map = new Map<string, number[]>();
    
    validOptions.forEach((text, index) => {
      if (!map.has(text)) {
        map.set(text, [index]);
      } else {
        map.get(text)?.push(index);
      }
    });
    
    return map;
  }, [validOptions]);

  // 分割された選択肢があるかどうかを確認
  const hasSplitOptions = useMemo(() => {
    return Array.from(textSegmentMap.values()).some(indices => indices.length > 1);
  }, [textSegmentMap]);

  // セグメントデータの計算
  const calculateSegmentData = (index: number): SegmentData => {
    // 各セグメントの開始角度と終了角度を計算
    let startAngle = 0;
    for (let i = 0; i < index; i++) {
      startAngle += segmentAngles[i];
    }
    const endAngle = startAngle + segmentAngles[index];
    
    // 円弧の開始点と終了点を計算
    const startX = CENTRAL_POINT + SEGMENT_RADIUS * Math.cos((startAngle - 90) * Math.PI / 180);
    const startY = CENTRAL_POINT + SEGMENT_RADIUS * Math.sin((startAngle - 90) * Math.PI / 180);
    const endX = CENTRAL_POINT + SEGMENT_RADIUS * Math.cos((endAngle - 90) * Math.PI / 180);
    const endY = CENTRAL_POINT + SEGMENT_RADIUS * Math.sin((endAngle - 90) * Math.PI / 180);
    
    // テキストの位置を計算（中心角）
    const textAngle = (startAngle + endAngle) / 2;
    const textX = CENTRAL_POINT + TEXT_RADIUS * Math.cos((textAngle - 90) * Math.PI / 180);
    const textY = CENTRAL_POINT + TEXT_RADIUS * Math.sin((textAngle - 90) * Math.PI / 180);
    
    // 分割されたセグメントの表示を調整（同じテキストを持つセグメントを検出）
    const segments = textSegmentMap.get(validOptions[index]) || [];
    const isDuplicateSegment = segments.length > 1;
    const duplicateIndex = segments.indexOf(index);
    
    // 円弧のパスを生成
    const largeArcFlag = segmentAngles[index] > 180 ? 1 : 0;
    const path = `M ${CENTRAL_POINT} ${CENTRAL_POINT} L ${startX} ${startY} A ${SEGMENT_RADIUS} ${SEGMENT_RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    
    // ここで色を特定のセグメントに対して適用
    // 外部から渡されたcolorsを使用するため、インデックスに基づいた計算は行わない
    const segmentColor = colors[index];
    
    return {
      path,
      textX,
      textY,
      textRotation: textAngle + 90, // テキストが正しく表示されるように回転
      color: segmentColor,
      isDuplicate: isDuplicateSegment,
      duplicateIndex: duplicateIndex
    };
  };
  
  // テキストの表示形式を最適化
  const optimizeTextDisplay = (text: string, fontSize: number): string => {
    // 文字数が多すぎる場合、短縮表示
    // フォントサイズが小さいほど表示できる文字数を増やす
    const maxLength = Math.floor(35 / (fontSize * 0.8));
    if (text.length > maxLength && maxLength > 3) {
      return text.substring(0, maxLength - 3) + '...';
    }
    return text;
  };
  
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
            ease: [0.32, 0.72, 0.35, 1.0], // カスタムイージング
            onComplete: handleRouletteStop
          }}
        >
          {validOptions.map((option, index) => {
            const { path, textX, textY, textRotation, color, isDuplicate, duplicateIndex } = calculateSegmentData(index);
            
            // 強調表示の条件：停止後かつハイライトインデックスと一致する場合
            const isHighlighted = highlightedIndex === index;
            
            // キャッシュされたフォントサイズを使用
            const baseFontSize = fontSizes[index];
            // ハイライト時は少し大きくする
            const fontSize = isHighlighted ? baseFontSize * 1.25 : baseFontSize;
            
            // テキスト表示の最適化（空文字列のチェックを追加）
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
            onClick={onSpin}
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

// カラー操作ヘルパー関数
function getHueFromColor(color: string): number {
  // 簡易的な実装：16進カラーコードからHSLのHue値を推定
  const r = parseInt(color.substr(1, 2), 16) / 255;
  const g = parseInt(color.substr(3, 2), 16) / 255;
  const b = parseInt(color.substr(5, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  let h = 0;
  
  if (max === min) {
    h = 0; // 無彩色
  } else if (max === r) {
    h = 60 * (0 + (g - b) / (max - min));
  } else if (max === g) {
    h = 60 * (2 + (b - r) / (max - min));
  } else {
    h = 60 * (4 + (r - g) / (max - min));
  }
  
  if (h < 0) h += 360;
  
  return Math.round(h);
}

function getSaturationFromColor(color: string): number {
  const r = parseInt(color.substr(1, 2), 16) / 255;
  const g = parseInt(color.substr(3, 2), 16) / 255;
  const b = parseInt(color.substr(5, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  if (max === min) {
    return 0;
  } else {
    return Math.round(((max - min) / (1 - Math.abs(2 * l - 1))) * 100);
  }
}

function getLightnessFromColor(color: string): number {
  const r = parseInt(color.substr(1, 2), 16) / 255;
  const g = parseInt(color.substr(3, 2), 16) / 255;
  const b = parseInt(color.substr(5, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  return Math.round(((max + min) / 2) * 100);
}