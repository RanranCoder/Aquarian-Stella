"use client";

import { useEffect, useState } from "react";

export type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; email: string };

/** 读取当前登录状态（基于 /api/auth/me 的 cookie 会话） */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ user: { email: string } | null }>)
      .then((d) => {
        if (!alive) return;
        setState(
          d.user
            ? { status: "authenticated", email: d.user.email }
            : { status: "anonymous" },
        );
      })
      .catch(() => {
        if (alive) setState({ status: "anonymous" });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
