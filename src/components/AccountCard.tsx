"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Turnstile } from "@/components/Turnstile";

const INPUT_CLASS =
  "h-12 w-full rounded-xl border border-hairline bg-white/[0.04] px-4 text-[15px] text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400";

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
  const [state, setState] = useState<AccountState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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

  async function handleSendCode() {
    setError("");
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    if (!turnstileToken) {
      setError("请稍候，人机验证未就绪");
      return;
    }
    setBusy(true);
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
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("请输入 6 位验证码");
      return;
    }
    setBusy(true);
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
      onAuthed?.();
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setState({ status: "anonymous" });
    } finally {
      setBusy(false);
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
            <button
              onClick={handleLogout}
              disabled={busy}
              className="flex min-h-11 items-center rounded-full border border-hairline px-5 py-2 text-sm text-moon-400 transition-colors hover:border-lav-400/50 hover:text-lav-300 disabled:opacity-50"
            >
              退出登录
            </button>
          </div>
        )}

        {state.status === "anonymous" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
              <button
                onClick={handleSendCode}
                disabled={busy || cooldown > 0}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-lav-400/15 px-5 text-sm text-lav-200 transition-colors hover:bg-lav-400/25 disabled:opacity-50"
              >
                {cooldown > 0 ? `${cooldown}s 后重发` : busy ? "发送中…" : "发送验证码"}
              </button>
            </div>

            <Turnstile key={turnstileKey} onToken={setTurnstileToken} className="min-h-[65px]" />

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={INPUT_CLASS}
              />
              <button
                onClick={handleVerify}
                disabled={busy || !code}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-lav-300 to-lav-500 px-5 text-sm font-medium text-night-950 transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "登录中…" : "登录"}
              </button>
            </div>

            <p className="text-xs text-moon-500">
              未注册的邮箱将自动创建账号。验证码 10 分钟内有效。
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
