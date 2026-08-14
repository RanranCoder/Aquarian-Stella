import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CosmicBackground } from "@/components/CosmicBackground";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
  },
};

export default function RootLayout(props: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-dvh">
        <CosmicBackground />
        <SiteNav />
        <main className="relative z-10">{props.children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
