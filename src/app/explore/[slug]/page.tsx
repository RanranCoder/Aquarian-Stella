import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { ArrowRightIcon, SparkleIcon } from "@/components/icons";
import { getZodiacBySlug, ZODIACS, ELEMENT_META } from "@/data/zodiacs";
import { getDailyHoroscope } from "@/lib/daily";
import { localDateStr, formatDateCN } from "@/lib/format";
import { getZodiacExtras } from "@/lib/zodiac-content";

const BASE_URL = "https://stella.ranran.org.cn";

export function generateStaticParams() {
  return ZODIACS.map((z) => ({ slug: z.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/explore/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const zodiac = getZodiacBySlug(slug);
  if (!zodiac) return {};
  return {
    title: `${zodiac.name}性格、爱情与事业 · 十二星座`,
    description: `${zodiac.name}${zodiac.en}（${zodiac.dateRange}），${zodiac.elementLabel}，守护星${zodiac.rulingPlanet}。${zodiac.personality}${zodiac.love}查看今日星语与配对。`,
    alternates: {
      canonical: `https://stella.ranran.org.cn/explore/${slug}`,
    },
  };
}

export default async function ZodiacDetailPage({
  params,
}: PageProps<"/explore/[slug]">) {
  const { slug } = await params;
  const zodiac = getZodiacBySlug(slug);
  if (!zodiac) notFound();

  const element = ELEMENT_META[zodiac.element];
  const today = localDateStr();
  const daily = getDailyHoroscope(zodiac, today);
  const extras = getZodiacExtras(zodiac);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: extras.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "十二星座探索", item: `${BASE_URL}/explore` },
      {
        "@type": "ListItem",
        position: 3,
        name: zodiac.name,
        item: `${BASE_URL}/explore/${zodiac.slug}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* 头部 */}
      <GlassCard glow="lav" className="mb-6">
        <div className="flex flex-col items-center gap-5 p-card text-center md:p-10">
          <span className="text-6xl text-gold-300">{zodiac.symbol}</span>
          <div>
            <h1 className="display-zh text-4xl md:text-5xl">{zodiac.name}</h1>
            <p className="mt-1 text-moon-400">
              {zodiac.en} · {zodiac.dateRange}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className={`rounded-full border border-hairline px-3 py-1 text-sm ${element.color}`}>
              {element.label}
            </span>
            <span className="rounded-full border border-hairline px-3 py-1 text-sm text-moon-300">
              守护星 · {zodiac.rulingPlanet}
            </span>
          </div>
          <p className="max-w-md text-sm italic leading-relaxed text-moon-300">
            “{zodiac.motto}”
          </p>
        </div>
      </GlassCard>

      {/* 关键词 */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {zodiac.keywords.map((k) => (
          <span
            key={k}
            className="rounded-full border border-hairline bg-white/[0.04] px-4 py-1.5 text-sm text-lav-200"
          >
            {k}
          </span>
        ))}
      </div>

      {/* 性格 */}
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-4 p-card">
          <h2 className="text-sm tracking-[0.18em] text-lav-300">性格</h2>
          <p className="leading-relaxed text-moon-300">{zodiac.personality}</p>
        </div>
      </GlassCard>

      {/* 爱情 */}
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-4 p-card">
          <h2 className="text-sm tracking-[0.18em] text-moon-500">爱情</h2>
          <p className="leading-relaxed text-moon-300">{zodiac.love}</p>
        </div>
      </GlassCard>

      {/* 事业 */}
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-4 p-card">
          <h2 className="text-sm tracking-[0.18em] text-moon-500">事业</h2>
          <p className="leading-relaxed text-moon-300">{zodiac.career}</p>
        </div>
      </GlassCard>

      {/* 优点与缺点 */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <GlassCard glow="none" className="h-full">
          <div className="flex h-full flex-col gap-3 p-card">
            <h2 className="text-sm tracking-[0.18em] text-gold-300">优点</h2>
            <ul className="flex flex-col gap-2.5">
              {extras.pros.map((p) => (
                <li key={p} className="flex gap-2 text-sm leading-relaxed text-moon-300">
                  <span className="shrink-0 text-gold-300">✦</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
        <GlassCard glow="none" className="h-full">
          <div className="flex h-full flex-col gap-3 p-card">
            <h2 className="text-sm tracking-[0.18em] text-moon-500">需要注意</h2>
            <ul className="flex flex-col gap-2.5">
              {extras.cons.map((c) => (
                <li key={c} className="flex gap-2 text-sm leading-relaxed text-moon-300">
                  <span className="shrink-0 text-moon-500">◇</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </div>

      {/* 上升与月亮 */}
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-4 p-card">
          <h2 className="text-sm tracking-[0.18em] text-moon-500">
            上升星座与月亮星座
          </h2>
          <p className="leading-relaxed text-moon-300">{extras.rising}</p>
          <p className="leading-relaxed text-moon-300">{extras.moon}</p>
          <div>
            <StarButton href="/onboarding" arrow>
              查询我的上升与月亮星座
            </StarButton>
          </div>
        </div>
      </GlassCard>

      {/* 常见问题 */}
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-4 p-card">
          <h2 className="text-sm tracking-[0.18em] text-moon-500">
            关于{zodiac.name}的常见问题
          </h2>
          <div className="flex flex-col gap-2">
            {extras.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-hairline bg-white/[0.03] px-4 py-3"
              >
                <summary className="cursor-pointer list-none text-sm text-moon-200 marker:hidden [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-moon-400">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* 今日星语 */}
      <GlassCard glow="gold" className="mb-5">
        <div className="flex flex-col gap-4 p-card">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm tracking-[0.18em] text-gold-300">
              <SparkleIcon className="h-4 w-4" />
              今日星语
            </h2>
            <span className="text-xs text-moon-500">{formatDateCN(today)}</span>
          </div>
          <p className="display-zh text-xl leading-relaxed text-moon-100">
            {daily.theme.core}
          </p>
          <div className="flex flex-wrap gap-2">
            {daily.keywords.map((k) => (
              <span
                key={k}
                className="rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-sm text-moon-300"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* 配对 */}
      <div className="mb-5 flex flex-col gap-3">
        <h2 className="text-sm tracking-[0.18em] text-moon-500">
          与{zodiac.name}最合拍的星座
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {extras.bestMatches.map((m) => (
            <Link key={m.slug} href={`/match/${m.slug}`}>
              <GlassCard interactive glow="none" className="h-full">
                <div className="flex flex-col items-center gap-1.5 p-5 text-center">
                  <span className="text-2xl text-moon-300">{m.zodiac.symbol}</span>
                  <span className="text-sm text-moon-200">{m.zodiac.name}</span>
                  <span className="text-xs text-gold-300">{m.score} 分</span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
        <Link
          href="/match"
          className="group flex items-center gap-1.5 self-start text-sm text-lav-300 transition-colors hover:text-gold-300"
        >
          查看完整星座配对表
          <ArrowRightIcon className="h-4 w-4 text-moon-500 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* CTA */}
      <GlassCard glow="lav">
        <div className="flex flex-col items-center gap-5 px-card py-8 text-center">
          <p className="display-zh text-xl">
            想知道你的太阳、月亮和上升吗？
          </p>
          <StarButton href="/onboarding" arrow>
            生成我的星盘
          </StarButton>
        </div>
      </GlassCard>
    </div>
  );
}
