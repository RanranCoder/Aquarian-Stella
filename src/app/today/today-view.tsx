"use client";

import { useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { MoonIcon, SunIcon, AscIcon, ArrowRightIcon, SparkleIcon, MoonPhaseIcon } from "@/components/icons";
import { getMoonPhase } from "@/lib/astronomy";
import { ShareCardFrame } from "@/components/ShareCardFrame";
import { SaveShareButton } from "@/components/SaveShareButton";
import { formatDateDot } from "@/lib/format";
import { store, useMounted } from "@/lib/store";
import {
  getSunSignFromDate,
  getMoonSign,
  getRisingSign,
} from "@/lib/astrology";
import { getDailyHoroscope } from "@/lib/daily";
import { localDateStr, formatDateCN } from "@/lib/format";
import { cn } from "@/lib/utils";

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            i < score ? "bg-gold-300" : "bg-white/15",
          )}
        />
      ))}
    </div>
  );
}

export function TodayPage() {
  const mounted = useMounted();
  const s = store.useStore();
  const profile = mounted ? s.profile : null;
  const [date, setDate] = useState<string>(() => localDateStr());

  const h = useMemo(() => {
    if (!profile) return null;
    const sun = getSunSignFromDate(profile.birthDate);
    return getDailyHoroscope(sun, date);
  }, [profile, date]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 md:py-24">
        <GlassCard glow="lav">
          <div className="flex flex-col items-center gap-5 px-8 py-14 text-center">
            <SparkleIcon className="h-8 w-8 text-lav-300" />
            <h1 className="display-zh text-2xl">先认识你的星星</h1>
            <p className="max-w-sm text-sm leading-relaxed text-moon-400">
              完成出生信息后，才能为你生成专属于你的今日星语。
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

  const [yy, mm, dd] = date.split("-").map(Number);
  const moonPhase = getMoonPhase(new Date(yy, mm - 1, dd, 12));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      {/* 顶部：日期切换 */}
      <div className="mb-10 flex flex-col items-center gap-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-lav-300">
          <SparkleIcon className="h-3 w-3" />
          今日星语
        </span>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setDate((d) => addDays(d, -1))}
            aria-label="前一天"
            className="grid h-11 w-11 place-items-center rounded-full border border-hairline text-moon-400 transition-all duration-300 hover:border-lav-400/60 hover:text-moon-100"
          >
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
          </button>
          <div className="text-center">
            <p className="display-zh text-2xl md:text-3xl">
              {formatDateCN(date)}
            </p>
            <p className="mt-1 text-sm text-moon-500">
              {sun.name} · {profile.nickname || "星星"}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] px-2.5 py-0.5 text-xs text-moon-400">
              <MoonPhaseIcon className="h-3.5 w-3.5 text-moon-300" />
              {moonPhase.label}
            </span>
          </div>
          <button
            onClick={() => setDate((d) => addDays(d, 1))}
            aria-label="后一天"
            className="grid h-11 w-11 place-items-center rounded-full border border-hairline text-moon-400 transition-all duration-300 hover:border-lav-400/60 hover:text-moon-100"
          >
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 核心星语 */}
      <GlassCard glow="lav" className="mb-5">
        <div className="flex flex-col gap-6 p-8 md:p-10">
          <div className="flex items-center gap-2 text-gold-300">
            <SparkleIcon className="h-4 w-4" />
            <span className="text-sm tracking-wide">星语</span>
          </div>
          <p className="display-zh text-2xl leading-snug text-moon-100 md:text-[1.9rem]">
            {h?.theme.core}
          </p>
          <p className="max-w-xl leading-relaxed text-moon-400">
            {h?.theme.expand}
          </p>
          <div className="flex flex-wrap gap-2">
            {h?.keywords.map((k) => (
              <span
                key={k}
                className="rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-sm text-lav-200"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* 今日维度 */}
      <GlassCard glow="none" className="mb-5">
        <div className="flex flex-col gap-5 p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm tracking-[0.18em] text-moon-500">今日维度</h2>
            <span className="text-xs text-moon-500">分值仅作辅助参考</span>
          </div>
          <div className="flex flex-col gap-4">
            {h?.dimensions.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between border-b border-white/[0.05] pb-4 last:border-none last:pb-0"
              >
                <span className="text-[15px] text-moon-200">{d.key}</span>
                <ScoreDots score={d.score} />
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* 今日星象 */}
      <GlassCard glow="lav" className="mb-5">
        <div className="flex flex-col gap-5 p-8">
          <h2 className="text-sm tracking-[0.18em] text-moon-500">今日星象</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: SunIcon, name: "太阳", value: `${sun.name}`, note: "你的核心能量" },
              { icon: MoonIcon, name: "月亮", value: `${moon.name}`, note: "情绪底色" },
              rising
                ? { icon: AscIcon, name: "上升", value: `${rising.name}`, note: "他人眼中的你" }
                : { icon: AscIcon, name: "上升", value: "准确度有限", note: "补全时间与地点后可见" },
            ].map((t) => (
              <div
                key={t.name}
                className="flex flex-col gap-2 rounded-2xl border border-hairline bg-white/[0.03] p-5"
              >
                <t.icon className="h-5 w-5 text-gold-300" />
                <div>
                  <p className="text-xs text-moon-500">{t.name}</p>
                  <p className="text-[15px] text-moon-100">{t.value}</p>
                </div>
                <p className="text-xs text-moon-500">{t.note}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* 今日建议 */}
      <GlassCard glow="none" className="mb-5">
        <div className="grid gap-8 p-8 sm:grid-cols-2">
          <div>
            <h2 className="text-sm tracking-[0.18em] text-lav-300">
              今天适合
            </h2>
            <p className="mt-4 leading-relaxed text-moon-300">
              {h?.theme.actions.yes}
            </p>
          </div>
          <div>
            <h2 className="text-sm tracking-[0.18em] text-moon-500">
              今天不必
            </h2>
            <p className="mt-4 leading-relaxed text-moon-300">
              {h?.theme.actions.no}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* 反思问题 */}
      <GlassCard glow="gold">
        <div className="flex flex-col items-center gap-5 p-8 text-center md:p-10">
          <h2 className="text-sm tracking-[0.18em] text-gold-300">今晚的星星问你</h2>
          <p className="display-zh text-xl leading-relaxed md:text-2xl">
            {h?.theme.question}
          </p>
          <StarButton
            href={`/wishes?new=1&title=${encodeURIComponent(h?.theme.question ?? "")}`}
            variant="glass"
            arrow
          >
            把它写进星愿
          </StarButton>
        </div>
      </GlassCard>

      {/* 分享卡 */}
      {h && (
        <div className="mt-10">
          <h2 className="mb-5 text-center text-sm tracking-[0.18em] text-moon-500">
            把今天的星语分享出去
          </h2>
          <ShareCardFrame id="share-today">
            <p className="text-[13px] tracking-[0.28em] text-[#9B8EC4]">
              今日星语 · {formatDateDot(date)}
            </p>
            <p className="mt-6 max-w-[260px] text-center text-[22px] font-semibold leading-snug text-[#F2EFF8]">
              {h.theme.core}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2 px-2">
              {h.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-[12px] text-[#E4E0EE]"
                >
                  {k}
                </span>
              ))}
            </div>
          </ShareCardFrame>
          <div className="mt-4 flex justify-center">
            <SaveShareButton
              targetId="share-today"
              filename={`星语星愿-今日星语-${date}.png`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
