import type { Metadata } from "next";
import { Noto_Sans_JP, Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Webルーレット | Web Roulette EX",
  description: "無料で使える！重み付けできるルーレットアプリです．",
  openGraph: {
    title: "Webルーレット | Web Roulette EX",
    description: "無料で使える！重み付けできるルーレットアプリです．",
    type: "website",
    url: "https://www.web-roulette-ex.jp/",
    siteName: "Webルーレット | Web Roulette EX",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Webルーレット | Web Roulette EX",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Webルーレット | Web Roulette EX",
    description: "無料で使える！重み付けできるルーレットアプリです．",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${poppins.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
