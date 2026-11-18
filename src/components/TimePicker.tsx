"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ClockIcon, CheckIcon } from "./icons";

type TimePickerProps = {
  value: string; // HH:mm 或空
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const QUICK_MINUTES = [0, 15, 30, 45];

function Col({
  label,
  values,
  selected,
  onPick,
  listRef,
}: {
  label: string;
  values: number[];
  selected: number | null;
  onPick: (v: number) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
}) {
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, value: number) {
    const currentIndex = values.indexOf(value);
    let nextIndex: number;
    switch (event.key) {
      case "ArrowUp":
        nextIndex = currentIndex - 1;
        break;
      case "ArrowDown":
        nextIndex = currentIndex + 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = values.length - 1;
        break;
      case "PageUp":
        nextIndex = currentIndex - 5;
        break;
      case "PageDown":
        nextIndex = currentIndex + 5;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextValue = values[Math.min(Math.max(nextIndex, 0), values.length - 1)];
    onPick(nextValue);
    const nextButton = listRef.current?.querySelectorAll<HTMLButtonElement>(
      "[role='option']",
    )[values.indexOf(nextValue)];
    nextButton?.focus();
    nextButton?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className="pb-1 text-center text-xs text-moon-500">{label}</p>
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        aria-orientation="vertical"
        className="scroll-thin max-h-56 overflow-y-auto pr-0.5"
      >
        {values.map((v) => {
          const active = selected === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onPick(v)}
              role="option"
              aria-selected={active}
              tabIndex={active || (selected === null && v === values[0]) ? 0 : -1}
              aria-label={`选择 ${String(v).padStart(2, "0")} ${label}`}
              onKeyDown={(event) => onKeyDown(event, v)}
              className={cn(
                "flex min-h-11 w-full items-center justify-center rounded-lg text-[0.9375rem] transition-colors",
                active
                  ? "bg-lav-400/20 font-medium text-lav-200"
                  : "text-moon-300 hover:bg-white/[0.06] hover:text-moon-100",
              )}
            >
              {String(v).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 自绘时间选择器：时/分双列滚动选择，不使用浏览器原生控件 */
export function TimePicker({
  value,
  onChange,
  placeholder = "请选择时间",
  ariaLabel,
  ariaDescribedBy,
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  const [min, setMin] = useState<number | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minListRef = useRef<HTMLDivElement>(null);
  const popupId = useId();

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (dialogRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
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

  // 弹层经 Portal 渲染到 body 并 fixed 定位：跟随触发器，视口内夹紧、必要时向上翻转
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const dialog = dialogRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const gap = 8;
    const width = dialog?.offsetWidth || 208;
    const height = dialog?.offsetHeight || 0;
    const left = Math.min(
      Math.max(rect.left, margin),
      Math.max(margin, window.innerWidth - width - margin),
    );
    let top = rect.bottom + gap;
    if (height > 0 && top + height > window.innerHeight - margin) {
      const above = rect.top - gap - height;
      top =
        above >= margin
          ? above
          : Math.max(margin, window.innerHeight - height - margin);
    }
    setPos({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const selected = dialogRef.current?.querySelector<HTMLButtonElement>(
      "button[aria-selected='true']:not(:disabled)",
    );
    (
      selected ??
      dialogRef.current?.querySelector<HTMLButtonElement>(
        "[role='option'][tabindex='0']",
      )
    )?.focus();
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      if (value && value.includes(":")) {
        const [h, m] = value.split(":").map(Number);
        setHour(h);
        setMin(m);
      } else {
        setHour(null);
        setMin(null);
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    const sel = (list: HTMLDivElement | null, v: number | null) => {
      if (list && v !== null) {
        list.children[v]?.scrollIntoView({ block: "center" });
      }
    };
    sel(hourListRef.current, hour);
    sel(minListRef.current, min);
  }, [open, hour, min]);

  function commit() {
    if (hour === null || min === null) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    onChange(`${pad(hour)}:${pad(min)}`);
    setOpen(false);
    triggerRef.current?.focus();
  }

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
          "flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[0.9375rem] outline-none transition-colors",
          open
            ? "border-lav-400 bg-white/[0.06]"
            : "border-hairline bg-white/[0.04] hover:border-white/20",
        )}
      >
        <span
          className={cn("truncate", value ? "text-moon-100" : "text-moon-500")}
        >
          {value || placeholder}
        </span>
        <ClockIcon
          className={cn(
            "h-4 w-4 shrink-0 text-moon-400 transition-colors",
            open && "text-lav-300",
          )}
        />
      </button>

      {open &&
        createPortal(
          <div
            id={popupId}
            ref={dialogRef}
            role="dialog"
            aria-label={ariaLabel}
            style={{
              left: pos?.left ?? -9999,
              top: pos?.top ?? -9999,
              visibility: pos ? "visible" : "hidden",
            }}
            className="fixed z-[60] w-52 rounded-xl border border-hairline bg-night-800/95 p-2.5 shadow-card-lg backdrop-blur-xl"
          >
          <div className="flex gap-2">
            <Col
              label="时"
              values={HOURS}
              selected={hour}
              onPick={setHour}
              listRef={hourListRef}
            />
            <div className="w-px bg-white/[0.08]" aria-hidden="true" />
            <Col
              label="分"
              values={MINUTES}
              selected={min}
              onPick={setMin}
              listRef={minListRef}
            />
          </div>
          <div className="mt-2 border-t border-white/[0.06] pt-2">
            <p className="mb-1.5 text-xs text-moon-500">分钟快捷选择</p>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_MINUTES.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  onClick={() => setMin(minute)}
                  aria-pressed={min === minute}
                  className={cn(
                    "min-h-11 rounded-lg text-sm transition-colors",
                    min === minute
                      ? "bg-lav-400/20 font-medium text-lav-200"
                      : "text-moon-300 hover:bg-white/[0.06] hover:text-moon-100",
                  )}
                >
                  {String(minute).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
          <p aria-live="polite" className="sr-only">
            {hour === null || min === null
              ? "请选择小时和分钟"
              : `已选择 ${String(hour).padStart(2, "0")} 点 ${String(min).padStart(2, "0")} 分`}
          </p>
          <div className="mt-2 flex justify-end border-t border-white/[0.06] pt-2">
            <button
              type="button"
              disabled={hour === null || min === null}
              onClick={commit}
              className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                hour === null || min === null
                  ? "cursor-not-allowed text-moon-500 opacity-50"
                  : "bg-gradient-to-b from-gold-200 to-gold-400 text-night-950 active:scale-95",
              )}
            >
              <CheckIcon className="h-3.5 w-3.5" />
              确定
            </button>
          </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
