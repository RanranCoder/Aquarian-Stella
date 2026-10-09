import type { MetadataRoute } from "next";
import { ZODIACS } from "@/data/zodiacs";

const BASE_URL = "https://stella.ranran.org.cn";

export default function sitemap(): MetadataRoute.Sitemap {
  // 静态页面
  const staticPages = [
    { path: "/", priority: 1, changeFreq: "weekly" as const },
    { path: "/today", priority: 0.9, changeFreq: "daily" as const },
    { path: "/chart", priority: 0.8, changeFreq: "monthly" as const },
    { path: "/wishes", priority: 0.7, changeFreq: "monthly" as const },
    { path: "/relationship", priority: 0.8, changeFreq: "monthly" as const },
    { path: "/explore", priority: 0.8, changeFreq: "weekly" as const },
    { path: "/mail", priority: 0.6, changeFreq: "monthly" as const },
  ];

  // 星座详情页（12个）
  const zodiacPages = ZODIACS.map((z) => ({
    path: `/explore/${z.slug}`,
    priority: 0.7 as const,
    changeFreq: "monthly" as const,
  }));

  const allPages = [...staticPages, ...zodiacPages];

  return allPages.map(({ path, priority, changeFreq }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: changeFreq,
    priority,
  }));
}