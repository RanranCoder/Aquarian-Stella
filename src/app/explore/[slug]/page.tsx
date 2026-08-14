import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { ArrowRightIcon, SparkleIcon } from "@/components/icons";
import { getZodiacBySlug, ZODIACS, ELEMENT_META } from "@/data/zodiacs";
import { getDailyHoroscope } from "@/lib/daily";
import { localDateStr, formatDateCN } from "@/lib/format";

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

  const idx = ZODIACS.indexOf(zodiac);
  const friends = [ZODIACS[(idx + 2) % 12], ZODIACS[(idx + 4) % 12]];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      {/* 头部 */}
      <GlassCard glow="lav" className="mb-6">
        <div className="flex flex-col items-center gap-5 p-8 text-center md:p-10">
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
        <div className="flex flex-col gap-4 p-8">
          <h2 className="text-sm tracking-[0.18em] text-lav-300">性格</h2>
          <p className="leading-relaxed text-moon-300">{zodiac.personality}</p>
        </div>
      </GlassCard>

      {/* 爱情 */}
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-4 p-8">
          <h2 className="text-sm tracking-[0.18em] text-moon-500">爱情</h2>
          <p className="leading-relaxed text-moon-300">{zodiac.love}</p>
        </div>
      </GlassCard>

      {/* 事业 */}
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-4 p-8">
          <h2 className="text-sm tracking-[0.18em] text-moon-500">事业</h2>
          <p className="leading-relaxed text-moon-300">{zodiac.career}</p>
        </div>
      </GlassCard>

      {/* 今日星语 */}
      <GlassCard glow="gold" className="mb-5">
        <div className="flex flex-col gap-4 p-8">
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
        <h2 className="text-sm tracking-[0.18em] text-moon-500">容易合拍的星座</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {friends.map((f) => (
            <Link key={f.slug} href={`/explore/${f.slug}`}>
              <GlassCard interactive glow="none">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-moon-300">{f.symbol}</span>
                    <span className="text-moon-200">{f.name}</span>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-moon-500" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <GlassCard glow="lav">
        <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">
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
