import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "./icons";

type StarButtonProps = {
  children: React.ReactNode;
  variant?: "gold" | "lav" | "glass" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  arrow?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

const VARIANTS = {
  gold: "bg-gradient-to-b from-gold-200 via-gold-400 to-gold-500 text-night-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_28px_rgba(201,169,110,0.28)]",
  lav: "bg-gradient-to-b from-lav-200 via-lav-400 to-lav-500 text-night-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_28px_rgba(155,142,196,0.28)]",
  glass: "glass-strong text-moon-100 hover:bg-white/10",
  ghost: "border border-hairline text-moon-200 hover:border-lav-400/60 hover:text-moon-100",
} as const;

const SIZES = {
  sm: "px-4 py-2.5 min-h-11 text-sm gap-1.5",
  md: "px-6 py-3 text-[15px] gap-2",
  lg: "px-8 py-4 text-base gap-2.5",
} as const;

/**
 * 主按钮：胶囊 + 渐变 + 按下缩放；arrow 时尾随图标嵌入独立圆形（Button-in-Button）。
 */
export function StarButton({
  children,
  variant = "gold",
  size = "md",
  href,
  className,
  arrow = false,
  onClick,
  type = "button",
  disabled,
}: StarButtonProps) {
  const base = cn(
    "group/btn relative inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium",
    "transition-all duration-300 ease-luxe active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  const inner = (
    <>
      <span className="relative">{children}</span>
      {arrow && (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-night-950/12 transition-transform duration-300 ease-luxe group-hover/btn:translate-x-0.5 group-hover/btn:scale-105 group-hover/btn:-translate-y-px">
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={base}>
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      {inner}
    </button>
  );
}
