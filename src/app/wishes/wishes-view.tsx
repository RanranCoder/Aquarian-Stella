"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import {
  StarIcon,
  CheckIcon,
  TrashIcon,
  SparkleIcon,
  CloseIcon,
} from "@/components/icons";
import { store, useMounted, newId, WISH_CATEGORY, type Wish } from "@/lib/store";
import { pushNow, useSyncFeedback } from "@/lib/sync";
import { WISH_TITLE_MAX } from "@/lib/wishes/limits";
import { formatDateDot, localDateStr } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS: { key: Wish["status"] | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "done", label: "已实现" },
  { key: "archived", label: "已放下" },
];

const CATEGORIES = Object.entries(WISH_CATEGORY).map(([key, v]) => ({
  key: key as Wish["category"],
  label: v.label,
  mark: v.mark,
}));

export function WishesPage() {
  const mounted = useMounted();
  const s = store.useStore();
  const sync = useSyncFeedback();
  const [filter, setFilter] = useState<Wish["status"] | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Wish["category"]>("growth");
  const [undo, setUndo] = useState<Wish | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const undoTimer = useRef<number | null>(null);

  useEffect(() => {
    // URL 直达（如今日星语反思问题跳转 ?new=1&title=…）时打开新建表单并预填标题，仅挂载时读取一次
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      /* eslint-disable react-hooks/set-state-in-effect -- URL 直达时一次性打开表单并预填 */
      setShowNew(true);
      const prefill = params.get("title");
      if (prefill) {
        // 历史链接可能带有超长文案，这里与保存约束保持一致
        setTitle(prefill.slice(0, WISH_TITLE_MAX));
        setCategory("growth");
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    };
  }, []);

  // 新增后滚动到新记录并短暂高亮，避免在其它筛选下“保存完却看不到”
  useEffect(() => {
    if (!justAdded) return;
    const el = document.getElementById(`wish-${justAdded}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
    const t = window.setTimeout(() => setJustAdded(null), 2400);
    return () => window.clearTimeout(t);
  }, [justAdded, filter]);

  const wishes = useMemo(
    () => (mounted ? s.wishes : []),
    [mounted, s.wishes],
  );

  const filtered = useMemo(
    () => (filter === "all" ? wishes : wishes.filter((w) => w.status === filter)),
    [wishes, filter],
  );

  const activeCount = wishes.filter((w) => w.status === "active").length;
  // 超过标题长度上限的记录只能留在这台设备
  const localOnlyCount = wishes.filter((w) => w.title.length > WISH_TITLE_MAX).length;
  const loggedIn = mounted && s.ownerUid !== undefined;

  // 防抖推送：500ms 内的多次变更合并为一次请求
  const pushTimer = useRef<number | null>(null);
  function debouncedPush() {
    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => {
      void pushNow();
    }, 500);
  }

  function addWish() {
    const t = title.trim();
    if (!t || t.length > WISH_TITLE_MAX) return;
    const wish: Wish = {
      id: newId(),
      title: t,
      category,
      status: "active",
      createdAt: localDateStr(),
      updatedAt: new Date().getTime(),
    };
    store.set((prev) => ({ ...prev, wishes: [wish, ...prev.wishes] }));
    setTitle("");
    setShowNew(false);
    // 新愿望默认“进行中”；当前筛选会把它藏起来时自动切回，让保存结果立即可见
    if (filter !== "all" && filter !== "active") setFilter("active");
    setJustAdded(wish.id);
    setStatusMessage(
      s.ownerUid
        ? "已保存，正在同步到账户。"
        : "已保存到本机，登录后会同步到账户。",
    );
    debouncedPush();
  }

  function updateWish(id: string, patch: Partial<Wish>) {
    store.set((prev) => ({
      ...prev,
      wishes: prev.wishes.map((w) =>
        w.id === id
          ? {
              ...w,
              ...patch,
              updatedAt: new Date().getTime(),
              completedAt:
                patch.status === "done" && !w.completedAt
                  ? localDateStr()
                  : w.completedAt,
            }
          : w,
      ),
    }));
    debouncedPush();
  }

  function removeWish(id: string) {
    const target = wishes.find((w) => w.id === id);
    if (!target) return;
    store.set((prev) => ({
      ...prev,
      wishes: prev.wishes.filter((w) => w.id !== id),
      pendingDeletes: [...prev.pendingDeletes, id],
    }));
    setUndo(target);
    setStatusMessage(`已删除“${target.title}”，可在 6 秒内撤销。`);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => {
      setUndo(null);
      setStatusMessage("");
    }, 6000);
    debouncedPush();
  }

  function undoDelete() {
    if (!undo) return;
    // 提升版本时钟：恢复版本必须晚于删除（tombstone）版本，否则下次同步又会消失
    const restored: Wish = { ...undo, updatedAt: new Date().getTime() };
    store.set((prev) => ({
      ...prev,
      wishes: [restored, ...prev.wishes],
      pendingDeletes: prev.pendingDeletes.filter((id) => id !== restored.id),
    }));
    setStatusMessage(`已恢复“${restored.title}”，正在同步。`);
    setUndo(null);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    debouncedPush();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pt-12 pb-24 md:py-16">
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </p>
      {/* 头部 */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-lav-300">
            <SparkleIcon className="h-3 w-3" />
            我的星愿
          </span>
          <h1 className="display-zh mt-4 text-3xl md:text-4xl">
            把想去的地方写下来
          </h1>
          {mounted && (
            <p className="mt-2 text-sm text-moon-500">
              {activeCount > 0
                ? `正在路上的愿望有 ${activeCount} 个`
                : "还没有进行中的愿望"}
            </p>
          )}
        </div>
        <StarButton
          size="sm"
          arrow={false}
          onClick={() => setShowNew((v) => !v)}
        >
          写星愿
        </StarButton>
      </div>

      {/* 同步反馈：明确“已同步到账户 / 仅保存在本机 / 同步失败” */}
      {loggedIn && (localOnlyCount > 0 || sync.status !== "idle") && (
        <div className="mb-6 flex flex-col gap-1 text-xs">
          {sync.status === "error" && (
            <p className="text-gold-300">
              同步失败：星愿已保存在本机。
              <button
                type="button"
                onClick={() => void pushNow()}
                className="ml-2 underline underline-offset-2 transition-colors hover:text-gold-200"
              >
                立即重试
              </button>
            </p>
          )}
          {sync.status === "syncing" && (
            <p className="text-moon-500">正在同步到账户…</p>
          )}
          {sync.status === "synced" && (
            <p className="text-moon-500">已同步到账户。</p>
          )}
          {localOnlyCount > 0 && (
            <p className="text-gold-300">
              {localOnlyCount} 条星愿超过 {WISH_TITLE_MAX} 字，仅保存在本机，不会同步到账户。
            </p>
          )}
        </div>
      )}

      {/* 新建 */}
      {showNew && (
        <GlassCard glow="gold" className="animate-fade-up mb-8">
          <div className="flex flex-col gap-5 p-card">
            <div className="flex items-center justify-between">
              <h2 className="display-zh text-xl">写下一个愿望</h2>
              <button
                onClick={() => setShowNew(false)}
                aria-label="关闭"
                className="grid h-11 w-11 place-items-center rounded-full border border-hairline text-moon-400 hover:text-moon-100"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入你的星愿……"
              rows={3}
              maxLength={WISH_TITLE_MAX}
              aria-describedby="wish-title-hint"
              className="w-full resize-none rounded-xl border border-hairline bg-white/[0.04] px-4 py-3 text-base leading-relaxed text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-gold-400"
            />
            <div className="flex items-center justify-between gap-4">
              <p id="wish-title-hint" className="text-xs text-moon-500">
                保存后同步到你的账号，最多 {WISH_TITLE_MAX} 字。
              </p>
              <p
                className={cn(
                  "shrink-0 text-xs tabular-nums",
                  title.length >= WISH_TITLE_MAX ? "text-gold-300" : "text-moon-500",
                )}
              >
                {title.length} / {WISH_TITLE_MAX}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={category === c.key}
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    "flex min-h-11 items-center rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    category === c.key
                      ? "border-gold-400 bg-gold-400/10 text-gold-200"
                      : "border-hairline text-moon-400 hover:text-moon-200",
                  )}
                >
                  {c.mark} {c.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <StarButton
                size="sm"
                disabled={!title.trim()}
                onClick={addWish}
              >
                <StarIcon className="h-4 w-4" />
                保存星愿
              </StarButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 过滤 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "flex min-h-11 items-center rounded-full border px-4 py-1.5 text-sm transition-colors",
              filter === f.key
                ? "border-lav-400 bg-lav-400/10 text-lav-200"
                : "border-hairline text-moon-500 hover:text-moon-200",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <GlassCard glow="none">
          <div className="flex flex-col items-center gap-4 px-8 py-16 text-center">
            <StarIcon className="h-8 w-8 text-moon-500" />
            <p className="text-moon-400">
              {wishes.length === 0
                ? "写下第一个愿望，让星星陪你慢慢实现它。"
                : `“${FILTERS.find((item) => item.key === filter)?.label}”中还没有星愿。`}
            </p>
            {wishes.length === 0 && (
              <StarButton
                size="sm"
                onClick={() => {
                  setFilter("all");
                  setShowNew(true);
                }}
              >
                写下第一个愿望
              </StarButton>
            )}
            {wishes.length > 0 && filter !== "all" && (
              <StarButton size="sm" onClick={() => setFilter("all")}>
                查看全部星愿
              </StarButton>
            )}
          </div>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((w) => {
            const cat = WISH_CATEGORY[w.category];
            const localOnly = w.title.length > WISH_TITLE_MAX;
            return (
              <div
                key={w.id}
                id={`wish-${w.id}`}
                tabIndex={-1}
                className={cn(
                  "rounded-panel outline-none transition-shadow duration-300",
                  justAdded === w.id && "ring-2 ring-gold-400/70",
                )}
              >
                <GlassCard
                  glow={w.status === "done" ? "gold" : "none"}
                  interactive
                >
                  <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:gap-8 md:p-7">
                    <div className="flex items-start gap-4">
                      <span
                        className={cn(
                          "mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border text-lg",
                          w.status === "done"
                            ? "border-gold-400 bg-gold-400/10 text-gold-300"
                            : "border-hairline bg-white/[0.04] text-moon-400",
                        )}
                      >
                        {cat.mark}
                      </span>
                      <div>
                        <p
                          className={cn(
                            "text-[15px] leading-relaxed md:text-base",
                            w.status === "done" && "text-moon-400 line-through",
                          )}
                        >
                          {w.title}
                        </p>
                        <p className="mt-1.5 text-xs text-moon-500">
                          {cat.label} · 创建于 {formatDateDot(w.createdAt)}
                          {w.completedAt && ` · 实现于 ${formatDateDot(w.completedAt)}`}
                          {localOnly && (
                            <span className="ml-2 rounded-full border border-gold-400/40 px-2 py-0.5 text-gold-300">
                              仅保存在本机
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-13 md:pl-0">
                      {w.status === "active" && (
                        <button
                          type="button"
                          onClick={() => updateWish(w.id, { status: "done" })}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gold-400/60 px-3.5 py-1.5 text-sm text-gold-200 transition-colors hover:bg-gold-400/10"
                        >
                          <CheckIcon className="h-4 w-4" />
                          已实现
                        </button>
                      )}
                      {w.status === "active" && (
                        <button
                          type="button"
                          onClick={() => updateWish(w.id, { status: "archived" })}
                          className="flex min-h-11 items-center rounded-full border border-hairline px-3.5 py-1.5 text-sm text-moon-400 transition-colors hover:text-moon-100"
                        >
                          放下
                        </button>
                      )}
                      {w.status === "done" && (
                        <button
                          type="button"
                          onClick={() => updateWish(w.id, { status: "active" })}
                          className="flex min-h-11 items-center rounded-full border border-hairline px-3.5 py-1.5 text-sm text-moon-400 transition-colors hover:text-moon-100"
                        >
                          重新进行
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeWish(w.id)}
                        aria-label="删除"
                        className="grid h-11 w-11 place-items-center rounded-full border border-hairline text-moon-500 transition-colors hover:border-red-400/50 hover:text-red-300"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      )}

      {/* 删除撤销 toast */}
      {undo && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
          <div className="glass-strong flex items-center gap-3 rounded-full px-4 py-2.5 shadow-card-lg">
            <span className="text-sm text-moon-300">星愿已删除</span>
            <button
              type="button"
              onClick={undoDelete}
              className="rounded-full bg-gradient-to-b from-lav-200 to-lav-400 px-3.5 py-1.5 text-sm font-medium text-night-950 transition-transform active:scale-95"
            >
              撤销
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
