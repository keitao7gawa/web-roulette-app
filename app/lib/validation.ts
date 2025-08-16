import type { Option } from '../types/option';

export function hasEmptyOption(options: Option[]): boolean {
  return options.some((opt) => !opt.text || opt.text.trim() === '');
}
