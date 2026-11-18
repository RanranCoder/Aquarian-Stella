/**
 * JSON-LD 结构化数据组件
 * 为搜索引擎提供语义化站点信息，帮助生成富搜索结果。
 *
 * 注意：不要声明 SearchAction——/explore 是星座浏览页而非搜索页，
 * 错误的结构化数据会导致搜索引擎降低对整站标记的信任。
 */
export function JsonLd() {
  const BASE_URL = "https://stella.ranran.org.cn";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "星语星愿",
        alternateName: "Stella",
        url: BASE_URL,
        description:
          "一个属于年轻人的星象自我探索空间。今日星语、我的星盘、关系星图、我的星愿——把星星翻译成你可以理解、可以反思、可以记录的语言。",
        inLanguage: "zh-CN",
      },
      {
        "@type": "Organization",
        name: "星语星愿",
        url: BASE_URL,
        logo: `${BASE_URL}/favicon.svg`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
