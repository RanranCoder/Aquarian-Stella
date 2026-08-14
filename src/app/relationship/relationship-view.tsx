"use client";

import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { DatePicker } from "@/components/DatePicker";
import {
  HeartIcon,
  SparkleIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChevronLeftIcon,
} from "@/components/icons";
import { store, useMounted } from "@/lib/store";
import { getSunSignFromDate } from "@/lib/astrology";
import { getRelation } from "@/lib/relation";
import { ShareCardFrame } from "@/components/ShareCardFrame";
import { SaveShareButton } from "@/components/SaveShareButton";

/** TA 出生日期范围 */
const TA_MIN = "1930-01-01";
const TA_MAX = (() => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
})();

export function RelationshipPage() {
  const mounted = useMounted();
  const s = store.useStore();
  const profile = mounted ? s.profile : null;

  const [name, setName] = useState("");
  const [taDate, setTaDate] = useState("");
  const [result, setResult] = useState<ReturnType<typeof getRelation> | null>(null);
  const [copied, setCopied] = useState(false);

  const canGenerate = taDate.length === 10;

  function generate() {
    if (!profile || !canGenerate) return;
    const mySign = getSunSignFromDate(profile.birthDate);
    const taSign = getSunSignFromDate(taDate);
    setResult(getRelation(mySign, taSign));
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
      <div className="mx-auto max-w-xl px-6 py-16 md:py-24">
        <GlassCard glow="lav">
          <div className="flex flex-col items-center gap-5 px-8 py-14 text-center">
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      {/* 输入 */}
      {!result && (
        <GlassCard glow="lav">
          <div className="flex flex-col gap-8 p-8 md:p-10">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-gold-300">
                <HeartIcon className="h-3 w-3" />
                关系星图
              </span>
              <h1 className="display-zh mt-5 text-3xl">
                你和 TA 的星星，如何相遇
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-moon-400">
                输入 TA 的出生信息。不知道具体时间也没关系，生日就足够了。
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
            <div className="flex flex-col items-center gap-6 p-8 text-center md:p-10">
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
                {result.keywords.map((k) => (
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

          {/* 优势 */}
          <GlassCard glow="none" className="mb-5">
            <div className="flex flex-col gap-5 p-8">
              <h2 className="flex items-center gap-2 text-sm tracking-[0.18em] text-lav-300">
                <SparkleIcon className="h-4 w-4" />
                容易被彼此吸引的地方
              </h2>
              <ul className="flex flex-col gap-4">
                {result.attraction.map((t, i) => (
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
            <div className="flex flex-col gap-5 p-8">
              <h2 className="flex items-center gap-2 text-sm tracking-[0.18em] text-moon-500">
                <HeartIcon className="h-4 w-4" />
                最容易产生误解的地方
              </h2>
              <ul className="flex flex-col gap-4">
                {result.misunderstanding.map((t, i) => (
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
              <div className="flex flex-col gap-4 p-8">
                <h2 className="text-sm tracking-[0.18em] text-lav-300">
                  这段关系可能带来的成长
                </h2>
                <p className="leading-relaxed text-moon-300">
                  {result.growth}
                </p>
              </div>
            </GlassCard>
            <GlassCard glow="gold">
              <div className="flex flex-col gap-4 p-8">
                <h2 className="text-sm tracking-[0.18em] text-gold-300">
                  给你们的建议
                </h2>
                <p className="leading-relaxed text-moon-300">
                  {result.advice}
                </p>
              </div>
            </GlassCard>
          </div>

          {/* 分享卡 */}
          <GlassCard glow="gold">
            <div className="flex flex-col gap-6 p-8">
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
                  {result.keywords.map((k) => (
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
                    <>
                      <ArrowUpRightIcon className="h-4 w-4" />
                      复制分享链接
                    </>
                  )}
                </StarButton>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
