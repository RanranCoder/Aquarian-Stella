"use client";

import { useId, useState, useCallback } from "react";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import {
  HeartIcon,
  SparkleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
} from "@/components/icons";
import { store, useMounted } from "@/lib/store";
import { getRelation } from "@/lib/relation";
import type { BirthProfile } from "@/lib/astrology";
import { findCity } from "@/data/cities";
import { ShareCardFrame } from "@/components/ShareCardFrame";
import { SaveShareButton } from "@/components/SaveShareButton";

type RelationContent = {
  keywords: string[];
  attraction: string[];
  misunderstanding: string[];
  growth: string;
  advice: string;
};

/** TA 出生日期范围 */
const TA_MIN = "1930-01-01";
const TA_MAX = (() => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
})();

type BirthDataSummary = {
  summary: string;
  time: string;
  city: string;
};

function summarizeBirthData(profile: BirthProfile): BirthDataSummary {
  const cityInput = profile.birthCity?.trim();
  const matchedCity = findCity(cityInput);

  const time = !profile.birthTime
    ? "未填写，将以 12:00 近似"
    : profile.birthTimeAccuracy === "approximate"
      ? "已填写大概时间"
      : profile.birthTimeAccuracy === "unknown"
        ? "已填写，但标记为未知"
        : "已填写具体时间";

  const city = matchedCity
    ? `已匹配：${matchedCity.name}`
    : cityInput
      ? `未匹配：${cityInput}`
      : "未填写，将按 UTC+8 近似";

  const timePart = !profile.birthTime
    ? "仅生日"
    : profile.birthTimeAccuracy === "approximate"
      ? "生日与大概时间"
      : profile.birthTimeAccuracy === "unknown"
        ? "生日与未确认时间"
        : "生日与具体时间";

  return {
    summary: matchedCity
      ? `${timePart === "仅生日" ? "生日" : timePart}与已匹配城市`
      : timePart,
    time,
    city,
  };
}

export function RelationshipPage() {
  const mounted = useMounted();
  const s = store.useStore();
  const profile = mounted ? s.profile : null;
  const optionalFieldsId = useId();

  const [name, setName] = useState("");
  const [taDate, setTaDate] = useState("");
  const [taTime, setTaTime] = useState("");
  const [taCity, setTaCity] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof getRelation> | null>(null);
  const [copied, setCopied] = useState(false);
  const [aiRelation, setAiRelation] = useState<RelationContent | null>(null);

  const canGenerate = taDate.length === 10;

  function generate() {
    if (!profile || !canGenerate) return;
    const taProfile: BirthProfile = {
      nickname: name.trim() || "TA",
      birthDate: taDate,
      birthTime: taTime || undefined,
      birthTimeAccuracy: taTime ? "exact" : "unknown",
      birthCity: taCity.trim() || undefined,
      interests: [],
    };
    setResult(getRelation(profile, taProfile));
    setAiRelation(null); // 重置 AI 内容

    // 请求 AI 内容
    fetch("/api/astrology/ai-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surface: "relation", partnerProfile: taProfile }),
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.content) setAiRelation(data.content as RelationContent);
      })
      .catch(() => {});
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // 忽略剪贴板不可用
    }
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-6 pt-16 pb-24 md:py-24">
        <GlassCard glow="lav">
          <div className="flex flex-col items-center gap-5 px-card py-10 text-center">
            <HeartIcon className="h-8 w-8 text-gold-300" />
            <h1 className="display-zh text-2xl">先认识自己，再遇见 TA</h1>
            <p className="max-w-sm text-sm leading-relaxed text-moon-400">
              关系星图需要你的出生信息，才能计算你们之间的星星如何相遇。
            </p>
            <StarButton href="/onboarding" arrow>
              开始探索
            </StarButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  const ownBirthData = summarizeBirthData(profile);
  const taBirthData = summarizeBirthData({
    nickname: name.trim() || "TA",
    birthDate: taDate,
    birthTime: taTime || undefined,
    birthTimeAccuracy: taTime ? "exact" : "unknown",
    birthCity: taCity.trim() || undefined,
    interests: [],
  });

  return (
    <div className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16">
      {/* 输入 */}
      {!result && (
        <GlassCard glow="lav">
          <div className="flex flex-col gap-8 p-card md:p-10">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-gold-300">
                <HeartIcon className="h-3 w-3" />
                关系星图
              </span>
              <h1 className="display-zh mt-5 text-3xl">
                你和 TA 的星星，如何相遇
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-moon-400">
                生日可以生成基础解读；若知道时间和出生地，也可以补充，让出生时刻的计算更贴近实际。
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-moon-500">TA 的称呼</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="比如 TA、你的名字"
                  className="h-12 w-full rounded-xl border border-hairline bg-white/[0.04] px-4 text-[15px] text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-moon-500">TA 的出生日期</label>
                <DatePicker
                  value={taDate}
                  onChange={setTaDate}
                  min={TA_MIN}
                  max={TA_MAX}
                  ariaLabel="TA 的出生日期"
                />
              </div>
            </div>

            {/* 可选信息展开 */}
            <div>
              <button
                type="button"
                onClick={() => setShowOptional((v) => !v)}
                aria-expanded={showOptional}
                aria-controls={optionalFieldsId}
                className="inline-flex items-center gap-1.5 text-xs text-moon-500 transition-colors hover:text-moon-300"
              >
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`}
                />
                补充出生时间和出生地（可选）
              </button>
              <div
                id={optionalFieldsId}
                hidden={!showOptional}
                className={`mt-4 grid gap-5 sm:grid-cols-2 ${showOptional ? "animate-fade-up" : ""}`}
              >
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-moon-500">出生时间</label>
                  <TimePicker
                    value={taTime}
                    onChange={setTaTime}
                    placeholder="不知道也没关系"
                    ariaLabel="TA 的出生时间"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-moon-500">出生地</label>
                  <input
                    type="text"
                    value={taCity}
                    onChange={(e) => setTaCity(e.target.value)}
                    placeholder="输入城市，如 北京"
                    className="h-12 w-full rounded-xl border border-hairline bg-white/[0.04] px-4 text-[15px] text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <StarButton
                size="lg"
                arrow
                disabled={!canGenerate}
                onClick={generate}
              >
                生成关系星图
              </StarButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 结果 */}
      {result && (
        <>
          {/* 关系总览 */}
          <GlassCard glow="gold" className="mb-5">
            <div className="flex flex-col items-center gap-6 p-card text-center md:p-10">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-1.5 self-start rounded-full border border-hairline px-3.5 py-1.5 text-xs text-moon-400 transition-colors hover:border-lav-400/60 hover:text-moon-100"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
                重新输入
              </button>
              <div className="flex items-center gap-4">
                <span className="display-zh text-xl text-moon-200">你</span>
                <span className="animate-breathe text-2xl text-gold-300">♡</span>
                <span className="display-zh text-xl text-moon-200">
                  {name.trim() || "TA"}
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {(aiRelation?.keywords ?? result.keywords).map((k) => (
                  <span
                    key={k}
                    className="rounded-full border border-hairline bg-white/[0.04] px-3.5 py-1.5 text-sm text-gold-200"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <span className="display-zh text-5xl text-lux-gold">
                  {result.score}
                </span>
                <span className="pb-1 text-sm text-moon-500">关系指数</span>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-moon-400">
                分数只是一个小角度。真正值得看的，是你们如何在差异里相处。
              </p>
            </div>
          </GlassCard>

          {/* 本次解读的信息范围 */}
          <GlassCard glow="none" className="mb-5">
            <div className="flex flex-col gap-5 p-card">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs tracking-[0.18em] text-moon-500">
                    解读范围
                  </p>
                  <h2 className="display-zh mt-1 text-xl text-moon-100">
                    这次结果，使用了哪些信息
                  </h2>
                </div>
                <span className="w-fit rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-xs text-moon-400">
                  适合用来开启对话
                </span>
              </div>
              <p className="text-sm leading-relaxed text-moon-400">
                这份解读基于双方已填写的出生信息，提供相处的观察角度，而不是给关系下确定结论。
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "you", label: "你", data: ownBirthData },
                  { key: "ta", label: name.trim() || "TA", data: taBirthData },
                ].map(({ key, label, data }) => (
                  <section
                    key={key}
                    aria-labelledby={`relationship-data-${key}`}
                    className="rounded-xl border border-hairline bg-white/[0.03] p-4"
                  >
                    <h3
                      id={`relationship-data-${key}`}
                      className="text-sm text-moon-200"
                    >
                      {label}
                    </h3>
                    <p className="mt-1 text-xs text-gold-200">{data.summary}</p>
                    <dl className="mt-4 flex flex-col gap-2 text-xs">
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="shrink-0 text-moon-500">出生时间</dt>
                        <dd className="text-right text-moon-300">{data.time}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="shrink-0 text-moon-500">出生地</dt>
                        <dd className="text-right text-moon-300">{data.city}</dd>
                      </div>
                    </dl>
                  </section>
                ))}
              </div>
              <p className="border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-moon-500">
                本页比较双方行星之间的相位，不计算上升点。未填写的出生时间会以 12:00 近似；未填写或未匹配的出生地会按 UTC+8 近似。
              </p>
            </div>
          </GlassCard>

          {/* 优势 */}
          <GlassCard glow="none" className="mb-5">
            <div className="flex flex-col gap-5 p-card">
              <h2 className="flex items-center gap-2 text-sm tracking-[0.18em] text-lav-300">
                <SparkleIcon className="h-4 w-4" />
                容易被彼此吸引的地方
              </h2>
              <ul className="flex flex-col gap-4">
                {(aiRelation?.attraction ?? result.attraction).map((t, i) => (
                  <li
                    key={i}
                    className="flex gap-3 border-b border-white/[0.05] pb-4 last:border-none last:pb-0"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lav-300" />
                    <p className="leading-relaxed text-moon-300">{t}</p>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>

          {/* 挑战 */}
          <GlassCard glow="none" className="mb-5">
            <div className="flex flex-col gap-5 p-card">
              <h2 className="flex items-center gap-2 text-sm tracking-[0.18em] text-moon-500">
                <HeartIcon className="h-4 w-4" />
                最容易产生误解的地方
              </h2>
              <ul className="flex flex-col gap-4">
                {(aiRelation?.misunderstanding ?? result.misunderstanding).map((t, i) => (
                  <li
                    key={i}
                    className="flex gap-3 border-b border-white/[0.05] pb-4 last:border-none last:pb-0"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-moon-500" />
                    <p className="leading-relaxed text-moon-300">{t}</p>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>

          {/* 成长 + 建议 */}
          <div className="mb-5 grid gap-5 md:grid-cols-2">
            <GlassCard glow="lav">
              <div className="flex flex-col gap-4 p-card">
                <h2 className="text-sm tracking-[0.18em] text-lav-300">
                  这段关系可能带来的成长
                </h2>
                <p className="leading-relaxed text-moon-300">
                  {aiRelation?.growth ?? result.growth}
                </p>
              </div>
            </GlassCard>
            <GlassCard glow="gold">
              <div className="flex flex-col gap-4 p-card">
                <h2 className="text-sm tracking-[0.18em] text-gold-300">
                  给你们的建议
                </h2>
                <p className="leading-relaxed text-moon-300">
                  {aiRelation?.advice ?? result.advice}
                </p>
              </div>
            </GlassCard>
          </div>

          {/* 星象依据 */}
          <section aria-labelledby="relationship-evidence-heading" className="mb-5">
            <h2
              id="relationship-evidence-heading"
              className="mb-3 text-sm tracking-[0.18em] text-moon-500"
            >
              星象依据
            </h2>

            <div className="flex flex-col gap-3">
              <GlassCard glow="none" interactive>
                <details className="group p-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-3">
                      <SparkleIcon className="h-4 w-4 text-gold-300" />
                      <span className="text-sm text-moon-200">行星位置对比</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline text-moon-400 transition-transform duration-300 group-open:rotate-180"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </span>
                  </summary>
                  <div className="animate-fade-up mt-5 overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">
                        你与{name.trim() || "TA"}的行星位置对比
                      </caption>
                      <thead>
                        <tr className="border-b border-white/[0.08]">
                          <th className="pb-2 pr-3 text-left text-xs font-normal text-moon-500">
                            行星
                          </th>
                          <th className="px-3 pb-2 text-center text-xs font-normal text-moon-500">
                            你
                          </th>
                          <th className="px-3 pb-2 text-center text-xs font-normal text-moon-500">
                            {name.trim() || "TA"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.positionsA.map((pa, i) => {
                          const pb = result.positionsB[i];
                          return (
                            <tr
                              key={pa.planet}
                              className="border-b border-white/[0.04] last:border-none"
                            >
                              <td className="py-2.5 pr-3 text-moon-400">
                                {pa.label}
                              </td>
                              <td className="px-3 py-2.5 text-center text-moon-200">
                                {pa.signSymbol} {pa.signName} {pa.degree}°
                              </td>
                              <td className="px-3 py-2.5 text-center text-moon-200">
                                {pb.signSymbol} {pb.signName} {pb.degree}°
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              </GlassCard>

              {result.factors.length > 0 && (
                <GlassCard glow="none" interactive>
                  <details className="group p-card">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-5 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-3">
                        <SparkleIcon className="h-4 w-4 text-lav-300" />
                        <span className="text-sm text-moon-200">关系指数构成</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline text-moon-400 transition-transform duration-300 group-open:rotate-180"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </span>
                    </summary>
                    <ul className="animate-fade-up mt-5 flex flex-col gap-3">
                      {result.factors.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 border-b border-white/[0.05] pb-3 last:border-none last:pb-0"
                        >
                          <span
                            className={`inline-flex h-7 min-w-[2.75rem] items-center justify-center rounded-full px-2 text-xs font-medium ${
                              f.type === "positive"
                                ? "bg-lav-400/15 text-lav-200"
                                : "bg-moon-500/15 text-moon-300"
                            }`}
                          >
                            {f.weight > 0 ? "+" : ""}
                            {f.weight}
                          </span>
                          <span className="text-sm leading-relaxed text-moon-300">
                            {f.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </GlassCard>
              )}

              {result.synastryAspects.length > 0 && (
                <GlassCard glow="none" interactive>
                  <details className="group p-card">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-5 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-3">
                        <HeartIcon className="h-4 w-4 text-moon-400" />
                        <span className="text-sm text-moon-200">两人的星盘相位</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline text-moon-400 transition-transform duration-300 group-open:rotate-180"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </span>
                    </summary>
                    <div className="animate-fade-up mt-5 flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2">
                        {result.synastryAspects.slice(0, 12).map((asp, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-hairline bg-white/[0.04] px-3.5 py-1.5 text-xs text-moon-300"
                          >
                            {asp.label}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs leading-relaxed text-moon-500">
                        相位是两颗行星之间的角度关系，用来观察彼此互动时可能出现的节奏与张力。
                      </p>
                    </div>
                  </details>
                </GlassCard>
              )}
            </div>
          </section>

          {/* 分享卡 */}
          <GlassCard glow="gold">
            <div className="flex flex-col gap-6 p-card">
              <ShareCardFrame id="share-relation">
                <div className="text-center">
                  <p className="text-[13px] tracking-[0.28em] text-[#9B8EC4]">
                    你们之间的关系
                  </p>
                  <p className="mt-3 text-[26px] font-semibold text-[#F2EFF8]">
                    你 × {name.trim() || "TA"}
                  </p>
                </div>
                <div className="mt-8 flex items-end justify-center gap-2">
                  <span className="text-[56px] font-semibold leading-none text-[#DCC18C]">
                    {result.score}
                  </span>
                  <span className="pb-1.5 text-[12px] text-[#9E98B3]">
                    关系指数
                  </span>
                </div>
                <div className="mt-8 flex flex-wrap justify-center gap-2 px-2">
                  {(aiRelation?.keywords ?? result.keywords).map((k) => (
                    <span
                      key={k}
                      className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-[12px] text-[#E4E0EE]"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </ShareCardFrame>
              <div className="flex flex-wrap justify-center gap-3">
                <SaveShareButton
                  targetId="share-relation"
                  filename="星语星愿-关系星图.png"
                />
                <StarButton
                  variant={copied ? "lav" : "glass"}
                  size="sm"
                  onClick={copyShare}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      已复制链接
                    </>
                  ) : (
                    "复制分享链接"
                  )}
                </StarButton>
              </div>
            </div>
          </GlassCard>
          {/* 星邮入口 */}
          <GlassCard glow="gold">
            <div className="flex flex-col items-center gap-4 px-card py-12 text-center">
              <p className="display-zh text-xl text-moon-200 md:text-2xl">
                你和 Ta 的星星已经相遇。
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-moon-400">
                还有一句话，你一直没有告诉 Ta 吗？
              </p>
              <StarButton href="/mail" size="lg" arrow>
                写封信给 Ta
              </StarButton>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
