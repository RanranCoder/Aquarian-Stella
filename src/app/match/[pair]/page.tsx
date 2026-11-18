import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { ArrowRightIcon } from "@/components/icons";
import {
  ALL_PAIRS,
  generateMatchReport,
  pairSlugOf,
  parsePairSlug,
  relatedPairs,
} from "@/lib/match";
import { ELEMENT_META } from "@/data/zodiacs";
import { formatDateCN, localDateStr } from "@/lib/format";

const BASE_URL = "https://stella.ranran.org.cn";

export function generateStaticParams() {
  return ALL_PAIRS().map((p) => ({ pair: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/match/[pair]">): Promise<Metadata> {
  const { pair } = await params;
  const parsed = parsePairSlug(pair);
  if (!parsed) return {};
  const report = generateMatchReport(parsed.a, parsed.b);
  return {
    title: `${report.a.name}和${report.b.name}配吗？配对指数 ${report.score} 分`,
    description: `${report.a.name}（${report.a.elementLabel}·守护星${report.a.rulingPlanet}）与${report.b.name}（${report.b.elementLabel}·守护星${report.b.rulingPlanet}）的星座配对解读：${report.verdict}，综合配对指数 ${report.score} 分。吸引力、默契、挑战与相处建议完整分析。`,
    alternates: {
      canonical: `/match/${pairSlugOf(parsed.a, parsed.b)}`,
    },
  };
}

export default async function MatchPage({
  params,
}: PageProps<"/match/[pair]">) {
  const { pair } = await params;
  const parsed = parsePairSlug(pair);
  if (!parsed) notFound();

  const report = generateMatchReport(parsed.a, parsed.b);
  const today = localDateStr();
  const related = relatedPairs(report.a).filter((r) => r.b !== report.b).slice(0, 4);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: report.faqs.map((f) => ({
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
      { "@type": "ListItem", position: 2, name: "星座配对", item: `${BASE_URL}/match` },
      {
        "@type": "ListItem",
        position: 3,
        name: `${report.a.name}和${report.b.name}`,
        item: `${BASE_URL}/match/${pairSlugOf(report.a, report.b)}`,
      },
    ],
  };

  const elA = ELEMENT_META[report.a.element];
  const elB = ELEMENT_META[report.b.element];

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

      {/* 头部：双方对比 + 综合评分 */}
      <GlassCard glow="gold" className="mb-6">
        <div className="flex flex-col items-center gap-6 p-card text-center md:p-10">
          <div className="flex w-full items-center justify-center gap-4 md:gap-8">
            <div className="flex flex-col items-center gap-2">
              <span className="text-5xl text-gold-300 md:text-6xl">{report.a.symbol}</span>
              <div>
                <p className="display-zh text-xl">{report.a.name}</p>
                <p className={`text-xs ${elA.color}`}>{elA.label}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs tracking-[0.3em] text-moon-500">VS</span>
              <span className="text-2xl text-moon-300">✦</span>
              <span className="text-xs text-moon-500">{report.aspectLabel}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-5xl text-lav-300 md:text-6xl">{report.b.symbol}</span>
              <div>
                <p className="display-zh text-xl">{report.b.name}</p>
                <p className={`text-xs ${elB.color}`}>{elB.label}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-xs tracking-[0.18em] text-moon-500">配对指数</p>
            <p className="display-zh text-5xl text-gold-300">{report.score}</p>
            <p className="display-zh text-lg text-moon-100">「{report.verdict}」</p>
            <p className="text-xs text-moon-500">
              {report.elementLabel} · 更新于 {formatDateCN(today)}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* 四维评分 */}
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-4 p-card">
          <h2 className="text-sm tracking-[0.18em] text-moon-500">分维度评分</h2>
          {report.dimensions.map((d) => (
            <div key={d.key} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm text-moon-300">{d.key}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lav-400/70 to-gold-300/90"
                  style={{ width: `${d.score}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-sm text-moon-200">{d.score}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 正文四段 */}
      {(
        [
          ["吸引力", report.sections.attraction, "gold"],
          ["默契与相处", report.sections.harmony, "none"],
          ["挑战与磨合", report.sections.challenge, "none"],
          ["相处建议", report.sections.advice, "lav"],
        ] as const
      ).map(([title, body, glow]) => (
        <GlassCard key={title} glow={glow} className="mb-5">
          <div className="flex flex-col gap-4 p-card">
            <h2 className="text-sm tracking-[0.18em] text-moon-500">{title}</h2>
            <p className="leading-relaxed text-moon-300">{body}</p>
          </div>
        </GlassCard>
      ))}

      {/* FAQ */}
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-4 p-card">
          <h2 className="text-sm tracking-[0.18em] text-moon-500">常见问题</h2>
          <div className="flex flex-col gap-2">
            {report.faqs.map((f) => (
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

      {/* 相关配对（内链） */}
      <div className="mb-5 flex flex-col gap-3">
        <h2 className="text-sm tracking-[0.18em] text-moon-500">相关配对</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {related.map((r) => (
            <Link key={r.slug} href={`/match/${r.slug}`}>
              <GlassCard interactive glow="none">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl text-gold-300">{r.a.symbol}</span>
                    <span className="text-xs text-moon-500">×</span>
                    <span className="text-xl text-lav-300">{r.b.symbol}</span>
                    <span className="text-sm text-moon-200">
                      {r.a.name}×{r.b.name}
                    </span>
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
        <div className="flex flex-col items-center gap-5 px-card py-8 text-center">
          <p className="display-zh text-xl">
            配对只是星象，真正的答案在你们的相处里
          </p>
          <p className="max-w-md text-sm text-moon-400">
            想看更深的版本？用你们两人的出生信息生成关系星图，看到吸引力与误解的来源。
          </p>
          <StarButton href="/onboarding" arrow>
            生成我们的关系星图
          </StarButton>
        </div>
      </GlassCard>
    </div>
  );
}
