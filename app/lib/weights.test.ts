import { describe, it, expect } from 'vitest';
import type { Option } from '../types/option';
import {
  normalizeWeights,
  redistributeWeights,
  equalizeWeights,
  shuffleOptions,
  processForDisplay,
} from './weights';

function opts(values: Array<[string, number]>): Option[] {
  return values.map(([text, weight]) => ({ text, weight }));
}

describe('weights utils', () => {
  it('normalizeWeights keeps total ~100 among valid options', () => {
    const input = opts([
      ['A', 30],
      ['B', 30],
      [' ', 40], // invalid (empty)
    ]);
    const out = normalizeWeights(input);
    const total = out.filter(o => o.text.trim() !== '').reduce((s, o) => s + o.weight, 0);
    expect(Math.abs(total - 100)).toBeLessThan(0.001 + 1e-9);
  });

  it('equalizeWeights distributes evenly among valid options', () => {
    const input = opts([
      ['A', 10],
      ['B', 90],
      ['', 0],
    ]);
    const out = equalizeWeights(input);
    const valid = out.filter(o => o.text.trim() !== '');
    expect(valid.length).toBe(2);
    // first not necessarily exactly equal due to rounding on last element
    const w0 = valid[0].weight;
    const w1 = valid[1].weight;
    expect(Math.abs(w0 + w1 - 100)).toBeLessThan(0.001 + 1e-9);
    expect(w0).toBeGreaterThan(0);
    expect(w1).toBeGreaterThan(0);
  });

  it('redistributeWeights adds weight when becoming valid', () => {
    const input = opts([
      ['', 0],
      ['B', 100],
    ]);
    const out = redistributeWeights(input, 0, true);
    const total = out.reduce((s, o) => s + o.weight, 0);
    expect(Math.abs(total - 100)).toBeLessThan(0.001 + 1e-9);
    expect(out[0].weight).toBeGreaterThan(0);
    expect(out[1].weight).toBeGreaterThan(0);
  });

  it('redistributeWeights shifts weight away when becoming invalid', () => {
    const input = opts([
      ['A', 40],
      ['B', 60],
    ]);
    const out = redistributeWeights(input, 0, false);
    expect(out[0].weight).toBe(0);
    expect(Math.abs(out[1].weight - 100)).toBeLessThan(0.001 + 1e-9);
  });

  it('shuffleOptions keeps all valid first and empties at end', () => {
    const input = opts([
      ['A', 50],
      ['', 0],
      ['B', 50],
      [' ', 0],
    ]);
    const out = shuffleOptions(input);
    const firstInvalidIndex = out.findIndex(o => o.text.trim() === '');
    const lastValidIndex = out.map(o => o.text.trim() !== '').lastIndexOf(true);
    expect(firstInvalidIndex === -1 || firstInvalidIndex > lastValidIndex).toBe(true);
  });

  it('processForDisplay returns placeholder when no valid options', () => {
    const input = opts([
      ['', 0],
    ]);
    const processed = processForDisplay(input, (i) => `color-${i}`);
    expect(processed.processedOptions[0]).toBe('オプションを入力してください');
    expect(processed.processedWeights[0]).toBe(100);
    expect(processed.processedColors[0]).toBe('color-0');
  });

  it('processForDisplay may split heavy options and keeps colors aligned', () => {
    const input = opts([
      ['A', 80],
      ['B', 20],
    ]);
    const processed = processForDisplay(input, (i) => `c${i}`);
    expect(processed.processedOptions.length).toBeGreaterThanOrEqual(2);
    expect(processed.processedColors.length).toBe(processed.processedOptions.length);
  });
});
