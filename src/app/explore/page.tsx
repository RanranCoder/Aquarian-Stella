import Link from "next/link";
import type { Metadata } from "next";
import { GlassCard } from "@/components/GlassCard";
import { SectionHeading } from "@/components/SectionHeading";
import { ArrowUpRightIcon } from "@/components/icons";
import { ZODIACS, ELEMENT_META } from "@/data/zodiacs";

export const metadata: Metadata = {
  title: "十二星座探索",
  description:
    "从十二星座开始，理解自己的性格、爱情与方向。白羊座、金牛座、双子座……每一个星座都有它自己的语言。",
};

const TOPICS = [
  { label: "十二星座", note: "性格 · 爱情 · 事业", status: "ready" as const },
  { label: "行星", note: "太阳 · 月亮 · 水星…", status: "soon" as const },
  { label: "宫位", note: "第一宫到第十二宫", status: "soon" as const },
  { label: "月相", note: "新月 · 满月 · 月相含义", status: "soon" as const },
  { label: "水星逆行", note: "时间 · 误区 · 应对", status: "soon" as const },
  { label: "占星知识", note: "术语 · 入门 · 常见问题", status: "soon" as const },
];

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-12 pb-24 md:py-16">
      <SectionHeading
        eyebrow="探索"
        title="先认识这颗星球"
        description="从十二星座开始，理解自己的性格、爱情与方向。更多行星、宫位与占星知识正在路上。"
      />

      {/* 十二星座网格 */}
      <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {ZODIACS.map((z) => {
          const element = ELEMENT_META[z.element];
          return (
            <Link key={z.slug} href={`/explore/${z.slug}`}>
              <GlassCard interactive glow="lav" className="h-full">
                <div className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl text-gold-300">{z.symbol}</span>
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-hairline text-moon-400 transition-transform duration-300 group-hover/card:translate-x-0.5">
                      <ArrowUpRightIcon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-auto">
                    <p className="display-zh text-lg">{z.name}</p>
                    <p className="text-sm text-moon-400">{z.en}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={cn_el(element)}>{element.label}</span>
                      <span className="text-xs text-moon-500">{z.dateRange}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>

      {/* 更多专题 */}
      <div className="mt-14">
        <h2 className="mb-5 text-sm tracking-[0.18em] text-moon-500">
          更多探索主题
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.filter((t) => t.status === "soon").map((t) => (
            <div
              key={t.label}
              className="glass flex flex-col gap-2 rounded-panel p-6"
            >
              <div className="flex items-center justify-between">
                <p className="display-zh text-lg text-moon-300">{t.label}</p>
                <span className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-moon-500">
                  即将上线
                </span>
              </div>
              <p className="text-sm text-moon-500">{t.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function cn_el(element: { label: string; color: string }) {
  return `text-xs ${element.color}`;
}
