"use client";

import { useSyncExternalStore } from "react";
import type { BirthProfile } from "@/lib/astrology";

export type Wish = {
  id: string;
  title: string;
  category: "love" | "growth" | "life" | "career" | "other";
  status: "active" | "done" | "archived";
  createdAt: string;
  completedAt?: string;
};

export type AppState = {
  onboarded: boolean;
  profile: BirthProfile | null;
  wishes: Wish[];
};

const initialState: AppState = {
  onboarded: false,
  profile: null,
  wishes: [],
};

function createStore() {
  const KEY = "xingyu-xingyuan-state";
  let state: AppState = initialState;

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        state = {
          onboarded: parsed.onboarded ?? false,
          profile: parsed.profile ?? null,
          wishes: parsed.wishes ?? [],
        };
      }
    } catch {
      // 忽略损坏数据
    }
  }

  const listeners = new Set<() => void>();

  function set(updater: (prev: AppState) => AppState) {
    state = updater(state);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // localStorage 不可用时静默降级为内存态
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getSnapshot() {
    return state;
  }

  function useStore() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }

  return { useStore, set };
}

export const store = createStore();

/** SSR/首次渲染安全：返回客户端是否已挂载，避免 hydration 不一致 */
const emptySubscribe = () => () => {};
export function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

/** 布尔偏好（localStorage），供 useSyncExternalStore 订阅；写时同步副作用（如 class） */
function createBoolPref(key: string, defaultOn = true) {
  let value = defaultOn;
  if (typeof window !== "undefined") {
    value = window.localStorage.getItem(key) !== "off";
    if (!value) document.documentElement.classList.add("motion-reduced");
  }
  const listeners = new Set<() => void>();
  return {
    useValue() {
      return useSyncExternalStore(
        (cb) => {
          listeners.add(cb);
          return () => listeners.delete(cb);
        },
        () => value,
        // SSR 与首帧必须返回服务端渲染值，否则已关动效的用户刷新会触发 hydration mismatch
        () => defaultOn,
      );
    },
    set(next: boolean) {
      value = next;
      window.localStorage.setItem(key, next ? "on" : "off");
      document.documentElement.classList.toggle("motion-reduced", !next);
      listeners.forEach((l) => l());
    },
  };
}

/** 星空动效偏好（个人中心可切换） */
export const motionPref = createBoolPref("xingyu-motion");

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const WISH_CATEGORY: Record<Wish["category"], { label: string; mark: string }> = {
  love: { label: "爱情", mark: "♡" },
  growth: { label: "成长", mark: "✦" },
  life: { label: "生活", mark: "☾" },
  career: { label: "事业", mark: "◇" },
  other: { label: "其他", mark: "·" },
};
