import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CosmicBackground } from "@/components/CosmicBackground";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SyncProvider } from "@/components/SyncProvider";
import { JsonLd } from "@/components/JsonLd";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stella.ranran.org.cn"),
  title: {
    default: "星语星愿 · 看见星象，也看见自己",
    template: "%s · 星语星愿",
  },
  description:
    "一个属于年轻人的星象自我探索空间。今日星语、我的星盘、关系星图、我的星愿——把星星翻译成你可以理解、可以反思、可以记录的语言。",
  keywords: [
    "星语星愿",
    "星座",
    "今日星语",
    "我的星盘",
    "上升星座",
    "月亮星座",
    "星座配对",
    "星愿",
  ],
  openGraph: {
    title: "星语星愿 · 看见星象，也看见自己",
    description: "一个属于年轻人的星象自我探索空间",
    locale: "zh_CN",
    type: "website",
    siteName: "星语星愿",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "星语星愿 · 看见星象，也看见自己",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "星语星愿 · 看见星象，也看见自己",
    description: "一个属于年轻人的星象自我探索空间",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080a12",
};

export default function RootLayout(props: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-dvh">
        <JsonLd />
        <SyncProvider />
        <CosmicBackground />
        <SiteNav />
        <main className="relative z-10">{props.children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
