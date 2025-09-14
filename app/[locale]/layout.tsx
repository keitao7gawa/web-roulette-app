import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

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
  
  return {
    metadataBase: new URL(baseUrl),
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: "website",
      url: "https://www.web-roulette-ex.jp/",
      siteName: t('siteName'),
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

export default function LocaleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
    </>
  );
}
