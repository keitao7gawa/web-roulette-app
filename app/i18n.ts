import { getRequestConfig } from 'next-intl/server';

// 対応言語の定義
export const locales = ['ja', 'en', 'ko', 'pt'] as const;
export type Locale = (typeof locales)[number];

// デフォルト言語
export const defaultLocale: Locale = 'ja';

// 言語検証関数
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// next-intl設定
export default getRequestConfig(async ({ locale }) => {
  // デフォルト言語にフォールバック
  const validLocale = isValidLocale(locale) ? locale : defaultLocale;

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default
  };
});