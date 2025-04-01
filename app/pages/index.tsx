// 選択肢の入力フォーム部分
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
  // Enterキーで新しい選択肢を追加
  if (e.key === 'Enter') {
    e.preventDefault();
    addOption();
    // 追加後，次の入力欄にフォーカスを移動（タイマーで少し遅延させる）
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('input[name^="option-"]');
      if (inputs.length > index + 1) {
        inputs[index + 1].focus();
      }
    }, 10);
  }
  
  // 空の選択肢でBackspaceを押したときに削除
  if (e.key === 'Backspace' && options[index].trim() === '' && options.length > 1) {
    e.preventDefault();
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
    
    // 削除後，前の入力欄または最後の入力欄にフォーカス
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('input[name^="option-"]');
      const focusIndex = index === 0 ? 0 : index - 1;
      if (inputs.length > 0 && inputs[focusIndex]) {
        inputs[focusIndex].focus();
      }
    }, 10);
  }
};

// オプション入力フォーム
return (
  <div className="mb-4">
    <label className="block text-lg font-medium mb-2">選択肢</label>
    {options.map((option, index) => (
      <div key={index} className="flex items-center mb-2">
        <input
          type="text"
          name={`option-${index}`}
          value={option}
          onChange={(e) => handleOptionChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={`選択肢 ${index + 1}`}
        />
        <button
          type="button"
          onClick={() => removeOption(index)}
          className="ml-2 p-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          削除
        </button>
      </div>
    ))}
    <button
      type="button"
      onClick={addOption}
      className="mt-2 p-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
    >
      選択肢を追加
    </button>
  </div>
); 