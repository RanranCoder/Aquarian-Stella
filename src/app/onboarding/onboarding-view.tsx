"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { CheckIcon, SparkleIcon, StarIcon } from "@/components/icons";
import { store, useMounted, pushProfileToServer } from "@/lib/store";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import { findCity } from "@/data/cities";
import type { BirthProfile } from "@/lib/astrology";

const STEPS = ["生日", "时间", "地点", "方向", "生成"] as const;

const INTERESTS = ["爱情", "自我", "情绪", "事业", "人际"] as const;

/** 出生日期范围：1949 至今 */
const BIRTH_MIN = "1949-01-01";
const BIRTH_MAX = (() => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
})();

type TimeChoice = "exact" | "approximate" | "unknown";

const TIME_REQUIRED_ERROR = "请选择完整的出生时间（时和分）。";
const CITY_REQUIRED_ERROR = "请先选择已识别的城市，或清空输入后跳过。";

function isValidBirthTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function OnboardingPage() {
  const router = useRouter();
  const mounted = useMounted();
  const s = store.useStore();
  const auth = useAuth();
  const existing = mounted ? s.profile : null;

  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);

  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [timeChoice, setTimeChoice] = useState<TimeChoice | null>(null);
  const [time, setTime] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [prefilled, setPrefilled] = useState(false);
  const timeErrorId = useId();
  const formErrorId = useId();
  const cityFeedbackId = useId();
  const nicknameInputId = useId();
  const cityInputId = useId();

  const enteredCity = city.trim();
  const recognizedCity = findCity(enteredCity);
  const cityIsUnrecognized = Boolean(enteredCity && !recognizedCity);
  const requiresBirthTime =
    timeChoice === "exact" || timeChoice === "approximate";

  // 已建档用户：进入即预填现有资料（一次性，后续由用户自行编辑）
  useEffect(() => {
    if (!mounted || !existing || prefilled) return;
    /* eslint-disable react-hooks/set-state-in-effect -- 一次性从持久化档案同步表单，合法外部状态初始化 */
    setNickname(existing.nickname);
    setBirthDate(existing.birthDate);
    setTimeChoice(existing.birthTimeAccuracy ?? null);
    setTime(existing.birthTime ?? "");
    setCity(existing.birthCity ?? "");
    setInterests(existing.interests);
    setPrefilled(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [mounted, existing, prefilled]);

  const isEditing = mounted && !!existing;

  function toggleInterest(i: string) {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  }

  function handleNext() {
    if (step === 0 && birthDate.length !== 10) {
      setError("请先在日历中选择你的出生日期");
      return;
    }
    if (step === 1 && timeChoice === null) {
      setError("请先选择一项：准确时间 / 大概时间 / 不知道");
      return;
    }
    if (
      step === 1 &&
      requiresBirthTime &&
      !isValidBirthTime(time)
    ) {
      setError(TIME_REQUIRED_ERROR);
      return;
    }
    if (step === 2 && cityIsUnrecognized) {
      setError(CITY_REQUIRED_ERROR);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  function finish() {
    if (requiresBirthTime && !isValidBirthTime(time)) {
      setStep(1);
      setError(TIME_REQUIRED_ERROR);
      return;
    }
    if (cityIsUnrecognized) {
      setStep(2);
      setError(CITY_REQUIRED_ERROR);
      return;
    }
    setGenerating(true);
    const profile: BirthProfile = {
      nickname: nickname.trim(),
      birthDate,
      birthTime: requiresBirthTime ? time : undefined,
      birthTimeAccuracy: timeChoice ?? "unknown",
      birthCity: recognizedCity?.name,
      interests,
    };
    store.set((s) => ({ ...s, onboarded: true, profile, profileUpdatedAt: Date.now() }));
    // 静默推送档案到云端（失败保留本地，下次登录/编辑重试）
    void pushProfileToServer();
    // 编辑已有档案时跳过"正在整理星象"假延迟，快速回到今日星语
    window.setTimeout(() => router.push("/today"), isEditing ? 400 : 2200);
  }

  // 加载登录状态中
  if (auth.status === "loading") {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center text-sm text-moon-500">
        加载中…
      </div>
    );
  }

  // 未登录：先登录再填写出生信息
  if (auth.status === "anonymous") {
    return (
      <div className="mx-auto max-w-xl px-6 pt-16 pb-24 md:py-24">
        <GlassCard glow="lav">
          <div className="flex flex-col items-center gap-5 px-card py-10 text-center">
            <SparkleIcon className="h-8 w-8 text-lav-300" />
            <h1 className="display-zh text-2xl">登录后，再认识你的星星</h1>
            <p className="max-w-sm text-sm leading-relaxed text-moon-400">
              登录后才可以填写出生信息、生成你的星盘与今日星语。
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-moon-500">
              出生信息仅用于生成你的星盘，可在个人中心修改或删除。
            </p>
            <StarButton href="/login" arrow>
              去登录
            </StarButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 pt-10 pb-24 md:py-16">
      {/* 进度 */}
      <div
        className="mb-10 flex w-full max-w-[320px] items-center justify-between gap-1"
        role="progressbar"
        aria-label="建档进度"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        aria-valuetext={`第 ${step + 1} 步，共 ${STEPS.length} 步：${STEPS[step]}`}
      >
        {STEPS.map((label, i) => (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-1">
            <span
              aria-hidden="true"
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full border text-xs transition-all duration-300",
                i < step
                  ? "border-gold-400 bg-gold-400/15 text-gold-200"
                  : i === step
                    ? "border-lav-400 bg-lav-400/15 text-lav-200"
                    : "border-hairline text-moon-500",
              )}
            >
              {i < step ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px min-w-1 flex-1 transition-colors",
                  i < step ? "bg-gold-400/50" : "bg-hairline",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <GlassCard glow="lav" className="w-full">
        <div className="p-card md:p-10">
          {!generating ? (
            <>
              <div key={step} className="animate-fade-up flex flex-col gap-8">
                {/* Step 0 · 生日 */}
                {step === 0 && (
                  <>
                    <div>
                      <h1 className="display-zh text-2xl md:text-3xl">
                        你的生日是什么？
                      </h1>
                      <p className="mt-2 text-sm text-moon-400">
                        太阳星座由生日决定，这是星语的第一块基石。
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-moon-500">
                        出生信息仅用于生成你的星盘，可在个人中心修改或删除。
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-moon-500">出生日期</label>
                      <DatePicker
                        value={birthDate}
                        onChange={setBirthDate}
                        min={BIRTH_MIN}
                        max={BIRTH_MAX}
                        ariaLabel="出生日期"
                        ariaDescribedBy={
                          error === "请先在日历中选择你的出生日期"
                            ? formErrorId
                            : undefined
                        }
                      />
                    </div>
                  </>
                )}

                {/* Step 1 · 出生时间 */}
                {step === 1 && (
                  <>
                    <div>
                      <h1 className="display-zh text-2xl md:text-3xl">
                        你知道自己的出生时间吗？
                      </h1>
                      <p className="mt-2 text-sm text-moon-400">
                        上升星座与月亮位置需要它。越准确，星盘越完整。
                      </p>
                    </div>
                    <div
                      className="flex flex-col gap-3"
                      role="radiogroup"
                      aria-label="出生时间准确度"
                    >
                      {[
                        { key: "exact" as const, label: "准确时间", sub: "我能给出具体几点几分" },
                        { key: "approximate" as const, label: "大概时间", sub: "我记得大概，比如早晨或晚上" },
                        { key: "unknown" as const, label: "不知道", sub: "没有关系，仍可继续" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          role="radio"
                          aria-checked={timeChoice === opt.key}
                          onClick={() => {
                            setTimeChoice(opt.key);
                            setError("");
                          }}
                          className={cn(
                            "flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-all duration-300",
                            timeChoice === opt.key
                              ? "border-lav-400 bg-lav-400/10"
                              : "border-hairline bg-white/[0.03] hover:border-white/20",
                          )}
                        >
                          <div>
                            <p className="text-[15px] text-moon-100">
                              {opt.label}
                            </p>
                            <p className="text-sm text-moon-500">{opt.sub}</p>
                          </div>
                          <span
                            className={cn(
                              "grid h-6 w-6 place-items-center rounded-full border",
                              timeChoice === opt.key
                                ? "border-lav-400 bg-lav-400 text-night-950"
                                : "border-hairline",
                            )}
                          >
                            {timeChoice === opt.key && (
                              <CheckIcon className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </button>
                      ))}
                      {timeChoice !== null && timeChoice !== "unknown" && (
                        <div className="animate-fade-up mt-2 flex flex-col gap-2">
                          <label className="text-xs text-moon-500">
                            出生时间
                          </label>
                          <TimePicker
                            value={time}
                            onChange={(value) => {
                              setTime(value);
                              setError("");
                            }}
                            ariaLabel="出生时间"
                            ariaDescribedBy={
                              error === TIME_REQUIRED_ERROR ? timeErrorId : undefined
                            }
                            className="w-full max-w-[220px]"
                          />
                          {error === TIME_REQUIRED_ERROR && (
                            <p
                              id={timeErrorId}
                              role="alert"
                              aria-live="assertive"
                              className="flex items-center gap-1.5 text-sm text-red-300"
                            >
                              <span aria-hidden="true">⚠</span>
                              {error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Step 2 · 出生地 */}
                {step === 2 && (
                  <>
                    <div>
                      <h1 className="display-zh text-2xl md:text-3xl">
                        你出生在哪里？
                      </h1>
                      <p className="mt-2 text-sm text-moon-400">
                        城市级别即可，用于定位你的地理星空。也可以跳过。
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor={cityInputId} className="text-xs text-moon-500">出生城市</label>
                      <input
                        id={cityInputId}
                        type="text"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setError("");
                        }}
                        placeholder="输入城市，如 广州"
                        aria-invalid={cityIsUnrecognized}
                        aria-describedby={cityFeedbackId}
                        className="h-12 w-full rounded-xl border border-hairline bg-white/[0.04] px-4 text-[15px] text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400"
                      />
                      {enteredCity ? (
                        recognizedCity ? (
                          <p
                            id={cityFeedbackId}
                            aria-live="polite"
                            className="text-xs text-gold-200"
                          >
                            已识别为「{recognizedCity.name}」，将用于定位你的地理星空。
                          </p>
                        ) : (
                          <p
                            id={cityFeedbackId}
                            aria-live="polite"
                            className="text-xs leading-relaxed text-red-300"
                          >
                            暂未识别这个城市。请尝试城市名，如「广州」，或清空后跳过。
                          </p>
                        )
                      ) : (
                        <p id={cityFeedbackId} className="text-xs text-moon-500">
                          如果不确定，可以先跳过，之后在个人中心补充。
                        </p>
                      )}
                      {error === CITY_REQUIRED_ERROR && (
                        <p
                          role="alert"
                          aria-live="assertive"
                          className="flex items-center gap-1.5 text-sm text-red-300"
                        >
                          <span aria-hidden="true">⚠</span>
                          {error}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Step 3 · 兴趣方向 */}
                {step === 3 && (
                  <>
                    <div>
                      <h1 className="display-zh text-2xl md:text-3xl">
                        最近，你更想了解什么？
                      </h1>
                      <p className="mt-2 text-sm text-moon-400">
                        帮助我们为你挑选更贴近的星语主题，可多选。
                      </p>
                    </div>
                    <div
                      className="grid grid-cols-2 gap-3"
                      role="group"
                      aria-label="感兴趣的星语方向，可多选"
                    >
                      {INTERESTS.map((it) => {
                        const active = interests.includes(it);
                        return (
                          <button
                            key={it}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleInterest(it)}
                            className={cn(
                              "flex items-center justify-center gap-2 rounded-xl border px-5 py-4 text-[15px] transition-all duration-300",
                              active
                                ? "border-gold-400 bg-gold-400/10 text-gold-200"
                                : "border-hairline bg-white/[0.03] text-moon-200 hover:border-white/20",
                            )}
                          >
                            {active && <CheckIcon className="h-4 w-4" />}
                            {it}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Step 4 · 生成 */}
                {step === 4 && (
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div className="w-full text-left">
                      <label htmlFor={nicknameInputId} className="text-xs text-moon-500">
                        怎么称呼你？（可选）
                      </label>
                      <input
                        id={nicknameInputId}
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="输入你的昵称"
                        maxLength={12}
                        className="mt-2 h-12 w-full rounded-xl border border-hairline bg-white/[0.04] px-4 text-[15px] text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400"
                      />
                    </div>
                    <div className="relative mt-1">
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-b from-gold-200 to-gold-400 text-night-950 shadow-[0_0_44px_rgba(201,169,110,0.45)]">
                        <StarIcon className="h-8 w-8" />
                      </span>
                      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-lav-400 text-[11px] text-night-950">
                        ✦
                      </span>
                    </div>
                    <div>
                      <h1 className="display-zh text-2xl md:text-3xl">
                        {isEditing
                          ? `${nickname || "星星"}，确认你的星语资料`
                          : `${nickname || "星星"}，准备好听见你的星语了吗？`}
                      </h1>
                      <p className="mt-3 text-sm leading-relaxed text-moon-400">
                        {isEditing ? (
                          "确认无误后保存修改。出生时间越准确，上升星座越完整。"
                        ) : (
                          <>
                            我们正在为你整理
                            <br />
                            ✦ 解析太阳 · ☽ 计算月亮 · ↑ 定位上升
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="mt-10">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setError("");
                      setStep((s) => Math.max(0, s - 1));
                    }}
                    className={cn(
                      "inline-flex min-h-11 items-center text-sm text-moon-500 transition-colors hover:text-moon-200",
                      step === 0 && "invisible",
                    )}
                  >
                    上一步
                  </button>
                  {step < STEPS.length - 1 ? (
                    <StarButton size="md" arrow onClick={handleNext}>
                      继续
                    </StarButton>
                  ) : (
                    <StarButton size="md" arrow onClick={finish}>
                      {isEditing ? "保存修改" : "生成我的星语"}
                    </StarButton>
                  )}
                </div>
                {error &&
                  error !== TIME_REQUIRED_ERROR &&
                  error !== CITY_REQUIRED_ERROR && (
                  <p id={formErrorId} className="animate-fade-up mt-4 flex items-center justify-center gap-1.5 text-center text-sm text-red-300">
                    <span aria-hidden="true">⚠</span>
                    {error}
                  </p>
                  )}
              </div>
            </>
          ) : (
            // 生成动画
            <div className="flex min-h-[22rem] flex-col items-center justify-center gap-8 text-center">
              <div className="relative">
                <div className="animate-orbit h-24 w-24 rounded-full border border-white/[0.1]">
                  <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-gold-300 shadow-[0_0_12px_rgba(220,193,140,0.9)]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <SparkleIcon className="animate-breathe h-6 w-6 text-lav-300" />
                </div>
              </div>
              <div>
                <p className="display-zh text-xl">正在为你整理星象…</p>
                <p className="mt-3 text-sm text-moon-400">
                  ✦ 解析太阳 · ☽ 计算月亮 · ↑ 定位上升
                </p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
