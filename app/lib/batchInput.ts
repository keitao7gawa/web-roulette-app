export function parseBatchInput(raw: string, limit = 200): string[] {
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^([-*+]\s+)/, '')) // unordered list markers
    .map((line) => line.replace(/^(\d+)[.)]\s+/, '')) // ordered list markers like 1. or 1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length > limit) return lines.slice(0, limit);
  return lines;
}
