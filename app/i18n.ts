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

  let messages;
  try {
    switch (validLocale) {
      case 'ja':
        messages = (await import('../messages/ja.json')).default;
        break;
      case 'en':
        messages = (await import('../messages/en.json')).default;
        break;
      case 'ko':
        messages = (await import('../messages/ko.json')).default;
        break;
      case 'pt':
        messages = (await import('../messages/pt.json')).default;
        break;
      default:
        messages = (await import('../messages/ja.json')).default;
    }
  } catch (error) {
    console.error('Failed to load messages for locale:', validLocale, error);
    messages = (await import('../messages/ja.json')).default;
  }

  return {
    locale: validLocale,
    messages
  };
});