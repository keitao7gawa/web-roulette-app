import type { Option } from '../types/option';

export function hasEmptyOption(options: Option[]): boolean {
  return options.some((opt) => !opt.text || opt.text.trim() === '');
}

export function validateWeight(value: number, min = 0.1, max = 100): boolean {
  return typeof value === 'number' && !Number.isNaN(value) && value >= min && value <= max;
}

export function normalizeWeight(value: number, min = 0.1, max = 100, precision = 1): number {
  const clamped = Math.max(min, Math.min(max, value));
  const factor = Math.pow(10, precision);
  return Math.round(clamped * factor) / factor;
}
