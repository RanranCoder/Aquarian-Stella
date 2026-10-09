"use client";

import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { SparkleIcon } from "@/components/icons";
import { store, useMounted } from "@/lib/store";
import { getSunSignFromDate } from "@/lib/astrology";
import { getDailyHoroscope } from "@/lib/daily";
import { localDateStr, formatDateCN } from "@/lib/format";

/** 首页 · 今日星语预览：已建档展示个性化内容，否则给示例 + 引导 */
export function TodayPreview() {
  const mounted = useMounted();
  const s = store.useStore();
  const today = mounted ? localDateStr() : "";

  const profile = mounted ? s.profile : null;
  const h = profile
    ? getDailyHoroscope(getSunSignFromDate(profile.birthDate), today, profile)
    : null;

  return (
    <GlassCard glow="lav" className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-6 p-8 md:p-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gold-300">
            <SparkleIcon className="h-4 w-4" />
            <span className="text-sm tracking-wide">今日星语</span>
          </div>
          <span className="text-sm text-moon-500">
            {today ? formatDateCN(today) : "加载中…"}
          </span>
        </div>

        {h ? (
          <>
            <p className="display-zh text-2xl leading-snug text-moon-100 md:text-[1.75rem]">
              {h.theme.core}
            </p>
            <p className="max-w-lg leading-relaxed text-moon-400">
              {h.theme.expand}
            </p>
            <div className="flex flex-wrap gap-2">
              {h.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-sm text-lav-200"
                >
                  {k}
                </span>
              ))}
            </div>
            <StarButton href="/today" variant="glass" size="sm" arrow>
              查看我的星语
            </StarButton>
          </>
        ) : (
          <>
            <p className="display-zh text-2xl leading-snug text-moon-100 md:text-[1.75rem]">
              “今天，慢一点也没关系。”
            </p>
            <p className="max-w-lg leading-relaxed text-moon-400">
              有些事情并不是没有答案，只是现在还没有到必须做决定的时候。今天更适合整理自己的情绪，而不是急着回应别人。
            </p>
            <div className="flex flex-wrap gap-2">
              {["边界", "沉淀", "重新开始"].map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-sm text-lav-200"
                >
                  {k}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <StarButton href="/onboarding" size="sm" arrow>
                生成我的星语
              </StarButton>
              <span className="text-sm text-moon-500">
                输入出生信息，拥有专属于你的今日星语
              </span>
            </div>
          </>
        )}
      </div>
    </GlassCard>
  );
}
