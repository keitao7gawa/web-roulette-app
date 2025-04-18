/**
 * ルーレットのセグメントで使用するカラーパレット
 * スタイリッシュでクールな印象を与える20色以上のカラーパレット
 */
export const COLORS = [
  '#3A86FF', // ブルー
  '#FF006E', // ディープピンク
  '#00F5D4', // ターコイズ
  '#8338EC', // バイオレット
  '#FB5607', // オレンジ
  '#06D6A0', // ミントグリーン
  '#FFBE0B', // ゴールド
  '#1E88E5', // ブライトブルー
  '#D81B60', // ダークピンク
  '#43A047', // グリーン
  '#8E24AA', // パープル
  '#7E57C2', // ラベンダー
  '#26A69A', // ティール
  '#EF6C00', // ダークオレンジ
  '#5E35B1', // ディープパープル
  '#2196F3', // ライトブルー
  '#F50057', // マゼンタ
  '#00BCD4', // シアン
  '#FF3D00', // ディープオレンジ
  '#009688', // ティールグリーン
  '#651FFF', // インディゴ
  '#F44336', // レッド
  '#2979FF', // アクセントブルー
  '#00B0FF', // ライトブルー
] as const;

/**
 * カラーパレットから色を取得する
 * @param index インデックス
 * @returns 色のHEX値
 */
export function getColor(index: number): string {
  return COLORS[index % COLORS.length];
} 