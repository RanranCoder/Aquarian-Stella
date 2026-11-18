import type { Metadata } from "next";
import { TodayPage } from "./today-view";

export const metadata: Metadata = {
  title: "今日星语",
  description:
    "每天一句专属星语：关键词、维度、星象与今日建议，陪你理解今天的自己。",
  alternates: { canonical: "/today" },
  // 个性化页：内容依赖登录用户的星盘，公开运势聚合页在 /horoscope
  robots: { index: false, follow: true },
};

export default function Page() {
  return <TodayPage />;
}
