import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './app/i18n';

export default createMiddleware({
  // 対応言語リスト
  locales,
  
  // デフォルト言語
  defaultLocale,
  
  // 言語検出を有効化
  localeDetection: true
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