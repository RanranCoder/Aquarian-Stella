"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { AccountCard } from "@/components/AccountCard";
import { StarButton } from "@/components/StarButton";
import {
  ShieldIcon,
  SettingsIcon,
  CheckIcon,
  SparkleIcon,
} from "@/components/icons";
import { store, useMounted, motionPref } from "@/lib/store";
import { useAuth } from "@/lib/use-auth";
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
  const auth = useAuth();
  const profile = mounted ? s.profile : null;

  const [confirmLocal, setConfirmLocal] = useState(false);
  const [confirmCloud, setConfirmCloud] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cleaned, setCleaned] = useState<"local" | "cloud" | null>(null);
  const [dataError, setDataError] = useState("");
  const motionOn = motionPref.useValue();

  function toggleMotion() {
    motionPref.set(!motionOn);
  }

  function clearLocal() {
    // 清本机：store + 星邮草稿 + 动效偏好 + 同步元信息
    store.set(() => ({
      onboarded: false,
      profile: null,
      wishes: [],
      ownerUid: undefined,
      profileUpdatedAt: undefined,
      pendingDeletes: [],
      lastPushedAt: undefined,
    }));
    try {
      window.localStorage.removeItem("xingyu-starmail-draft");
    } catch {
      // 忽略
    }
    setCleaned("local");
    window.setTimeout(() => setCleaned(null), 1800);
  }

  async function clearCloud() {
    setDataError("");
    setBusy(true);
    try {
      const res = await fetch("/api/account/data/clear", { method: "POST" });
      if (!res.ok) {
        setDataError("云端数据清除失败，请稍后重试。");
        return;
      }
      clearLocal();
      setCleaned("cloud");
    } catch {
      setDataError("无法连接服务器，请检查网络后重试。");
    } finally {
      setBusy(false);
    }
  }

  const sun = profile ? getSunSignFromDate(profile.birthDate) : null;

  // 未登录：只展示账号卡片，不显示出生信息等个人资料
  if (auth.status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center text-sm text-moon-500">
        加载中…
      </div>
    );
  }

  if (auth.status === "anonymous") {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-lav-300">
            <SparkleIcon className="h-3 w-3" />
            个人中心
          </span>
        </div>
        <div className="mt-6">
          <AccountCard />
        </div>
        <p className="mt-6 text-center text-sm text-moon-500">
          登录后即可管理你的出生信息与星愿。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16">
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-lav-300">
          <SparkleIcon className="h-3 w-3" />
          个人中心
        </span>
      </div>

      <div className="mt-8">
        <AccountCard />
      </div>

      {/* 资料卡 */}
      <GlassCard glow="lav" className="mt-6 mb-5">
        <div className="flex flex-col gap-6 p-card md:flex-row md:items-center md:gap-8">
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
                修改资料
              </StarButton>
            </div>
          )}
        </div>
      </GlassCard>

      {/* 出生资料 */}
      <GlassCard glow="none" className="mb-5">
        <div className="p-card">
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
        <div className="p-card">
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
        <div className="p-card">
          <h2 className="mb-4 flex items-center gap-2 text-sm tracking-[0.18em] text-moon-500">
            <ShieldIcon className="h-4 w-4" />
            隐私
          </h2>
          <p className="leading-relaxed text-moon-400">
            登录后，你的出生资料与星愿会保存到你的账号下，换设备登录即可找回；未登录时仅保存在这台设备。
          </p>
        </div>
      </GlassCard>

      {/* 显示设置 */}
      <GlassCard glow="none" className="mb-5">
        <div className="p-card">
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
              aria-pressed={motionOn}
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

      {/* 数据管理 */}
      <GlassCard glow="none">
        <div className="p-card">
          <h2 className="mb-4 text-sm tracking-[0.18em] text-moon-500">
            数据管理
          </h2>
          <div className="flex flex-col gap-6">
            {/* 清本机 */}
            <div className="flex flex-col gap-2">
              <p className="text-sm text-moon-500">
                清除本机数据：删除这台设备上的出生资料、星愿与草稿。登录状态下云端保留，之后仍可恢复。
              </p>
              {confirmLocal ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={clearLocal}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors",
                      cleaned
                        ? "bg-lav-400/20 text-lav-200"
                        : "border border-red-400/50 text-red-300 hover:bg-red-400/10",
                    )}
                  >
                    {cleaned ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        已清除
                      </>
                    ) : (
                      "确认清除本机"
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmLocal(false)}
                    className="flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm text-moon-400"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmLocal(true)}
                  className="flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm text-moon-400 transition-colors hover:border-red-400/50 hover:text-red-300"
                >
                  清除本机数据
                </button>
              )}
            </div>

            {/* 清云端 */}
            {auth.status === "authenticated" && (
              <div className="flex flex-col gap-2 border-t border-white/[0.05] pt-5">
                <p className="text-sm text-moon-500">
                  清除云端数据：删除账号下的出生资料与星愿（保留账号与邮箱）。此操作无法撤销。
                </p>
                {confirmCloud ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={clearCloud}
                      disabled={busy}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors",
                        cleaned === "cloud"
                          ? "bg-lav-400/20 text-lav-200"
                          : "border border-red-400/50 text-red-300 hover:bg-red-400/10",
                      )}
                    >
                      {cleaned === "cloud" ? (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          已清除云端
                        </>
                      ) : (
                        "确认清除云端"
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmCloud(false)}
                      className="flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm text-moon-400"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmCloud(true)}
                    disabled={busy}
                    className="flex min-h-11 items-center rounded-full border border-hairline px-4 py-2 text-sm text-moon-400 transition-colors hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
                  >
                    清除云端数据
                  </button>
                )}
                {dataError && <p role="alert" className="text-sm text-red-300">{dataError}</p>}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
