"use client";

import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { SparkleIcon, SunIcon, MoonIcon, AscIcon, HeartIcon } from "@/components/icons";
import { store, useMounted } from "@/lib/store";
import {
  getSunSignFromDate,
  getMoonSign,
  getRisingSign,
} from "@/lib/astrology";
import { cn } from "@/lib/utils";
import type { Zodiac } from "@/data/zodiacs";

function PositionCard({
  icon: Icon,
  label,
  sign,
  question,
  keywords,
  body,
  defaultOpen = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sign: Zodiac;
  question: string;
  keywords: string[];
  body: string;
  defaultOpen?: boolean;
}) {
  return (
    <GlassCard glow="none" interactive className="mb-5">
      <details
        className="group p-card"
        open={defaultOpen}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-hairline bg-white/[0.04] text-gold-300">
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs tracking-[0.2em] text-moon-500">{label}</p>
              <p className="display-zh mt-1 text-xl">
                {sign.name}
                <span className="ml-2 text-sm text-moon-400">{question}</span>
              </p>
            </div>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hairline text-moon-400 transition-transform duration-300 group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="animate-fade-up mt-6 flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={k}
                className="rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-sm text-lav-200"
              >
                {k}
              </span>
            ))}
          </div>
          <p className="leading-relaxed text-moon-400">{body}</p>
        </div>
      </details>
    </GlassCard>
  );
}

export function ChartPage() {
  const mounted = useMounted();
  const s = store.useStore();
  const profile = mounted ? s.profile : null;

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-6 pt-16 pb-24 md:py-24">
        <GlassCard glow="lav">
          <div className="flex flex-col items-center gap-5 px-card py-10 text-center">
            <SparkleIcon className="h-8 w-8 text-lav-300" />
            <h1 className="display-zh text-2xl">你的星盘，还在等你</h1>
            <p className="max-w-sm text-sm leading-relaxed text-moon-400">
              完成出生信息，就能看见你的太阳、月亮与上升。
            </p>
            <StarButton href="/onboarding" arrow>
              开始探索
            </StarButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  const sun = getSunSignFromDate(profile.birthDate);
  const moon = getMoonSign(profile);
  const rising = getRisingSign(profile);

  const core = [
    { icon: SunIcon, label: "太阳", sign: sun, q: "你想成为谁", c: "text-gold-300" },
    { icon: MoonIcon, label: "月亮", sign: moon, q: "你需要什么", c: "text-moon-200" },
    rising
      ? { icon: AscIcon, label: "上升", sign: rising, q: "别人如何认识你", c: "text-lav-300" }
      : { icon: AscIcon, label: "上升", sign: null as Zodiac | null, q: "补全时间与地点后可见", c: "text-lav-300" },
  ];

  const traits = Array.from(
    new Set([
      ...sun.keywords,
      ...moon.keywords.slice(0, 1),
      ...(rising ? rising.keywords.slice(0, 1) : []),
    ]),
  ).slice(0, 5);

  return (
    <div className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16">
      {/* 星盘摘要 */}
      <GlassCard glow="lav" className="mb-10">
        <div className="flex flex-col gap-8 p-card md:p-10">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-lav-300">
              <SparkleIcon className="h-3 w-3" />
              我的星盘
            </span>
            <h1 className="display-zh mt-5 text-3xl md:text-4xl">
              {profile.nickname || "星星"}，你的三颗主星
            </h1>
            <p className="mt-3 text-sm text-moon-400">
              太阳、月亮与上升，是你认识自己的三个起点。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {core.map((x) => (
              <div
                key={x.label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-white/[0.03] px-4 py-6"
              >
                <x.icon className={cn("h-6 w-6", x.c)} />
                <div className="text-center">
                  <p className="text-xs text-moon-500">{x.label}</p>
                  <p className="display-zh mt-1 text-2xl">
                    {x.sign ? `${x.sign.symbol} ${x.sign.name}` : "未确定"}
                  </p>
                </div>
                <p className="text-xs text-moon-500">{x.q}</p>
              </div>
            ))}
          </div>

          {/* 性格关键词 */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs tracking-[0.2em] text-moon-500">我的核心特质</p>
            <div className="flex flex-wrap justify-center gap-2">
              {traits.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-hairline bg-white/[0.04] px-3.5 py-1.5 text-sm text-moon-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 三主星详情 */}
      <h2 className="mb-5 text-sm tracking-[0.18em] text-moon-500">三主星详解</h2>
      <PositionCard
        icon={SunIcon}
        label="太阳"
        sign={sun}
        question="你想成为怎样的人"
        keywords={sun.keywords}
        body={sun.personality}
        defaultOpen
      />
      <PositionCard
        icon={MoonIcon}
        label="月亮"
        sign={moon}
        question="你真正需要什么"
        keywords={moon.keywords}
        body={moon.personality}
      />
      {rising ? (
        <PositionCard
          icon={AscIcon}
          label="上升"
          sign={rising}
          question="别人第一眼如何认识你"
          keywords={rising.keywords}
          body={`在初见时，你往往先被看到的是 ${rising.name} 的样子——${rising.personality}`}
        />
      ) : (
        <GlassCard glow="none">
          <div className="flex flex-col items-center gap-4 p-card text-center">
            <AscIcon className="h-6 w-6 text-lav-300" />
            <h3 className="display-zh text-lg">上升星座 · 准确度有限</h3>
            <p className="max-w-md text-sm leading-relaxed text-moon-400">
              计算上升星座需要更精确的出生时间与出生地点。补全这些信息后，我们会为你重新计算。
            </p>
            <StarButton href="/onboarding" variant="glass" size="sm" arrow={false}>
              补全出生信息
            </StarButton>
          </div>
        </GlassCard>
      )}

      {/* 情绪与关系模式 */}
      <h2 className="mb-5 mt-10 text-sm tracking-[0.18em] text-moon-500">模式与主题</h2>
      <GlassCard glow="lav" className="mb-5">
        <div className="flex flex-col gap-5 p-card">
          <div className="flex items-center gap-3">
            <MoonIcon className="h-5 w-5 text-moon-200" />
            <h3 className="display-zh text-lg">情绪模式</h3>
          </div>
          <p className="leading-relaxed text-moon-400">
            月亮落在{moon.name}，你的情绪底色是{moon.personality}
          </p>
        </div>
      </GlassCard>
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-5 p-card">
          <div className="flex items-center gap-3">
            <HeartIcon className="h-5 w-5 text-gold-300" />
            <h3 className="display-zh text-lg">关系模式</h3>
          </div>
          <p className="leading-relaxed text-moon-400">{sun.love}</p>
          <StarButton href="/relationship" variant="glass" size="sm" arrow>
            看看和 TA 的关系
          </StarButton>
        </div>
      </GlassCard>
      <GlassCard glow="gold">
        <div className="flex flex-col gap-5 p-card">
          <div className="flex items-center gap-3">
            <SparkleIcon className="h-5 w-5 text-gold-300" />
            <h3 className="display-zh text-lg">成长主题</h3>
          </div>
          <p className="display-zh text-xl leading-relaxed text-moon-100">
            “{sun.motto}”
          </p>
          <p className="leading-relaxed text-moon-400">{sun.todayHint}</p>
        </div>
      </GlassCard>
    </div>
  );
}
