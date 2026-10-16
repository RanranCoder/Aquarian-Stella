"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Turnstile } from "@/components/Turnstile";
import { notifyAuthChange } from "@/lib/use-auth";

const INPUT_CLASS =
  "h-12 w-full rounded-xl border border-hairline bg-white/[0.04] px-4 text-base text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400";

type AccountState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; email: string };

function errorText(e?: string): string {
  switch (e) {
    case "INVALID_EMAIL": return "邮箱格式不正确";
    case "TURNSTILE_FAILED": return "人机验证未通过，请重试";
    case "RATE_LIMITED": return "发送太频繁，请稍后再试";
    case "NO_CODE": return "请先获取验证码";
    case "EXPIRED": return "验证码已过期，请重新获取";
    case "WRONG_CODE": return "验证码不正确";
    case "TOO_MANY_ATTEMPTS": return "尝试次数过多，请重新获取验证码";
    case "INVALID_CODE": return "请输入 6 位数字验证码";
    default: return "操作失败，请稍后重试";
  }
}

export function AccountCard({ onAuthed }: { onAuthed?: () => void }) {
  const emailId = useId();
  const codeId = useId();
  const errorId = useId();
  const [state, setState] = useState<AccountState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<null | "send" | "verify" | "logout">(null);
  const [cooldown, setCooldown] = useState(0);
  const emailInvalid = error === "请输入邮箱" || error === "邮箱格式不正确";
  const codeInvalid = [
    "请输入 6 位验证码",
    "请先获取验证码",
    "验证码已过期，请重新获取",
    "验证码不正确",
    "尝试次数过多，请重新获取验证码",
    "请输入 6 位数字验证码",
  ].includes(error);

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as { user: { email: string } | null };
      setState(
        data.user ? { status: "authenticated", email: data.user.email } : { status: "anonymous" },
      );
    } catch {
      setState({ status: "anonymous" });
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json() as Promise<{ user: { email: string } | null }>)
      .then((data) =>
        setState(
          data.user
            ? { status: "authenticated", email: data.user.email }
            : { status: "anonymous" },
        ),
      )
      .catch(() => setState({ status: "anonymous" }));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function handleSendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    if (!turnstileToken) {
      setError("请稍候，人机验证未就绪");
      return;
    }
    setBusyAction("send");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), turnstileToken }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(errorText(data.error));
        return;
      }
      setCooldown(60);
      setTurnstileToken("");
      setTurnstileKey((k) => k + 1);
    } catch {
      setError("发送失败，请稍后重试");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("请输入 6 位验证码");
      return;
    }
    setBusyAction("verify");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(errorText(data.error));
        return;
      }
      setCode("");
      await refreshMe();
      notifyAuthChange();
      onAuthed?.();
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLogout() {
    setError("");
    setBusyAction("logout");
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        setError("退出登录失败，请稍后重试");
        return;
      }
      setState({ status: "anonymous" });
      notifyAuthChange();
    } catch {
      setError("退出登录失败，请检查网络后重试");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <GlassCard glow="none" className="mb-5">
      <div className="p-8">
        <h2 className="mb-4 text-sm tracking-[0.18em] text-moon-500">账号</h2>

        {state.status === "loading" && (
          <p className="text-sm text-moon-500">加载中…</p>
        )}

        {state.status === "authenticated" && (
          <div className="flex flex-col items-center gap-4">
            <p className="break-all text-[15px] text-moon-200">{state.email}</p>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <button
              type="button"
              onClick={handleLogout}
              disabled={busyAction !== null}
              className="flex min-h-11 items-center rounded-full border border-hairline px-5 py-2 text-sm text-moon-400 transition-colors hover:border-lav-400/50 hover:text-lav-300 disabled:opacity-50"
            >
              {busyAction === "logout" ? "退出中…" : "退出登录"}
            </button>
          </div>
        )}

        {state.status === "anonymous" && (
          <div className="flex flex-col gap-4">
            {/* 独立表单：邮箱按 Enter 即可发送验证码 */}
            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={handleSendCode}
              noValidate
            >
              <div className="flex-1">
                <label htmlFor={emailId} className="sr-only">邮箱地址</label>
                <input
                  id={emailId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  aria-invalid={emailInvalid ? true : undefined}
                  aria-describedby={emailInvalid ? errorId : undefined}
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <button
                type="submit"
                disabled={busyAction !== null || cooldown > 0}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-lav-400/15 px-5 text-sm text-lav-200 transition-colors hover:bg-lav-400/25 disabled:opacity-50"
              >
                {cooldown > 0
                  ? `${cooldown}s 后重发`
                  : busyAction === "send"
                    ? "发送中…"
                    : "发送验证码"}
              </button>
            </form>

            <Turnstile key={turnstileKey} onToken={setTurnstileToken} className="min-h-[65px]" />

            {/* 独立表单：验证码按 Enter 直接登录 */}
            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={handleVerify}
              noValidate
            >
              <div className="flex-1">
                <label htmlFor={codeId} className="sr-only">6 位验证码</label>
                <input
                  id={codeId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-invalid={codeInvalid ? true : undefined}
                  aria-describedby={codeInvalid ? errorId : undefined}
                  placeholder="6 位验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={INPUT_CLASS}
                />
              </div>
              <button
                type="submit"
                disabled={busyAction !== null || !code}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-lav-300 to-lav-500 px-5 text-sm font-medium text-night-950 transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busyAction === "verify" ? "登录中…" : "登录"}
              </button>
            </form>

            <p className="text-xs text-moon-500">
              未注册的邮箱将自动创建账号。验证码 10 分钟内有效。
            </p>
            {error && <p id={errorId} role="alert" className="text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
