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
import { formatDateDot } from "@/lib/format";
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
  const [filter, setFilter] = useState<Wish["status"] | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Wish["category"]>("growth");
  const [undo, setUndo] = useState<Wish | null>(null);
  const undoTimer = useRef<number | null>(null);

  useEffect(() => {
    // URL 直达（如今日星语反思问题跳转 ?new=1&title=…）时打开新建表单并预填标题，仅挂载时读取一次
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      /* eslint-disable react-hooks/set-state-in-effect -- URL 直达时一次性打开表单并预填 */
      setShowNew(true);
      const prefill = params.get("title");
      if (prefill) {
        setTitle(prefill);
        setCategory("growth");
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const wishes = useMemo(
    () => (mounted ? s.wishes : []),
    [mounted, s.wishes],
  );

  const filtered = useMemo(
    () => (filter === "all" ? wishes : wishes.filter((w) => w.status === filter)),
    [wishes, filter],
  );

  const activeCount = wishes.filter((w) => w.status === "active").length;

  function addWish() {
    const t = title.trim();
    if (!t) return;
    const wish: Wish = {
      id: newId(),
      title: t,
      category,
      status: "active",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    store.set((prev) => ({ ...prev, wishes: [wish, ...prev.wishes] }));
    setTitle("");
    setShowNew(false);
  }

  function updateWish(id: string, patch: Partial<Wish>) {
    store.set((prev) => ({
      ...prev,
      wishes: prev.wishes.map((w) =>
        w.id === id
          ? {
              ...w,
              ...patch,
              completedAt:
                patch.status === "done" && !w.completedAt
                  ? new Date().toISOString().slice(0, 10)
                  : w.completedAt,
            }
          : w,
      ),
    }));
  }

  function removeWish(id: string) {
    const target = wishes.find((w) => w.id === id);
    if (!target) return;
    store.set((prev) => ({
      ...prev,
      wishes: prev.wishes.filter((w) => w.id !== id),
    }));
    setUndo(target);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000);
  }

  function undoDelete() {
    if (!undo) return;
    store.set((prev) => ({ ...prev, wishes: [undo, ...prev.wishes] }));
    setUndo(null);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      {/* 头部 */}
      <div className="mb-8 flex items-end justify-between">
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

      {/* 新建 */}
      {showNew && (
        <GlassCard glow="gold" className="animate-fade-up mb-8">
          <div className="flex flex-col gap-5 p-8">
            <div className="flex items-center justify-between">
              <h2 className="display-zh text-xl">写下一个愿望</h2>
              <button
                onClick={() => setShowNew(false)}
                aria-label="关闭"
                className="grid h-8 w-8 place-items-center rounded-full border border-hairline text-moon-400 hover:text-moon-100"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入你的星愿……"
              rows={3}
              className="w-full resize-none rounded-xl border border-hairline bg-white/[0.04] px-4 py-3 text-[15px] leading-relaxed text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-gold-400"
            />
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
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
                : "这里还没有星愿。"}
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
          </div>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((w) => {
            const cat = WISH_CATEGORY[w.category];
            return (
              <GlassCard
                key={w.id}
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
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-13 md:pl-0">
                    {w.status === "active" && (
                      <button
                        onClick={() => updateWish(w.id, { status: "done" })}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gold-400/60 px-3.5 py-1.5 text-sm text-gold-200 transition-colors hover:bg-gold-400/10"
                      >
                        <CheckIcon className="h-4 w-4" />
                        已实现
                      </button>
                    )}
                    {w.status === "active" && (
                      <button
                        onClick={() => updateWish(w.id, { status: "archived" })}
                        className="flex min-h-11 items-center rounded-full border border-hairline px-3.5 py-1.5 text-sm text-moon-400 transition-colors hover:text-moon-100"
                      >
                        放下
                      </button>
                    )}
                    {w.status === "done" && (
                      <button
                        onClick={() => updateWish(w.id, { status: "active" })}
                        className="flex min-h-11 items-center rounded-full border border-hairline px-3.5 py-1.5 text-sm text-moon-400 transition-colors hover:text-moon-100"
                      >
                        重新进行
                      </button>
                    )}
                    <button
                      onClick={() => removeWish(w.id)}
                      aria-label="删除"
                      className="grid h-11 w-11 place-items-center rounded-full border border-hairline text-moon-500 transition-colors hover:border-red-400/50 hover:text-red-300"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </GlassCard>
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
