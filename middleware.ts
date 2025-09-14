import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './app/i18n';

export default createMiddleware({
  // 対応言語リスト
  locales,
  
  // デフォルト言語
  defaultLocale,
  
  // 言語検出を有効化
  localeDetection: true,
  
  // カスタム言語検出ロジック
  localeDetection: (request) => {
    // Cookieから言語設定を取得
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    if (cookieLocale && locales.includes(cookieLocale as any)) {
      return cookieLocale;
    }
    
    // Accept-Languageヘッダーから言語を検出
    const acceptLanguage = request.headers.get('accept-language');
    if (acceptLanguage) {
      const preferredLanguages = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim().toLowerCase());
      
      for (const lang of preferredLanguages) {
        // 完全一致
        if (locales.includes(lang as any)) {
          return lang;
        }
        // 言語コードのみ一致（例: en-US -> en）
        const langCode = lang.split('-')[0];
        if (locales.includes(langCode as any)) {
          return langCode;
        }
      }
    }
    
    return defaultLocale;
  }
});

export const config = {
  // ミドルウェアを実行するパス
  matcher: [
    // ルートパスを除外
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // ルートパスを含める
    '/'
  ]
};