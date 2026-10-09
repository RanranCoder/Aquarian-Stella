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
  ariaDescribedBy?: string;
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
  ariaDescribedBy,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"month" | "year">("month");
  const [vy, setVy] = useState(() => todayParts().y);
  const [vm, setVm] = useState(() => todayParts().m);
  const [focusedDay, setFocusedDay] = useState(() => new Date().getDate());
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const popupId = useId();

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (open && e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const firstFocusable =
      dialogRef.current?.querySelector<HTMLButtonElement>(
        "button[tabindex='0']:not(:disabled)",
      ) ??
      dialogRef.current?.querySelector<HTMLButtonElement>(
        "button:not(:disabled)",
      );
    firstFocusable?.focus();
  }, [open, mode, vm, vy, focusedDay]);

  function isDisabled(y: number, m: number, d: number): boolean {
    const iso = toISO(y, m, d);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  function monthIsUnavailable(y: number, m: number): boolean {
    const first = toISO(y, m, 1);
    const last = toISO(y, m, daysInMonth(y, m));
    return Boolean((min && last < min) || (max && first > max));
  }

  function yearIsUnavailable(y: number): boolean {
    return Boolean((min && `${y}-12-31` < min) || (max && `${y}-01-01` > max));
  }

  function yearRangeIsUnavailable(firstYear: number): boolean {
    return Array.from({ length: 12 }, (_, index) =>
      yearIsUnavailable(firstYear + index),
    ).every(Boolean);
  }

  function nearestEnabledDay(y: number, m: number, preferred: number): number {
    const count = daysInMonth(y, m);
    const start = Math.min(Math.max(preferred, 1), count);
    for (let distance = 0; distance <= count; distance++) {
      const before = start - distance;
      if (before >= 1 && !isDisabled(y, m, before)) return before;
      const after = start + distance;
      if (distance > 0 && after <= count && !isDisabled(y, m, after)) {
        return after;
      }
    }
    return 1;
  }

  function focusDate(date: Date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    if (monthIsUnavailable(y, m)) return;
    setVy(y);
    setVm(m);
    setFocusedDay(nearestEnabledDay(y, m, date.getDate()));
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const src = value ? value : toISO(todayParts().y, todayParts().m, 1);
      const [y, m, d] = src.split("-").map(Number);
      setVy(y);
      setVm(m);
      setFocusedDay(nearestEnabledDay(y, m, d || 1));
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

  function pickDay(d: number) {
    if (isDisabled(vy, vm, d)) return;
    onChange(toISO(vy, vm, d));
    setFocusedDay(d);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveMonth(delta: number) {
    const next = new Date(vy, vm - 1 + delta, 1);
    const y = next.getFullYear();
    const m = next.getMonth() + 1;
    if (monthIsUnavailable(y, m)) return;
    focusDate(new Date(y, m - 1, Math.min(focusedDay, daysInMonth(y, m))));
  }

  function onDateKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, day: number) {
    const current = new Date(vy, vm - 1, day);
    let next: Date;
    switch (event.key) {
      case "ArrowLeft":
        next = new Date(vy, vm - 1, day - 1);
        break;
      case "ArrowRight":
        next = new Date(vy, vm - 1, day + 1);
        break;
      case "ArrowUp":
        next = new Date(vy, vm - 1, day - 7);
        break;
      case "ArrowDown":
        next = new Date(vy, vm - 1, day + 7);
        break;
      case "Home":
        next = new Date(vy, vm - 1, day - current.getDay());
        break;
      case "End":
        next = new Date(vy, vm - 1, day + 6 - current.getDay());
        break;
      case "PageUp":
        next = new Date(vy, vm - 1 + (event.shiftKey ? -12 : -1), day);
        break;
      case "PageDown":
        next = new Date(vy, vm - 1 + (event.shiftKey ? 12 : 1), day);
        break;
      default:
        return;
    }
    event.preventDefault();
    focusDate(next);
  }

  const yearBase = vy - (vy % 12);
  const rovingDay = nearestEnabledDay(vy, vm, focusedDay);
  const rovingYear = !yearIsUnavailable(vy)
    ? vy
    : Array.from({ length: 12 }, (_, index) => yearBase + index).find(
        (candidate) => !yearIsUnavailable(candidate),
      );
  const previousMonth = new Date(vy, vm - 2, 1);
  const nextMonth = new Date(vy, vm, 1);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popupId}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
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
          ref={dialogRef}
          role="dialog"
          aria-label={ariaLabel}
          className="absolute left-1/2 top-full z-50 mt-2 w-[min(20.75rem,calc(100vw-1rem))] -translate-x-1/2 rounded-xl border border-hairline bg-night-800/95 p-2 shadow-card-lg backdrop-blur-xl"
        >
          {mode === "month" ? (
            <>
              {/* 头部 */}
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  disabled={monthIsUnavailable(previousMonth.getFullYear(), previousMonth.getMonth() + 1)}
                  aria-label="上个月"
                  className="grid h-11 w-11 place-items-center rounded-lg text-moon-400 transition-colors hover:bg-white/[0.06] hover:text-moon-100 disabled:cursor-not-allowed disabled:opacity-35"
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
                  onClick={() => moveMonth(1)}
                  disabled={monthIsUnavailable(nextMonth.getFullYear(), nextMonth.getMonth() + 1)}
                  aria-label="下个月"
                  className="grid h-11 w-11 place-items-center rounded-lg text-moon-400 transition-colors hover:bg-white/[0.06] hover:text-moon-100 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>

              {/* 星期 */}
              <p aria-live="polite" className="sr-only">
                {vy}年{vm}月
              </p>
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
              <div
                className="flex flex-col gap-0.5"
                role="grid"
                aria-label={`${vy}年${vm}月`}
                aria-describedby={`${popupId}-keyboard-help`}
              >
                {weeks.map((week, wi) => (
                  <div key={wi} role="row" className="grid grid-cols-7">
                    {week.map((d, di) => {
                      if (d === 0)
                        return (
                          <span key={di} className="h-11" aria-hidden="true" />
                        );
                      const iso = toISO(vy, vm, d);
                      const selected = iso === value;
                      const isToday = iso === todayISO;
                      const disabled = isDisabled(vy, vm, d);
                      return (
                        <div key={di} role="gridcell" className="grid place-items-center">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => pickDay(d)}
                            onFocus={() => setFocusedDay(d)}
                            onKeyDown={(event) => onDateKeyDown(event, d)}
                            data-date={iso}
                            tabIndex={d === rovingDay && !disabled ? 0 : -1}
                            aria-label={`${vy}年${vm}月${d}日`}
                            aria-current={isToday ? "date" : undefined}
                            aria-pressed={selected}
                            className={cn(
                              "flex h-11 w-full items-center justify-center rounded-lg text-sm transition-colors",
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
              <p id={`${popupId}-keyboard-help`} className="sr-only">
                使用方向键逐日移动，Home 和 End 移动到本周首尾，Page Up 和 Page Down 切换月份；按住 Shift 切换年份。
              </p>
            </>
          ) : (
            <>
              {/* 年份选择 */}
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setVy((y) => y - 12)}
                  disabled={yearRangeIsUnavailable(yearBase - 12)}
                  aria-label="上一年代"
                  className="grid h-11 w-11 place-items-center rounded-lg text-moon-400 transition-colors hover:bg-white/[0.06] hover:text-moon-100 disabled:cursor-not-allowed disabled:opacity-35"
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
                  disabled={yearRangeIsUnavailable(yearBase + 12)}
                  aria-label="下一年代"
                  className="grid h-11 w-11 place-items-center rounded-lg text-moon-400 transition-colors hover:bg-white/[0.06] hover:text-moon-100 disabled:cursor-not-allowed disabled:opacity-35"
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
                      tabIndex={y === rovingYear ? 0 : -1}
                      onClick={() => {
                        let month = vm;
                        const [minYear, minMonth] = min?.split("-").map(Number) ?? [];
                        const [maxYear, maxMonth] = max?.split("-").map(Number) ?? [];
                        if (minYear === y && minMonth && month < minMonth) {
                          month = minMonth;
                        }
                        if (maxYear === y && maxMonth && month > maxMonth) {
                          month = maxMonth;
                        }
                        if (monthIsUnavailable(y, month)) {
                          month = Array.from({ length: 12 }, (_, index) => index + 1).find(
                            (candidate) => !monthIsUnavailable(y, candidate),
                          ) ?? month;
                        }
                        setVy(y);
                        setVm(month);
                        setFocusedDay(nearestEnabledDay(y, month, focusedDay));
                        setMode("month");
                      }}
                      disabled={yearIsUnavailable(y)}
                      className={cn(
                        "h-11 rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35",
                        yearIsUnavailable(y)
                          ? "text-moon-500"
                          : sel
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
