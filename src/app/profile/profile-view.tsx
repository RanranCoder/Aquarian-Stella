"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { AccountCard } from "@/components/AccountCard";
import { StarButton } from "@/components/StarButton";
import {
  ShieldIcon,
  SettingsIcon,
  EditIcon,
  CheckIcon,
  SparkleIcon,
} from "@/components/icons";
import { store, useMounted, motionPref } from "@/lib/store";
import { getSunSignFromDate } from "@/lib/astrology";
import { formatDateCN } from "@/lib/format";
import { cn } from "@/lib/utils";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] py-3.5 last:border-none">
      <span className="text-sm text-moon-500">{label}</span>
      <span className="text-[15px] text-moon-200">{value || "未填写"}</span>
    </div>
  );
}

export function ProfilePage() {
  const mounted = useMounted();
  const s = store.useStore();
  const profile = mounted ? s.profile : null;

  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const motionOn = motionPref.useValue();

  function toggleMotion() {
    motionPref.set(!motionOn);
  }

  function clearAll() {
    store.set(() => ({ onboarded: false, profile: null, wishes: [] }));
    setCleared(true);
    window.setTimeout(() => setCleared(false), 1800);
  }

  const sun = profile ? getSunSignFromDate(profile.birthDate) : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-lav-300">
        <SparkleIcon className="h-3 w-3" />
        个人中心
      </span>

      <AccountCard />

      {/* 资料卡 */}
      <GlassCard glow="lav" className="mt-6 mb-5">
        <div className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:gap-8">
          <div className="relative mx-auto md:mx-0">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-b from-lav-300 to-lav-500 text-3xl font-medium text-night-950">
              {(profile?.nickname || "星").slice(0, 1)}
            </span>
            <span className="absolute -right-1 -bottom-1 grid h-8 w-8 place-items-center rounded-full border border-hairline bg-night-900 text-gold-300">
              {sun?.symbol}
            </span>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="display-zh text-2xl md:text-3xl">
              {profile?.nickname || "星星"}
            </h1>
            <p className="mt-2 text-sm text-moon-400">
              {sun ? `太阳 · ${sun.name}` : "完成出生信息，解锁你的星盘"}
            </p>
            {sun && (
              <p className="mt-1 text-sm text-moon-500">
                {sun.en} · {sun.dateRange}
              </p>
            )}
          </div>
          {profile && (
            <div className="flex justify-center">
              <StarButton
                href="/onboarding"
                variant="glass"
                size="sm"
                arrow={false}
              >
                <EditIcon className="h-4 w-4" />
                修改资料
              </StarButton>
            </div>
          )}
        </div>
      </GlassCard>

      {/* 出生资料 */}
      <GlassCard glow="none" className="mb-5">
        <div className="p-8">
          <h2 className="mb-4 text-sm tracking-[0.18em] text-moon-500">
            出生资料
          </h2>
          {profile ? (
            <div>
              <Row label="出生日期" value={formatDateCN(profile.birthDate)} />
              <Row
                label="出生时间"
                value={
                  profile.birthTime
                    ? `${profile.birthTime}${
                        profile.birthTimeAccuracy === "approximate" ? "（大概）" : ""
                      }`
                    : profile.birthTimeAccuracy === "unknown"
                      ? "不知道"
                      : ""
                }
              />
              <Row label="出生地" value={profile.birthCity ?? ""} />
              <Row label="关注方向" value={profile.interests.join(" · ")} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-sm text-moon-500">还没有出生资料</p>
              <StarButton href="/onboarding" size="sm">
                开始探索
              </StarButton>
            </div>
          )}
        </div>
      </GlassCard>

      {/* 我的历史 */}
      <GlassCard glow="none" className="mb-5">
        <div className="p-8">
          <h2 className="mb-4 text-sm tracking-[0.18em] text-moon-500">
            我的历史
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "星愿总数", value: mounted ? s.wishes.length : 0 },
              { label: "进行中", value: mounted ? s.wishes.filter((w) => w.status === "active").length : 0 },
              { label: "已实现", value: mounted ? s.wishes.filter((w) => w.status === "done").length : 0 },
            ].map((x) => (
              <div
                key={x.label}
                className="flex flex-col items-center gap-1 rounded-2xl border border-hairline bg-white/[0.03] py-5"
              >
                <span className="display-zh text-2xl text-gold-300">{x.value}</span>
                <span className="text-xs text-moon-500">{x.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center">
            <Link
              href="/wishes"
              className="text-sm text-lav-300 underline-offset-4 hover:underline"
            >
              查看我的星愿
            </Link>
          </div>
        </div>
      </GlassCard>

      {/* 隐私 */}
      <GlassCard glow="none" className="mb-5">
        <div className="p-8">
          <h2 className="mb-4 flex items-center gap-2 text-sm tracking-[0.18em] text-moon-500">
            <ShieldIcon className="h-4 w-4" />
            隐私
          </h2>
          <p className="leading-relaxed text-moon-400">
            你的账号信息（邮箱）存储于服务器；出生资料与星愿仍只保存在这台设备的浏览器里。
          </p>
        </div>
      </GlassCard>

      {/* 显示设置 */}
      <GlassCard glow="none" className="mb-5">
        <div className="p-8">
          <h2 className="mb-4 flex items-center gap-2 text-sm tracking-[0.18em] text-moon-500">
            <SettingsIcon className="h-4 w-4" />
            显示设置
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] text-moon-200">星空动效</p>
              <p className="text-xs text-moon-500">关闭后减少星点与轨道动画</p>
            </div>
            <button
              onClick={toggleMotion}
              aria-label="切换动效"
              className={cn(
                "relative h-11 w-16 rounded-full border transition-colors duration-300",
                motionOn ? "border-lav-400 bg-lav-400/30" : "border-hairline bg-white/[0.05]",
              )}
            >
              <span
                className={cn(
                  "absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full transition-all duration-300",
                  motionOn ? "right-1.5 bg-lav-200" : "left-1.5 bg-moon-500",
                )}
              />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* 清除数据 */}
      <GlassCard glow="none">
        <div className="p-8">
          <h2 className="mb-4 text-sm tracking-[0.18em] text-moon-500">
            数据管理
          </h2>
          <div className="flex flex-col items-center gap-4">
            <p className="text-center text-sm text-moon-500">
              清除后，出生资料与星愿将永久从这台设备删除。
            </p>
            {confirmClear ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={clearAll}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors",
                    cleared
                      ? "bg-lav-400/20 text-lav-200"
                      : "border border-red-400/50 text-red-300 hover:bg-red-400/10",
                  )}
                >
                  {cleared ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      已清除
                    </>
                  ) : (
                    "确认清除"
                  )}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm text-moon-400"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm text-moon-400 transition-colors hover:border-red-400/50 hover:text-red-300"
              >
                清除所有数据
              </button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
