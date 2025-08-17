export function loadExcluded(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('roulette:excluded-ids');
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function saveExcluded(excluded: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const dedup = Array.from(new Set(excluded.filter((v) => typeof v === 'string')));
    window.localStorage.setItem('roulette:excluded-ids', JSON.stringify(dedup));
  } catch {
    // no-op
  }
}
