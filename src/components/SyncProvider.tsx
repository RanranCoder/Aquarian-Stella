"use client";

import { useEffect, useRef } from "react";
import { useAuth, notifyAuthChange } from "@/lib/use-auth";
import { syncAfterAuthChange } from "@/lib/sync";

/**
 * 全局同步协调者：登录状态变化 / 网络恢复时触发一次云端同步（profile + wishes 合并）。
 * 仅负责"何时同步"，不渲染任何 UI。挂在根 layout 内。
 */
export function SyncProvider() {
  const auth = useAuth();
  const syncedUid = useRef<number | null>(null);
  const authedId = auth.status === "authenticated" ? auth.id : null;

  useEffect(() => {
    if (authedId === null) return;
    if (syncedUid.current === authedId) return;
    syncedUid.current = authedId;
    void syncAfterAuthChange(authedId);
  }, [authedId]);
  // 登出：清空已同步标记，允许下次登录/换号重新同步
  useEffect(() => {
    if (auth.status === "anonymous") syncedUid.current = null;
  }, [auth.status]);

  // 网络恢复后重试一次（本地有未推送变更时）
  useEffect(() => {
    const onOnline = () => {
      if (auth.status === "authenticated") {
        syncedUid.current = null;
        notifyAuthChange();
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [auth.status]);

  return null;
}