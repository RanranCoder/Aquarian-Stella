/**
 * JSON-LD 结构化数据组件
 * 为搜索引擎提供语义化站点信息，帮助生成富搜索结果。
 */
export function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "星语星愿",
    url: "https://stella.ranran.org.cn",
    description:
      "一个属于年轻人的星象自我探索空间。今日星语、我的星盘、关系星图、我的星愿——把星星翻译成你可以理解、可以反思、可以记录的语言。",
    inLanguage: "zh-CN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate:
          "https://stella.ranran.org.cn/explore/{search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}