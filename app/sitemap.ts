import { MetadataRoute } from 'next';
import { locales } from './i18n';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemap: MetadataRoute.Sitemap = [];

  // 各言語のページを追加
  locales.forEach((locale) => {
    sitemap.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: locale === 'ja' ? 1.0 : 0.8, // 日本語を優先
      alternates: {
        languages: locales.reduce((acc, lang) => {
          acc[lang] = `${baseUrl}/${lang}`;
          return acc;
        }, {} as Record<string, string>),
      },
    });
  });

  // ルートページ（リダイレクト用）
  sitemap.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.9,
  });

  return sitemap;
}