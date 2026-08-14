"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./icons";

type DatePickerProps = {
  value: string; // YYYY-MM-DD 或空
  onChange: (value: string) => void;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate(); // m 为 1-12
}

function todayParts() {
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth() + 1 };
}

function fmtCN(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

/** 自绘日期选择器：日历面板，支持年月导航与年份快速选择，不使用浏览器原生控件 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "请选择日期",
  ariaLabel,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"month" | "year">("month");
  const [vy, setVy] = useState(() => todayParts().y);
  const [vm, setVm] = useState(() => todayParts().m);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const src = value ? value : toISO(todayParts().y, todayParts().m, 1);
      const [y, m] = src.split("-").map(Number);
      setVy(y);
      setVm(m);
      setMode("month");
    }
  }

  const weeks = useMemo(() => {
    const first = new Date(vy, vm - 1, 1).getDay();
    const dim = daysInMonth(vy, vm);
    const cells: number[] = [];
    for (let i = 0; i < first; i++) cells.push(0);
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(0);
    const wks: number[][] = [];
    for (let i = 0; i < cells.length; i += 7) wks.push(cells.slice(i, i + 7));
    return wks;
  }, [vy, vm]);

  const todayISO = useMemo(
    () => toISO(todayParts().y, todayParts().m, new Date().getDate()),
    [],
  );

  function isDisabled(y: number, m: number, d: number): boolean {
    const iso = toISO(y, m, d);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  function pickDay(d: number) {
    if (isDisabled(vy, vm, d)) return;
    onChange(toISO(vy, vm, d));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function prevMonth() {
    setVm((m) => (m === 1 ? (setVy((y) => y - 1), 12) : m - 1));
  }
  function nextMonth() {
    setVm((m) => (m === 12 ? (setVy((y) => y + 1), 1) : m + 1));
  }

  const yearBase = vy - (vy % 12);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popupId}
        aria-label={ariaLabel}
        onClick={toggle}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[15px] outline-none transition-colors",
          open
            ? "border-lav-400 bg-white/[0.06]"
            : "border-hairline bg-white/[0.04] hover:border-white/20",
        )}
      >
        <span
          className={cn("truncate", value ? "text-moon-100" : "text-moon-500")}
        >
          {value ? fmtCN(value) : placeholder}
        </span>
        <CalendarIcon
          className={cn(
            "h-4 w-4 shrink-0 text-moon-400 transition-colors",
            open && "text-lav-300",
          )}
        />
      </button>

      {open && (
        <div
          id={popupId}
          role="dialog"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-hairline bg-night-800/95 p-3 shadow-card-lg backdrop-blur-xl"
        >
          {mode === "month" ? (
            <>
              {/* 头部 */}
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="上个月"
                  className="grid h-8 w-8 place-items-center rounded-lg text-moon-400 transition-colors hover:bg-white/[0.06] hover:text-moon-100"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMode("year")}
                  className="rounded-lg px-3 py-1.5 text-[15px] font-medium text-moon-100 transition-colors hover:bg-white/[0.06]"
                >
                  {vy}年{vm}月
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="下个月"
                  className="grid h-8 w-8 place-items-center rounded-lg text-moon-400 transition-colors hover:bg-white/[0.06] hover:text-moon-100"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>

              {/* 星期 */}
              <div className="mb-1 grid grid-cols-7">
                {WEEKDAYS.map((w) => (
                  <span
                    key={w}
                    className="py-1 text-center text-xs text-moon-500"
                  >
                    {w}
                  </span>
                ))}
              </div>

              {/* 日期格 */}
              <div className="flex flex-col gap-0.5">
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {week.map((d, di) => {
                      if (d === 0)
                        return (
                          <span key={di} className="h-9" aria-hidden="true" />
                        );
                      const iso = toISO(vy, vm, d);
                      const selected = iso === value;
                      const isToday = iso === todayISO;
                      const disabled = isDisabled(vy, vm, d);
                      return (
                        <div key={di} className="grid place-items-center">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => pickDay(d)}
                            aria-pressed={selected}
                            className={cn(
                              "h-9 w-9 rounded-lg text-sm transition-colors",
                              selected
                                ? "bg-lav-400 font-medium text-night-950"
                                : disabled
                                  ? "text-moon-500 opacity-40"
                                  : isToday
                                    ? "border border-lav-400/70 text-lav-200 hover:bg-white/[0.06]"
                                    : "text-moon-200 hover:bg-white/[0.06] hover:text-moon-100",
                            )}
                          >
                            {d}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* 年份选择 */}
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setVy((y) => y - 12)}
                  aria-label="上一年代"
                  className="grid h-8 w-8 place-items-center rounded-lg text-moon-400 transition-colors hover:bg-white/[0.06] hover:text-moon-100"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMode("month")}
                  className="rounded-lg px-3 py-1.5 text-[15px] font-medium text-moon-100 transition-colors hover:bg-white/[0.06]"
                >
                  {yearBase}–{yearBase + 11}年
                </button>
                <button
                  type="button"
                  onClick={() => setVy((y) => y + 12)}
                  aria-label="下一年代"
                  className="grid h-8 w-8 place-items-center rounded-lg text-moon-400 transition-colors hover:bg-white/[0.06] hover:text-moon-100"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 12 }, (_, i) => yearBase + i).map((y) => {
                  const sel = value?.startsWith(String(y));
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setVy(y);
                        setMode("month");
                      }}
                      className={cn(
                        "h-10 rounded-lg text-sm transition-colors",
                        sel
                          ? "bg-lav-400/20 font-medium text-lav-200"
                          : "text-moon-200 hover:bg-white/[0.06] hover:text-moon-100",
                      )}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
