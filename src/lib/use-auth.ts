"use client";

import { useCallback, useEffect, useState } from "react";

export type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; email: string; id: number };

const AUTH_CHANGE_EVENT = "auth-change";

/** 通知所有 useAuth 刷新 */
export function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

type MeResponse = { user: { email: string; id: number } | null };

function toState(d: MeResponse): AuthState {
  return d.user
    ? { status: "authenticated", email: d.user.email, id: d.user.id }
    : { status: "anonymous" };
}

/** 读取当前登录状态（基于 /api/auth/me 的 cookie 会话） */
export function useAuth(): AuthState & { refresh: () => void } {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const fetchMe = useCallback(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<MeResponse>)
      .then((d) => setState(toState(d)))
      .catch(() => setState({ status: "anonymous" }));
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<MeResponse>)
      .then((d) => {
        if (!alive) return;
        setState(toState(d));
      })
      .catch(() => {
        if (alive) setState({ status: "anonymous" });
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const handler = () => fetchMe();
    window.addEventListener(AUTH_CHANGE_EVENT, handler);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handler);
  }, [fetchMe]);

  return { ...state, refresh: fetchMe };
}
