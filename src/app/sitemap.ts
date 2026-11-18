import type { MetadataRoute } from "next";
import { ZODIACS } from "@/data/zodiacs";
import { ALL_PAIRS } from "@/lib/match";

const BASE_URL = "https://stella.ranran.org.cn";

// 内容最后一次显著更新的日期；更新星座/运势数据时同步更新此日期。
// 避免每次构建都输出新的 lastModified，让搜索引擎失去对时间戳的信任。
const LAST_CONTENT_UPDATE = new Date("2026-11-18");

export default function sitemap(): MetadataRoute.Sitemap {
  // 仅包含公开可索引页面。
  // 登录后的个性化工具页（/today /chart /wishes /mail /relationship /profile）为 noindex，不进入 sitemap。
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: LAST_CONTENT_UPDATE,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      // 公开运势聚合页：内容按日期确定性生成，每日刷新
      url: `${BASE_URL}/horoscope`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: LAST_CONTENT_UPDATE,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/match`,
      lastModified: LAST_CONTENT_UPDATE,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // 星座详情页（12 个）：主体内容稳定，仅「今日星语」区块每日变化
  const zodiacPages: MetadataRoute.Sitemap = ZODIACS.map((z) => ({
    url: `${BASE_URL}/explore/${z.slug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // 星座配对页（66 个）
  const matchPages: MetadataRoute.Sitemap = ALL_PAIRS().map((p) => ({
    url: `${BASE_URL}/match/${p.slug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...zodiacPages, ...matchPages];
}
