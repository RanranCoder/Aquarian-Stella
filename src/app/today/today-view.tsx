"use client";

import { useMemo, useState, useEffect } from "react";
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
import type { Aspect, ScoreFactor } from "@/lib/astrology/types";

type TodayContent = {
  core: string;
  expand: string;
  actions: { yes: string; no: string };
  question: string;
  keywords: string[];
};

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/* ------------------------------------------------------------------ */
/*  行星 / 相位 中文映射                                                */
/* ------------------------------------------------------------------ */

const PLANET_CN: Record<string, string> = {
  sun: "太阳",
  moon: "月亮",
  mercury: "水星",
  venus: "金星",
  mars: "火星",
  jupiter: "木星",
  saturn: "土星",
  uranus: "天王星",
  neptune: "海王星",
  pluto: "冥王星",
  asc: "上升",
};

const ASPECT_SYMBOL: Record<string, string> = {
  conjunction: "✦",
  trine: "△",
  square: "□",
  opposition: "☍",
  sextile: "⚹",
};

const ASPECT_CN: Record<string, string> = {
  conjunction: "合",
  trine: "拱",
  square: "刑",
  opposition: "冲",
  sextile: "六合",
};

/* ------------------------------------------------------------------ */
/*  辅助函数                                                           */
/* ------------------------------------------------------------------ */

function parseFactorSource(source: string): {
  planetA: string;
  aspect: string;
  planetB: string;
} {
  const parts = source.split("_");
  return {
    planetA: parts[0] ?? "",
    aspect: parts[1] ?? "",
    planetB: parts[2] ?? "",
  };
}

function formatFactorSource(source: string): string {
  const { planetA, aspect, planetB } = parseFactorSource(source);
  const nameA = PLANET_CN[planetA] ?? planetA;
  const nameB = PLANET_CN[planetB] ?? planetB;
  const sym = ASPECT_SYMBOL[aspect] ?? aspect;
  return `${nameA} ${sym} 本命${nameB}`;
}

function formatAspect(asp: Aspect): string {
  const nameA = PLANET_CN[asp.planetA] ?? asp.planetA;
  const nameB = PLANET_CN[asp.planetB] ?? asp.planetB;
  const cn = ASPECT_CN[asp.type] ?? asp.type;
  return `行运${nameA}${cn}本命${nameB}`;
}

/* 维度中文 key -> 引擎 score key */
const DIM_KEY_MAP: Record<string, string> = {
  情绪: "emotion",
  爱情: "love",
  创造力: "creativity",
  人际: "social",
  事业: "career",
};

/* ------------------------------------------------------------------ */
/*  ScoreBar —— 分数 + 进度条                                           */
/* ------------------------------------------------------------------ */

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-right text-sm tabular-nums text-moon-200">
        {score}
      </span>
      <div
        role="progressbar"
        aria-label={`${label} ${score} 分`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.08]"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            score >= 70
              ? "bg-gradient-to-r from-gold-400 to-gold-300"
              : score >= 40
                ? "bg-gradient-to-r from-lav-400 to-lav-300"
                : "bg-gradient-to-r from-moon-500 to-moon-400",
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FactorsRow —— 单个维度的评分因子列表                                  */
/* ------------------------------------------------------------------ */

function FactorsRow({ factors }: { factors: ScoreFactor[] }) {
  if (factors.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5 pl-1">
      {factors.map((f, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "font-medium",
              f.type === "positive" ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {f.type === "positive" ? "↑" : "↓"}
          </span>
          <span className="text-moon-400">{formatFactorSource(f.source)}</span>
          <span
            className={cn(
              "tabular-nums",
              f.weight > 0 ? "text-emerald-400/80" : "text-rose-400/80",
            )}
          >
            {f.weight > 0 ? "+" : ""}
            {Math.round(f.weight)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  TodayPage                                                           */
/* ================================================================== */

export function TodayPage() {
  const mounted = useMounted();
  const s = store.useStore();
  const profile = mounted ? s.profile : null;
  const [date, setDate] = useState<string>(() => localDateStr());
  const [factorsOpen, setFactorsOpen] = useState(false);
  const [aiContent, setAiContent] = useState<TodayContent | null>(null);
  const today = localDateStr();

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    fetch("/api/astrology/ai-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surface: "today", date }),
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.content) {
          setAiContent(data.content as TodayContent);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [profile, date]);

  const h = useMemo(() => {
    if (!profile) return null;
    const sun = getSunSignFromDate(profile.birthDate);
    return getDailyHoroscope(sun, date, profile);
  }, [profile, date]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-6 pt-16 pb-24 md:py-24">
        <GlassCard glow="lav">
          <div className="flex flex-col items-center gap-5 px-card py-10 text-center">
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
  const isToday = date === today;

  const [yy, mm, dd] = date.split("-").map(Number);
  const moonPhase = getMoonPhase(new Date(yy, mm - 1, dd, 12));

  // 取主要行运相位（按 strength 降序，前 5 个）。数量很小，避免在条件分支后调用 Hook。
  const majorTransits = [...(h?.transitAspects ?? [])]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16">
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
            <p aria-live="polite" className="display-zh text-2xl md:text-3xl">
              {formatDateCN(date)}
            </p>
            <p className="mt-1 text-sm text-moon-500">
              {sun.name} · {profile.nickname || "星星"}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] px-2.5 py-0.5 text-xs text-moon-400">
              <MoonPhaseIcon className="h-3.5 w-3.5 text-moon-300" />
              {moonPhase.label}
            </span>
            {!isToday && (
              <button
                type="button"
                onClick={() => setDate(today)}
                className="mt-2 inline-flex min-h-11 items-center text-xs text-lav-300 transition-colors hover:text-lav-200"
              >
                回到今天
              </button>
            )}
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
        <div className="flex flex-col gap-6 p-card md:p-10">
          <div className="flex items-center gap-2 text-gold-300">
            <SparkleIcon className="h-4 w-4" />
            <span className="text-sm tracking-wide">星语</span>
          </div>
          <p className="display-zh text-2xl leading-snug text-moon-100 md:text-[1.9rem]">
            {aiContent?.core ?? h?.theme.core}
          </p>
          <p className="max-w-xl leading-relaxed text-moon-400">
            {aiContent?.expand ?? h?.theme.expand}
          </p>
          <div className="flex flex-wrap gap-2">
            {(aiContent?.keywords ?? h?.keywords ?? []).map((k) => (
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
        <div className="flex flex-col gap-5 p-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm tracking-[0.18em] text-moon-500">今日维度</h2>
            <span className="text-xs text-moon-500">分值仅作辅助参考</span>
          </div>
          <div className="flex flex-col gap-4">
            {h?.dimensions.map((d) => (
              <div
                key={d.key}
                className="border-b border-white/[0.05] pb-4 last:border-none last:pb-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] text-moon-200">{d.key}</span>
                  <ScoreBar score={d.score} label={d.key} />
                </div>
              </div>
            ))}
          </div>

          {/* 评分依据展开区域 */}
          {h && Object.keys(h.scoresWithFactors).length > 0 && (
            <div>
              <button
                onClick={() => setFactorsOpen((v) => !v)}
                aria-expanded={factorsOpen}
                aria-controls="today-score-factors"
                className="flex w-full items-center gap-1.5 text-xs text-moon-500 transition-colors hover:text-moon-300"
              >
                <span
                  className={cn(
                    "inline-block transition-transform duration-200",
                    factorsOpen && "rotate-90",
                  )}
                >
                  ▶
                </span>
                为什么是这个分数
              </button>
              {factorsOpen && (
                <div id="today-score-factors" className="mt-4 flex flex-col gap-5">
                  {h.dimensions.map((d) => {
                    const engineKey = DIM_KEY_MAP[d.key];
                    const scoreResult = h.scoresWithFactors[engineKey];
                    if (!scoreResult || scoreResult.factors.length === 0)
                      return null;
                    return (
                      <div key={d.key}>
                        <p className="text-sm text-moon-300">{d.key}</p>
                        <FactorsRow factors={scoreResult.factors} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* 今日星象 */}
      <GlassCard glow="lav" className="mb-5">
        <div className="flex flex-col gap-5 p-card">
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

          {/* 主要行运相位 */}
          {majorTransits.length > 0 && (
            <div className="mt-1 border-t border-white/[0.05] pt-5">
              <p className="mb-3 text-xs text-moon-500">主要行运相位</p>
              <div className="flex flex-col gap-2">
                {majorTransits.map((asp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-moon-300"
                  >
                    <span className="text-gold-300">
                      {ASPECT_SYMBOL[asp.type] ?? "·"}
                    </span>
                    <span>{formatAspect(asp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* 今日建议 */}
      <GlassCard glow="none" className="mb-5">
        <div className="grid gap-8 p-card sm:grid-cols-2">
          <div>
            <h2 className="text-sm tracking-[0.18em] text-lav-300">
              今天适合
            </h2>
            <p className="mt-4 leading-relaxed text-moon-300">
              {aiContent?.actions.yes ?? h?.theme.actions.yes}
            </p>
          </div>
          <div>
            <h2 className="text-sm tracking-[0.18em] text-moon-500">
              今天不必
            </h2>
            <p className="mt-4 leading-relaxed text-moon-300">
              {aiContent?.actions.no ?? h?.theme.actions.no}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* 反思问题 */}
      <GlassCard glow="gold">
        <div className="flex flex-col items-center gap-5 p-card text-center md:p-10">
          <h2 className="text-sm tracking-[0.18em] text-gold-300">今晚的星星问你</h2>
          <p className="display-zh text-xl leading-relaxed md:text-2xl">
            {aiContent?.question ?? h?.theme.question}
          </p>
          <StarButton
            href={`/wishes?new=1&title=${encodeURIComponent(aiContent?.question ?? h?.theme.question ?? "")}`}
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
              {aiContent?.core ?? h.theme.core}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2 px-2">
              {(aiContent?.keywords ?? h.keywords ?? []).map((k) => (
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
