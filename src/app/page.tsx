import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { SectionHeading } from "@/components/SectionHeading";
import { HeroCta } from "@/components/home/HeroCta";
import { TodayPreview } from "@/components/home/TodayPreview";
import {
  OrbitIcon,
  HeartIcon,
  StarIcon,
  ChatIcon,
  ArrowUpRightIcon,
} from "@/components/icons";
import { ZODIACS } from "@/data/zodiacs";

export default function HomePage() {
  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative flex min-h-[88dvh] flex-col items-center justify-center overflow-hidden px-6 pt-6 pb-16 text-center">
        {/* 轨道视觉层 */}
        <div
          className="pointer-events-none absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 opacity-80"
          aria-hidden="true"
        >
          <div className="relative h-[30rem] w-[30rem] md:h-[38rem] md:w-[38rem]">
            <div className="animate-orbit absolute inset-0 rounded-full border border-white/[0.06]">
              <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold-300 shadow-[0_0_14px_rgba(220,193,140,0.9)]" />
            </div>
            <div className="absolute inset-[13%] rounded-full border border-white/[0.045]" />
            <div
              className="animate-orbit absolute inset-[27%] rounded-full border border-white/[0.04]"
              style={{ animationDuration: "150s", animationDirection: "reverse" }}
            >
              <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-lav-300 shadow-[0_0_10px_rgba(178,165,221,0.8)]" />
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-6">
          <h1 className="display-zh max-w-3xl text-4xl leading-[1.15] tracking-[0.02em] md:text-6xl md:leading-[1.12]">
            今晚的星星，想和你说些什么？
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-moon-400">
            看见星象，也看见自己。把复杂的星象翻译成你可以理解、可以反思、可以记录的语言。
          </p>
          <div className="mt-2">
            <HeroCta size="lg" />
          </div>
        </div>
      </section>

      {/* ===== 今日星语预览 ===== */}
      <section className="px-6 py-16 md:py-24">
        <TodayPreview />
      </section>

      {/* ===== 三大核心功能 Bento ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <SectionHeading
          eyebrow="核心功能"
          title="认识自己，从这三扇门开始"
          description="读懂你是谁，看见你和 TA 的相遇，写下你想去的地方。星语星愿，不只告诉你今天的天空。"
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {/* 星盘 · 大卡 */}
          <GlassCard
            interactive
            glow="lav"
            className="md:col-span-2"
          >
            <Link href="/chart" className="block h-full">
              <div className="flex h-full flex-col justify-between gap-10 p-8 md:p-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 text-lav-300">
                    <OrbitIcon className="h-6 w-6" />
                    <span className="text-[13px] uppercase tracking-[0.22em]">
                      我的星盘
                    </span>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-moon-300 transition-transform duration-300 ease-luxe group-hover/card:translate-x-1">
                    <ArrowUpRightIcon className="h-4 w-4" />
                  </span>
                </div>

                <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h3 className="display-zh text-3xl md:text-4xl">
                      读懂你是谁
                    </h3>
                    <p className="mt-3 max-w-md leading-relaxed text-moon-400">
                      太阳、月亮、上升，三个星位，三种看见自己的角度。
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {[
                      { s: "☉", t: "太阳", d: "你想成为谁" },
                      { s: "☽", t: "月亮", d: "你需要什么" },
                      { s: "↑", t: "上升", d: "别人如何认识你" },
                    ].map((x) => (
                      <div
                        key={x.t}
                        className="flex flex-col items-center gap-1 rounded-2xl border border-hairline bg-white/[0.03] px-4 py-4"
                      >
                        <span className="text-2xl text-gold-300">{x.s}</span>
                        <span className="text-sm text-moon-200">{x.t}</span>
                        <span className="text-[11px] text-moon-500">{x.d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          </GlassCard>

          {/* 关系 · 高卡 */}
          <GlassCard interactive glow="gold" className="md:row-span-2">
            <Link href="/relationship" className="block h-full">
              <div className="flex h-full flex-col justify-between gap-8 p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 text-gold-300">
                    <HeartIcon className="h-6 w-6" />
                    <span className="text-[13px] uppercase tracking-[0.22em]">
                      关系星图
                    </span>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-moon-300 transition-transform duration-300 ease-luxe group-hover/card:translate-x-1">
                    <ArrowUpRightIcon className="h-4 w-4" />
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="display-zh text-2xl">
                    你和 TA 的星星
                    <br />
                    如何相遇
                  </h3>
                  <p className="mt-2 leading-relaxed text-moon-400">
                    不是一句「配不配」，而是你们为什么靠近、容易在哪里误解、又能一起成长成什么样。
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["吸引", "默契", "沟通", "成长"].map((k) => (
                      <span
                        key={k}
                        className="rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-sm text-moon-300"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          </GlassCard>

          {/* 星愿 */}
          <GlassCard interactive glow="lav">
            <Link href="/wishes" className="block h-full">
              <div className="flex h-full flex-col justify-between gap-8 p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 text-lav-300">
                    <StarIcon className="h-6 w-6" />
                    <span className="text-[13px] uppercase tracking-[0.22em]">
                      我的星愿
                    </span>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-moon-300 transition-transform duration-300 ease-luxe group-hover/card:translate-x-1">
                    <ArrowUpRightIcon className="h-4 w-4" />
                  </span>
                </div>
                <div>
                  <h3 className="display-zh text-2xl">把想去的地方写下来</h3>
                  <p className="mt-3 leading-relaxed text-moon-400">
                    一句愿望，一个状态。让星星陪你看它慢慢实现。
                  </p>
                </div>
              </div>
            </Link>
          </GlassCard>

          {/* 星语室 */}
          <GlassCard interactive glow="none">
            <Link href="/explore" className="block h-full">
              <div className="flex h-full flex-col justify-between gap-8 p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 text-moon-300">
                    <ChatIcon className="h-6 w-6" />
                    <span className="text-[13px] uppercase tracking-[0.22em]">
                      探索
                    </span>
                  </div>
                  <span className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-moon-500">
                    十二星座
                  </span>
                </div>
                <div>
                  <h3 className="display-zh text-2xl">先认识这颗星球</h3>
                  <p className="mt-3 leading-relaxed text-moon-400">
                    从十二星座开始，理解自己的性格、爱情与方向。
                  </p>
                </div>
              </div>
            </Link>
          </GlassCard>
        </div>
      </section>

      {/* ===== 十二星座条 ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <SectionHeading
          eyebrow="十二星座"
          title="先看看，你属于哪一片星空"
          description="滑动浏览十二星座，每个星座都有它自己的语言。"
        />
        <div className="mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4">
          {ZODIACS.map((z) => (
            <Link
              key={z.slug}
              href={`/explore/${z.slug}`}
              className="glass group flex min-w-[6.5rem] snap-start flex-col items-center gap-2 rounded-2xl px-5 py-6 transition-transform duration-300 ease-luxe hover:-translate-y-1"
            >
              <span className="text-2xl text-gold-300 transition-transform duration-300 group-hover:scale-110">
                {z.symbol}
              </span>
              <span className="text-sm text-moon-200">{z.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== 收尾 CTA ===== */}
      <section className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <GlassCard glow="gold">
          <div className="flex flex-col items-center gap-6 px-8 py-14 text-center md:py-16">
            <span className="animate-breathe text-3xl text-gold-300">✦</span>
            <h2 className="display-zh text-3xl md:text-4xl">
              准备好认识自己了吗？
            </h2>
            <p className="max-w-md leading-relaxed text-moon-400">
              把星光写成答案，把愿望留给未来。你的第一封星语，正在等你。
            </p>
            <HeroCta size="lg" />
          </div>
        </GlassCard>
      </section>
    </>
  );
}
