import type { Metadata } from "next";
import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { SparkleIcon } from "@/components/icons";
import { ZODIACS } from "@/data/zodiacs";
import { getPublicHoroscope, cnDateStr } from "@/lib/horoscope";
import { formatDateCN } from "@/lib/format";

// 每小时增量重渲染：跨午夜后最多 1 小时内更新为新的「今日」
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const dateStr = cnDateStr();
  return {
    title: `今日星座运势（${formatDateCN(dateStr)}）· 十二星座每日星语`,
    description: `${formatDateCN(dateStr)}十二星座今日运势：白羊座、金牛座、双子座……每个星座今天的星语、聚焦领域、幸运色与幸运数字，每天更新。`,
    alternates: { canonical: "/horoscope" },
  };
}

export default function HoroscopePage() {
  const dateStr = cnDateStr();
  const items = ZODIACS.map((z) => ({
    zodiac: z,
    horoscope: getPublicHoroscope(z, dateStr),
  }));

  // 聚合页结构化数据：12 星座运势条目
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `十二星座今日运势（${formatDateCN(dateStr)}）`,
    itemListElement: items.map(({ zodiac }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${zodiac.name}今日运势`,
      url: `https://stella.ranran.org.cn/explore/${zodiac.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pt-12 pb-24 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      {/* 头部 */}
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs tracking-[0.3em] text-moon-500">
          {formatDateCN(dateStr)} · 每日更新
        </p>
        <h1 className="display-zh text-balance text-4xl md:text-5xl">
          十二星座今日运势
        </h1>
        <p className="max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-moon-400">
          每天一句星语，把星星翻译成你能理解的话。想看更准的专属版本，用出生信息生成你的星盘即可。
        </p>
      </div>

      {/* 十二星座运势卡片 */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ zodiac, horoscope }) => (
          <GlassCard key={zodiac.slug} glow="none" className="h-full">
            <article className="flex h-full flex-col gap-3 p-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl text-gold-300">{zodiac.symbol}</span>
                <div>
                  <h2 className="display-zh text-lg text-moon-100">{zodiac.name}</h2>
                  <p className="text-xs text-moon-500">
                    {zodiac.en} · {zodiac.dateRange}
                  </p>
                </div>
              </div>

              <p className="display-zh text-pretty text-lg leading-relaxed text-moon-100">
                {horoscope.headline}
              </p>
              <p className="text-pretty text-sm leading-relaxed text-moon-400">
                {horoscope.body}
              </p>

              <div className="mt-auto flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-moon-500">
                  <span className="rounded-full border border-hairline px-2.5 py-1">
                    聚焦 · {horoscope.focus}
                  </span>
                  <span className="rounded-full border border-hairline px-2.5 py-1">
                    幸运色 · {horoscope.luckyColor}
                  </span>
                  <span className="rounded-full border border-hairline px-2.5 py-1">
                    幸运数字 · {horoscope.luckyNumber}
                  </span>
                </div>
                <Link
                  href={`/explore/${zodiac.slug}`}
                  className="group flex items-center gap-1.5 text-sm text-lav-300 transition-colors hover:text-gold-300"
                >
                  <SparkleIcon className="h-3.5 w-3.5" />
                  {zodiac.name}性格·爱情·事业解读
                </Link>
              </div>
            </article>
          </GlassCard>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-14">
        <GlassCard glow="gold">
          <div className="flex flex-col items-center gap-5 px-card py-8 text-center">
            <p className="display-zh text-xl">这是属于 12 星座的今天，你的呢？</p>
            <p className="max-w-md text-sm leading-relaxed text-moon-400">
              登录后填写出生信息，Stella 会根据你的太阳、月亮与上升，
              生成只属于你的今日星语。
            </p>
            <StarButton href="/onboarding" arrow>
              生成我的专属星语
            </StarButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
