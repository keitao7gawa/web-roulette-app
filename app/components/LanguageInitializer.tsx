'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function LanguageInitializer() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') return;

    const savedLanguage = localStorage.getItem('preferred-language');
    
    // 保存された言語設定があり、現在のロケールと異なる場合
    if (savedLanguage && savedLanguage !== locale) {
      // 現在のパスから言語部分を置き換え
      const newPath = pathname.replace(`/${locale}`, `/${savedLanguage}`);
      
      // 同じページ内での遷移の場合は、リロードを避ける
      if (newPath !== pathname) {
        router.push(newPath);
      }
    }
  }, [locale, pathname, router]);

  return null; // このコンポーネントは何もレンダリングしない
}