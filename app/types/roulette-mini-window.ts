export interface RouletteMiniWindowProps {
  options: string[];
  weights: number[];
  colors: string[];
  isVisible: boolean; // Intersection Observer で制御
}

export interface RouletteSegmentData {
  path: string;
  textX: number;
  textY: number;
  textRotation: number;
  color: string;
}

export interface RouletteMiniWindowState {
  isVisible: boolean;
  isAnimating: boolean;
}