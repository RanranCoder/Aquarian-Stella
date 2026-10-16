import { useSyncExternalStore } from "react";
import { store, pushWishesToServer, pullWishesFromServer, pushProfileToServer, pullProfileFromServer, getState, type Wish } from "./store";
import type { BirthProfile } from "./astrology";

/* ------------------------------------------------------------------ */
/*  纯函数：wishes 合并（同 id 取 updated_at 新者；删除归属同一时钟）      */
/* ------------------------------------------------------------------ */

export type ServerDeletedId = { id: string; deletedAt: number };

/**
 * 合并本地与服务端 wishes。规则（唯一版本时钟 updated_at）：
 * - union by id；同 id 取 updated_at 大者覆盖。
 * - 服务端 tombstone：本地 updated_at > deletedAt → 本地保留（回推复活）；
 *   否则本地移除。
 * - 返回合并后的 wishes 与需要回推（复活/本地更新）的列表。
 */
export function mergeWishes(
  local: Wish[],
  server: Wish[],
  deletedIds: ServerDeletedId[],
): { merged: Wish[]; toRePush: Wish[]; toRemoveLocally: Set<string> } {
  const byId = new Map<string, { wish: Wish; side: "local" | "server" }>();
  const toRePush: Wish[] = [];
  const toRemoveLocally: Set<string> = new Set();

  for (const w of local) byId.set(w.id, { wish: w, side: "local" });
  for (const w of server) {
    const existing = byId.get(w.id);
    if (!existing || w.updatedAt >= existing.wish.updatedAt) {
      byId.set(w.id, { wish: w, side: "server" });
    }
  }

  for (const d of deletedIds) {
    const cur = byId.get(d.id);
    if (!cur) continue;
    if (cur.wish.updatedAt > d.deletedAt) {
      // 本地/服务端版本比"删除时刻"新 → 保留（删除较旧，视为已复活）
      if (cur.side === "local") toRePush.push(cur.wish);
    } else {
      // 删除较新 → 两端都移除
      byId.delete(d.id);
      toRemoveLocally.add(d.id);
    }
  }

  // 本地在 union 中仍由 local 主导（未见服务端更新）→ 回推
  for (const w of local) {
    const cur = byId.get(w.id);
    if (!cur) continue; // 已被 tombstone 移除
    if (cur.side === "local") {
      const sv = server.find((x) => x.id === w.id);
      if (!sv || w.updatedAt > sv.updatedAt) toRePush.push(w);
    }
  }

  const merged = [...byId.values()].map((v) => v.wish);
  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return { merged, toRePush: dedupeRePush(toRePush), toRemoveLocally };
}

function dedupeRePush(list: Wish[]): Wish[] {
  const seen = new Set<string>();
  const out: Wish[] = [];
  for (const w of list) {
    if (!seen.has(w.id)) {
      seen.add(w.id);
      out.push(w);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  纯函数：profile 合并（比对本机保存时刻与服务端 updatedAt）             */
/* ------------------------------------------------------------------ */

export function mergeProfile(
  local: BirthProfile | null,
  localUpdatedAt: number | undefined,
  server: (BirthProfile & { onboarded?: boolean }) | null,
  serverUpdatedAt: number,
): { profile: BirthProfile | null; onboarded: boolean; toRePush: boolean; useServer: boolean } {
  const localTs = localUpdatedAt ?? 0;
  if (!server) {
    return {
      profile: local,
      onboarded: !!local,
      toRePush: !!local,
      useServer: false,
    };
  }
  if (!local) {
    return { profile: server, onboarded: server.onboarded ?? true, toRePush: false, useServer: true };
  }
  if (localTs > serverUpdatedAt) {
    // 本地较新 → 保留本地并回推
    return { profile: local, onboarded: true, toRePush: true, useServer: false };
  }
  return { profile: server, onboarded: server.onboarded ?? true, toRePush: false, useServer: true };
}

/* ------------------------------------------------------------------ */
/*  同步状态：供界面展示同步中 / 已同步 / 失败与仅存本机条数               */
/* ------------------------------------------------------------------ */

export type SyncFeedback = {
  status: "idle" | "syncing" | "synced" | "error";
  /** 仅保存在本机（如超过标题长度上限）的星愿条数。 */
  localOnly: number;
  /** 最近一次同步完成时刻（ms），0 表示尚未同步。 */
  at: number;
};

const IDLE_FEEDBACK: SyncFeedback = { status: "idle", localOnly: 0, at: 0 };

let feedback: SyncFeedback = IDLE_FEEDBACK;
const feedbackListeners = new Set<() => void>();

function setFeedback(next: Partial<SyncFeedback>) {
  feedback = { ...feedback, ...next };
  feedbackListeners.forEach((l) => l());
}

/** 订阅星愿同步状态（SSR/首帧返回 idle，避免 hydration 不一致）。 */
export function useSyncFeedback(): SyncFeedback {
  return useSyncExternalStore(
    (cb) => {
      feedbackListeners.add(cb);
      return () => feedbackListeners.delete(cb);
    },
    () => feedback,
    () => IDLE_FEEDBACK,
  );
}

/* ------------------------------------------------------------------ */
/*  编排：登录 / 恢复后的完整同步                                        */
/* ------------------------------------------------------------------ */

let queue: Promise<unknown> = Promise.resolve();

/** 所有云端写入串行执行：删除与随后的撤销不会因请求乱序互相覆盖。 */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/** 当前登录账号下发起一次同步：拉取合并 → 有本地更新则回推。 */
export function pushNow(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  // 未登录或本机属于他人账号 → 不推
  if (!getState().ownerUid) return Promise.resolve();
  setFeedback({ status: "syncing" });
  return enqueue(async () => {
    if (!getState().ownerUid) return;
    const result = await pushWishesToServer();
    setFeedback({
      status: result.ok ? "synced" : "error",
      localOnly: result.localOnly,
      at: Date.now(),
    });
  });
}

/**
 * 登录状态变化后执行一次完整同步。
 * @param uid 当前登录账号 id
 * 首次（ownerUid 未定义）→ 拉取合并，保本地新增，本地新则回推。
 * 同账号 → 增量合并 + 回推。
 * 异账号残留 → 以云端覆盖本地，不推本地。
 */
export function syncAfterAuthChange(uid: number): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  setFeedback({ status: "syncing" });
  return enqueue(async () => {
    try {
      const s = getState();
      const firstTime = s.ownerUid === undefined;
      const sameUser = s.ownerUid === uid;

      // 云端拉取 email 用到别处，这里只关心 uid 归属
      if (firstTime || sameUser) {
        const server = await pullWishesFromServer();
        if (server) {
          const local = getState().wishes;
          const { merged, toRePush, toRemoveLocally } = mergeWishes(local, server.wishes, server.deletedIds);
          store.set((prev) => ({
            ...prev,
            wishes: merged,
            pendingDeletes: prev.pendingDeletes.filter((id) => !toRemoveLocally.has(id)),
          }));
          if (toRePush.length > 0) await pushWishesToServer();
        }

        // profile
        const srv = await pullProfileFromServer();
        const cur = getState();
        const mp = mergeProfile(
          cur.profile,
          cur.profileUpdatedAt,
          srv?.profile ?? null,
          srv?.updatedAt ?? 0,
        );
        store.set((prev) => ({
          ...prev,
          profile: mp.profile,
          onboarded: prev.onboarded || mp.onboarded,
        }));
        if (mp.toRePush) await pushProfileToServer();
      } else {
        // 他人残留 → 云端覆盖本地
        const server = await pullWishesFromServer();
        if (server) {
          store.set((prev) => ({ ...prev, wishes: server!.wishes, pendingDeletes: [] }));
        }
        const srv = await pullProfileFromServer();
        store.set((prev) => ({
          ...prev,
          profile: srv?.profile ?? null,
          profileUpdatedAt: srv?.updatedAt ?? undefined,
          onboarded: srv?.profile ? true : prev.onboarded,
        }));
      }

      store.set((prev) => ({ ...prev, ownerUid: uid }));
      setFeedback({ status: "synced", at: Date.now() });
    } catch {
      setFeedback({ status: "error", at: Date.now() });
    }
  });
}