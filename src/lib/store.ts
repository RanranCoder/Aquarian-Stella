"use client";

import { useSyncExternalStore } from "react";
import type { BirthProfile } from "@/lib/astrology";
import { localDateStr } from "@/lib/format";

export type Wish = {
  id: string;
  title: string;
  category: "love" | "growth" | "life" | "career" | "other";
  status: "active" | "done" | "archived";
  createdAt: string;
  completedAt?: string;
  /** 版本时钟（ms）。编辑 / 删除都 bump；同 id 冲突以更大者为新。 */
  updatedAt: number;
};

export type AppState = {
  onboarded: boolean;
  profile: BirthProfile | null;
  wishes: Wish[];
  /** 上次同步的本机账号 uid。undefined = 初次/未登录；用于共享设备串号防护。 */
  ownerUid?: number;
  /** profile 本机最近一次保存时刻（ms），供与服务端 updatedAt 比对。 */
  profileUpdatedAt?: number;
  /** 本地已删除但尚未被云端确认的 id 集合（持久化）。 */
  pendingDeletes: string[];
  /** 最近一次成功推送后所有 wishes 的最大 updated_at（用于判断有无本地新变更）。 */
  lastPushedAt?: number;
};

const initialState: AppState = {
  onboarded: false,
  profile: null,
  wishes: [],
  pendingDeletes: [],
};
/** 旧数据回填：为历史 Wish 补 updated_at 版本时钟。 */
function hydrateWish(w: Wish | Partial<Wish>): Wish {
  const updatedAt =
    typeof w.updatedAt === "number"
      ? w.updatedAt
      : typeof (w as Wish).createdAt === "string"
        ? Date.parse((w as Wish).createdAt) || Date.now()
        : Date.now();
  return {
    id: w.id!,
    title: w.title!,
    category: (w.category ?? "other") as Wish["category"],
    status: (w.status ?? "active") as Wish["status"],
    createdAt: (w.createdAt ?? localDateStr()) as string,
    completedAt: w.completedAt,
    updatedAt,
  };
}

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
          wishes: Array.isArray(parsed.wishes) ? parsed.wishes.map(hydrateWish) : [],
          ownerUid: parsed.ownerUid,
          profileUpdatedAt: parsed.profileUpdatedAt,
          pendingDeletes: Array.isArray(parsed.pendingDeletes)
            ? parsed.pendingDeletes.filter((x): x is string => typeof x === "string")
            : [],
          lastPushedAt: parsed.lastPushedAt,
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

  function getState() {
    return state;
  }

  return { useStore, set, getState };
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


/** 读取当前同步元信息（供 sync 层在 store.set 之外校验/写入）。 */
export function getState(): AppState {
  return store.getState();
}

/**
 * 将全部本地 wishes（含待删 id）推送至服务端（增量合并协议）。
 * 成功后清空 pendingDeletes。返回是否成功。
 */
export async function pushWishesToServer(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const draft = getState();
  // 没有任何本地变更时不发请求
  if (draft.pendingDeletes.length === 0 && (draft.wishes.length === 0 || !hasLocalDirty())) {
    return true;
  }
  try {
    const res = await fetch("/api/wishes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wishes: draft.wishes.map((w) => ({
          id: w.id,
          title: w.title,
          category: w.category,
          status: w.status,
          createdAt: w.createdAt,
          completedAt: w.completedAt,
          updatedAt: w.updatedAt,
        })),
        deletes: draft.pendingDeletes,
      }),
    });
    if (!res.ok) return false;
    if (draft.pendingDeletes.length > 0 || draft.wishes.length > 0) {
      const maxPushed =
        draft.wishes.reduce<number>((m, w) => Math.max(m, w.updatedAt), draft.lastPushedAt ?? 0);
      store.set((prev) => ({ ...prev, pendingDeletes: [], lastPushedAt: maxPushed }));
    }
    return true;
  } catch {
    return false;
  }
}

/** 从服务端拉取 wishes（合并逻辑在 sync.ts，本函数仅返回原始数据）。 */
export async function pullWishesFromServer(): Promise<
  { wishes: Wish[]; deletedIds: Array<{ id: string; deletedAt: number }> } | null
> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/wishes", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      wishes?: Array<Omit<Wish, "updatedAt"> & { updatedAt?: number }>;
      deletedIds?: Array<{ id: string; deletedAt: number }>;
    };
    if (!data.wishes) return null;
    return {
      wishes: data.wishes.map((w) => hydrateWish(w as Wish)),
      deletedIds: data.deletedIds ?? [],
    };
  } catch {
    return null;
  }
}

/** 将本地 profile 推送至服务端。成功后写入 profileUpdatedAt 由调用方维护。 */
export async function pushProfileToServer(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const draft = getState();
  if (!draft.profile) return true;
  try {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: draft.profile }),
    });
    if (!res.ok) return false;
    // 以服务端时间对齐本地保存时刻
    const data = (await res.json()) as { profile?: { updatedAt?: number } };
    if (data?.profile?.updatedAt) {
      store.set((prev) => ({ ...prev, profileUpdatedAt: data.profile!.updatedAt }));
    }
    return true;
  } catch {
    return false;
  }
}

/** 从服务端拉取 profile（返回 null 表示未建档或失败）。 */
export async function pullProfileFromServer(): Promise<
  | { profile: BirthProfile & { onboarded?: boolean }; updatedAt: number }
  | null
> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/profile", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      profile:
        | (BirthProfile & { onboarded?: boolean; updatedAt?: number })
        | null;
    };
    if (!data.profile) return null;
    const { updatedAt, ...profile } = data.profile;
    return { profile, updatedAt: updatedAt ?? 0 };
  } catch {
    return null;
  }
}

/** 有过本地编辑但尚未成功推送（wishes 无独立 dirty 标记时的近似判断）。 */
export function hasLocalDirty(): boolean {
  const s = getState();
  return s.wishes.some((w) => w.updatedAt > (s.lastPushedAt ?? 0));
}

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
