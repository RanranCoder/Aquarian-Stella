import type { Metadata } from "next";
import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { SectionHeading } from "@/components/SectionHeading";
import { StarButton } from "@/components/StarButton";
import { ZODIACS } from "@/data/zodiacs";
import { generateMatchReport, pairSlugOf } from "@/lib/match";

export const metadata: Metadata = {
  title: "星座配对表 · 十二星座配对指数查询",
  description:
    "十二星座两两配对指数完整表：白羊座×金牛座、狮子座×射手座……66 组配对的契合度评分、元素相性与相处模式，一键查看详细解读。",
  alternates: { canonical: "/match" },
};

export default function MatchIndexPage() {
  // 按第一个星座分组展示 66 组配对
  const groups = ZODIACS.map((z) => {
    const idx = ZODIACS.indexOf(z);
    const partners = ZODIACS.slice(idx + 1).map((other) => {
      const report = generateMatchReport(z, other);
      return { other, report, slug: pairSlugOf(z, other) };
    });
    return { zodiac: z, partners };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 pt-12 pb-24 md:py-16">
      <SectionHeading
        eyebrow="配对"
        title="十二星座配对表"
        description="66 组星座两两配对：契合度评分、元素相性、吸引力与挑战。点击任意一组，查看完整的配对解读。"
      />

      <div className="mt-14 flex flex-col gap-10">
        {groups.map(({ zodiac, partners }) => (
          <section key={zodiac.slug} aria-label={`${zodiac.name}的配对`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl text-gold-300">{zodiac.symbol}</span>
              <h2 className="display-zh text-lg text-moon-100">{zodiac.name}</h2>
              <span className="text-xs text-moon-500">× 其余 11 星座</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map(({ other, report, slug }) => (
                <Link key={slug} href={`/match/${slug}`}>
                  <GlassCard interactive glow="none" className="h-full">
                    <div className="flex h-full items-center justify-between gap-3 p-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-lg text-gold-300">{zodiac.symbol}</span>
                        <span className="text-xs text-moon-500">×</span>
                        <span className="text-lg text-lav-300">{other.symbol}</span>
                        <span className="truncate text-sm text-moon-200">
                          {zodiac.name}×{other.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <span className="text-base text-gold-300">{report.score}</span>
                        <span className="text-[0.6875rem] text-moon-500">{report.verdict}</span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16">
        <GlassCard glow="lav">
          <div className="flex flex-col items-center gap-5 px-card py-8 text-center">
            <p className="display-zh text-xl">
              配对表看的是星座，关系星图看的是你们两个人
            </p>
            <StarButton href="/onboarding" arrow>
              生成我们的关系星图
            </StarButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
