import type { Option } from "../types/option";

export function normalizeWeights(optionsList: Option[]): Option[] {
  const options = optionsList.map(o => ({ ...o }));
  const validOptions = options.filter(opt => opt.text.trim() !== "");
  const totalWeight = validOptions.reduce((sum, opt) => sum + opt.weight, 0);

  if (totalWeight === 0 || Math.abs(totalWeight - 100) < 0.001) return options;

  const scale = 100 / totalWeight;

  // 調整時は validOptions の順序を維持し、最後で丸め誤差を吸収
  validOptions.forEach((opt, index) => {
    const originalIndex = options.findIndex(o => o === opt);
    if (originalIndex >= 0) {
      if (index === validOptions.length - 1) {
        const otherSum = validOptions
          .slice(0, validOptions.length - 1)
          .reduce((sum, o) => {
            const idx = options.findIndex(opt => opt === o);
            return sum + (idx >= 0 ? options[idx].weight : 0);
          }, 0);
        options[originalIndex].weight = Math.round((100 - otherSum) * 1000) / 1000;
      } else {
        options[originalIndex].weight = Math.round((opt.weight * scale) * 1000) / 1000;
      }
    }
  });

  return options;
}

export function redistributeWeights(optionsList: Option[], changedIndex: number, isNewValid: boolean): Option[] {
  const options = optionsList.map(o => ({ ...o }));

  const validIndices = options
    .map((opt, i) => (i !== changedIndex && opt.text.trim() !== "" ? i : -1))
    .filter(i => i !== -1);

  if (isNewValid) {
    if (validIndices.length > 0) {
      const totalToShare = 100;
      const newWeight = Math.floor((totalToShare / (validIndices.length + 1)) * 1000) / 1000;
      const remainder = totalToShare - (newWeight * (validIndices.length + 1));

      validIndices.forEach(i => {
        options[i].weight = newWeight;
      });
      options[changedIndex].weight = newWeight + remainder;
    } else {
      options[changedIndex].weight = 100;
    }
  } else {
    const weightToRedistribute = options[changedIndex].weight;

    if (validIndices.length > 0 && weightToRedistribute > 0) {
      const weightPerOption = Math.floor((weightToRedistribute / validIndices.length) * 1000) / 1000;
      const remainder = weightToRedistribute - (weightPerOption * validIndices.length);

      validIndices.forEach((i, index) => {
        options[i].weight += weightPerOption + (index === 0 ? remainder : 0);
      });
    }

    options[changedIndex].weight = 0;
  }

  return normalizeWeights(options);
}

export function equalizeWeights(optionsList: Option[]): Option[] {
  const options = optionsList.map(o => ({ ...o }));
  const validOptions = options.filter(opt => opt.text.trim() !== "");
  const validCount = validOptions.length;
  if (validCount <= 1) return options;

  const equalWeight = Math.floor((100 / validCount) * 1000) / 1000;

  validOptions.forEach((opt, index) => {
    const originalIndex = options.findIndex(o => o === opt);
    if (originalIndex >= 0) {
      if (index === validOptions.length - 1) {
        const otherSum = validOptions
          .slice(0, validOptions.length - 1)
          .reduce((sum, o) => {
            const idx = options.findIndex(opt => opt === o);
            return sum + (idx >= 0 ? options[idx].weight : 0);
          }, 0);
        options[originalIndex].weight = Math.round((100 - otherSum) * 1000) / 1000;
      } else {
        options[originalIndex].weight = equalWeight;
      }
    }
  });

  options.forEach(opt => {
    if (opt.text.trim() === "") {
      opt.weight = 0;
    }
  });

  return options;
}

export function shuffleOptions(optionsList: Option[]): Option[] {
  const validOptions = optionsList.filter(opt => opt.text.trim() !== "");
  const emptyOptions = optionsList.filter(opt => opt.text.trim() === "");
  if (validOptions.length <= 1) return optionsList.slice();

  const shuffled = [...validOptions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return [...shuffled, ...emptyOptions];
}

export interface ProcessedDisplay {
  processedOptions: string[];
  processedWeights: number[];
  processedColors: string[];
  // 各processed要素が元のoptionsList（有効配列）内のどのインデックス由来か
  processedSourceIndices: number[];
}

export function processForDisplay(optionsList: Option[], colorResolver: (_index: number) => string, noOptionsText: string = "オプションを入力してください"): ProcessedDisplay {
  const validOptions = optionsList.filter(opt => opt.text.trim() !== "");
  
  if (validOptions.length === 0) {
    return {
      processedOptions: [noOptionsText],
      processedWeights: [100],
      processedColors: [colorResolver(0)],
      processedSourceIndices: [0]
    };
  }

  // シンプルな処理：分割ロジックを削除
  const processedOptions = validOptions.map(opt => opt.text);
  const processedWeights = validOptions.map(opt => opt.weight);
  const processedColors = validOptions.map((_, index) => colorResolver(index));
  const processedSourceIndices = validOptions.map((_, index) => index);

  return {
    processedOptions,
    processedWeights,
    processedColors,
    processedSourceIndices
  };
}
