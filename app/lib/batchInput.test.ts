import { describe, it, expect } from 'vitest';
import { parseBatchInput } from './batchInput';

describe('parseBatchInput', () => {
  it('parses dash list', () => {
    const raw = `- りんご\n- バナナ\n- みかん`;
    expect(parseBatchInput(raw)).toEqual(['りんご', 'バナナ', 'みかん']);
  });

  it('parses plain lines', () => {
    const raw = `りんご\nバナナ\nみかん`;
    expect(parseBatchInput(raw)).toEqual(['りんご', 'バナナ', 'みかん']);
  });

  it('parses ordered list with numbers', () => {
    const raw = `1. りんご\n2) バナナ\n3. みかん`;
    expect(parseBatchInput(raw)).toEqual(['りんご', 'バナナ', 'みかん']);
  });

  it('ignores empty lines and trims', () => {
    const raw = `\n  - りんご  \n\n* バナナ\n  \n+ みかん`;
    expect(parseBatchInput(raw)).toEqual(['りんご', 'バナナ', 'みかん']);
  });

  it('limits number of lines', () => {
    const raw = Array.from({ length: 250 }, (_, i) => `item ${i + 1}`).join('\n');
    const out = parseBatchInput(raw, 200);
    expect(out.length).toBe(200);
    expect(out[0]).toBe('item 1');
    expect(out[199]).toBe('item 200');
  });

  it('returns empty for empty input', () => {
    expect(parseBatchInput('')).toEqual([]);
  });
});
