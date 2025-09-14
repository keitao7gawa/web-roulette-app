import type { Metadata } from "next";
import { getTranslations, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { locales } from '../i18n';

// ベースURLの設定（環境に応じて動的に設定）
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  // hreflangタグを生成
  const alternateLanguages: Record<string, string> = {};
  locales.forEach(lang => {
    alternateLanguages[lang] = `${baseUrl}/${lang}`;
  });
  
  return {
    metadataBase: new URL(baseUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: alternateLanguages,
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: "website",
      url: `${baseUrl}/${locale}`,
      siteName: t('siteName'),
      locale: locale,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t('title'),
      description: t('description'),
      images: ["/og-image.png"],
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
