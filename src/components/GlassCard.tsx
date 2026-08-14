import { cn } from "@/lib/utils";

type Glow = "lav" | "gold" | "none";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  glow?: Glow;
  interactive?: boolean;
};

const GLOW_SHADOW: Record<Glow, string> = {
  lav: "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_32px_rgba(2,4,14,0.45),0_0_52px_rgba(155,142,196,0.16)]",
  gold: "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_32px_rgba(2,4,14,0.45),0_0_52px_rgba(201,169,110,0.15)]",
  none: "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_32px_rgba(2,4,14,0.45)]",
};

/**
 * Double-Bezel 嵌套玻璃卡：
 * 外层发丝渐变边框 + 内层半透明玻璃核心 + 内侧高光 + 低阴影。
 */
export function GlassCard({
  children,
  className,
  glow = "lav",
  interactive = false,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "group/card relative rounded-panel bg-gradient-to-b from-white/[0.14] to-white/[0.02] p-px",
        interactive &&
          "transition-transform duration-500 ease-luxe hover:-translate-y-1.5",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full rounded-[calc(var(--radius-panel)-1px)]",
          "bg-gradient-to-b from-night-800/85 to-night-900/95 backdrop-blur-xl",
          GLOW_SHADOW[glow],
        )}
      >
        {/* 顶角柔光：独立裁剪容器，不限制内容溢出（弹出面板可置顶显示） */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[calc(var(--radius-panel)-1px)]">
          <div className="absolute -top-24 left-1/2 h-48 w-[130%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_top,rgba(178,165,221,0.14),transparent_60%)]" />
        </div>
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  );
}
