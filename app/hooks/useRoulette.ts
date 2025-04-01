import { useState, useRef, useMemo } from 'react';

// 型定義
interface RouletteOptions {
  options: string[];
  weights?: number[];
  colors: string[];
  onSegmentColorChange: (index: number, color: string) => void;
  onResultDetermined?: (result: string) => void;
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
const MAX_FONT_SIZE = 8;
const MIN_FONT_SIZE = 3;

export function useRoulette({
  options,
  weights,
  colors,
  onSegmentColorChange,
  onResultDetermined
}: RouletteOptions) {
  // 空のオプションを除外
  const validOptions = useMemo(() => {
    if (!options || options.length === 0) {
      return ['サンプル'];
    }
    return options.filter(option => option && option.trim() !== '');
  }, [options]);
  
  // 有効な選択肢の重みを取得
  const validWeights = useMemo(() => {
    if (!weights) return validOptions.map(() => 1);
    return options
      .map((option, index) => ({ option, weight: weights[index] || 1 }))
      .filter(item => item.option && item.option.trim() !== '')
      .map(item => item.weight);
  }, [validOptions, weights, options]);
  
  // 重みの合計を計算
  const totalWeight = useMemo(() => validWeights.reduce((sum, weight) => sum + weight, 0), [validWeights]);
  
  // 各セグメントの角度を計算
  const segmentAngles = useMemo(() => {
    if (totalWeight === 0) return validOptions.map(() => 360 / validOptions.length);
    return validWeights.map(weight => (weight / totalWeight) * 360);
  }, [validWeights, totalWeight, validOptions.length]);

  // フォントサイズの計算
  const fontSizes = useMemo(() => {
    return validOptions.map(option => {
      const textLength = option.length;
      const segmentAngle = segmentAngles[validOptions.indexOf(option)];
      
      const angleRatio = Math.min(1, segmentAngle / 45);
      const baseSegmentSize = MAX_FONT_SIZE * angleRatio;
      
      let sizeRatio;
      if (textLength <= 1) {
        sizeRatio = 1.0;
      } else if (textLength <= 3) {
        sizeRatio = 0.9;
      } else if (textLength <= 5) {
        sizeRatio = 0.8;
      } else if (textLength <= 8) {
        sizeRatio = 0.7;
      } else if (textLength <= 12) {
        sizeRatio = 0.6;
      } else if (textLength <= 16) {
        sizeRatio = 0.5;
      } else {
        sizeRatio = 0.4;
      }
      
      let size = baseSegmentSize * sizeRatio;
      
      const optionCountFactor = Math.max(0.45, Math.min(0.9, 5 / validOptions.length));
      size *= optionCountFactor;
      
      if (segmentAngle < 30) {
        size *= Math.max(0.45, segmentAngle / 30);
      }
      
      return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
    });
  }, [validOptions, segmentAngles]);

  const [rotation, setRotation] = useState<number>(0);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const prevRotationRef = useRef<number>(0);

  // 結果のインデックスを計算
  const calculateFinalIndex = (targetDegrees: number): number => {
    const normalizedDegrees = ((targetDegrees % 360) + 360) % 360;
    const needlePosition = 90;
    const relativeAngle = (needlePosition - normalizedDegrees + 360) % 360;
    
    let cumulativeAngle = 0;
    for (let i = 0; i < segmentAngles.length; i++) {
      cumulativeAngle += segmentAngles[i];
      if (relativeAngle < cumulativeAngle) {
        return i;
      }
    }
    
    return validOptions.length - 1;
  };

  // ルーレットの回転処理
  const startSpinning = () => {
    setIsSpinning(true);
    setShowResult(false);
    setHighlightedIndex(null);
    setSelectedIndex(null);

    // 最低10回転、最大25回転に大幅増加
    const spins = 10 + Math.floor(Math.random() * 16);
    const baseRotation = spins * 360;
    
    // 回転のばらつきを最大限に増加（0-1080度＝3周分）
    const extraRotation = Math.random() * 1080;
    
    const currentRotation = prevRotationRef.current;
    // 前回の回転量に加算して、新しい回転角度を設定
    const newRotation = currentRotation + baseRotation + extraRotation;
    
    setRotation(newRotation);
    prevRotationRef.current = newRotation;
  };

  // ルーレットが停止したときの処理
  const handleRouletteStop = (): void => {
    setIsSpinning(false);
    const finalIndex = calculateFinalIndex(rotation);
    
    setHighlightedIndex(finalIndex);
    setSelectedIndex(finalIndex);
    setShowResult(true);
    
    const selectedColor = colors[finalIndex % colors.length];
    onSegmentColorChange(finalIndex, selectedColor);
    
    if (onResultDetermined && finalIndex >= 0 && finalIndex < validOptions.length) {
      onResultDetermined(validOptions[finalIndex]);
    }
  };

  // 同じテキストを持つセグメントを検出
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

  // セグメントデータの計算
  const calculateSegmentData = (index: number): SegmentData => {
    let startAngle = 0;
    for (let i = 0; i < index; i++) {
      startAngle += segmentAngles[i];
    }
    const endAngle = startAngle + segmentAngles[index];
    
    const startX = CENTRAL_POINT + SEGMENT_RADIUS * Math.cos((startAngle - 90) * Math.PI / 180);
    const startY = CENTRAL_POINT + SEGMENT_RADIUS * Math.sin((startAngle - 90) * Math.PI / 180);
    const endX = CENTRAL_POINT + SEGMENT_RADIUS * Math.cos((endAngle - 90) * Math.PI / 180);
    const endY = CENTRAL_POINT + SEGMENT_RADIUS * Math.sin((endAngle - 90) * Math.PI / 180);
    
    const textAngle = (startAngle + endAngle) / 2;
    const textX = CENTRAL_POINT + TEXT_RADIUS * Math.cos((textAngle - 90) * Math.PI / 180);
    const textY = CENTRAL_POINT + TEXT_RADIUS * Math.sin((textAngle - 90) * Math.PI / 180);
    
    const segments = textSegmentMap.get(validOptions[index]) || [];
    const isDuplicateSegment = segments.length > 1;
    const duplicateIndex = segments.indexOf(index);
    
    const largeArcFlag = segmentAngles[index] > 180 ? 1 : 0;
    const path = `M ${CENTRAL_POINT} ${CENTRAL_POINT} L ${startX} ${startY} A ${SEGMENT_RADIUS} ${SEGMENT_RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    
    return {
      path,
      textX,
      textY,
      textRotation: textAngle + 90,
      color: colors[index],
      isDuplicate: isDuplicateSegment,
      duplicateIndex: duplicateIndex
    };
  };

  // テキストの表示形式を最適化
  const optimizeTextDisplay = (text: string, fontSize: number): string => {
    const maxLength = Math.floor(35 / (fontSize * 0.8));
    if (text.length > maxLength && maxLength > 3) {
      return text.substring(0, maxLength - 3) + '...';
    }
    return text;
  };

  return {
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
  };
} 