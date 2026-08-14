import { cn } from "@/lib/utils";

type IconProps = { className?: string };

function Svg({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** 四角星芒 ✦ */
export function SparkleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden="true">
      <path
        d="M12 3c.7 4.1 2.4 6.6 6.5 7.4-4.1.7-5.8 3.3-6.5 7.3-.7-4-2.4-6.6-6.5-7.3 4.1-.8 5.8-3.3 6.5-7.4Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/** 实心星（愿望/星愿） */
export function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden="true">
      <path
        d="M12 3.4 14.2 9l5.8.4-4.5 3.7 1.5 5.6L12 15.6l-5 3.1 1.5-5.6L4 9.4 9.8 9 12 3.4Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/** ☉ 太阳 */
export function SunIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
    </Svg>
  );
}

/** ☽ 月亮 */
export function MoonIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </Svg>
  );
}

/** ↑ 上升 */
export function AscIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
    </Svg>
  );
}

/** 首页 */
export function HomeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </Svg>
  );
}

/** 心形（关系） */
export function HeartIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 19.5s-7.5-4.7-9-9.2C1.9 6.9 4.2 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 2.8 0 5.1 2.4 4 5.8-1.5 4.5-9 9.2-9 9.2Z" />
    </Svg>
  );
}

/** 星轨（星盘） */
export function OrbitIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="2.2" />
      <ellipse cx="12" cy="12" rx="8.5" ry="3.6" transform="rotate(-24 12 12)" />
      <path d="M20.5 12a8.5 8.5 0 0 1-2.9 6.4" transform="rotate(-24 12 12)" />
    </Svg>
  );
}

/** 指南针（探索） */
export function CompassIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </Svg>
  );
}

/** 愿望 · 星愿 */
export function WishIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3.4 14.2 9l5.8.4-4.5 3.7 1.5 5.6L12 15.6l-5 3.1 1.5-5.6L4 9.4 9.8 9 12 3.4Z" />
    </Svg>
  );
}

/** 向右箭头 */
export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </Svg>
  );
}

/** 右上箭头（分享/外链） */
export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 18 18 6M9 6h9v9" />
    </Svg>
  );
}

/** 加号 */
export function PlusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

/** 对勾 */
export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

/** 编辑 */
export function EditIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m13.5 6.5 3 3" />
    </Svg>
  );
}

/** 删除 */
export function TrashIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
    </Svg>
  );
}

/** 关闭 */
export function CloseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}

/** 菜单 */
export function MenuIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </Svg>
  );
}

/** 向下箭头 */
export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

/** 向左箭头 */
export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m14.5 6-6 6 6 6" />
    </Svg>
  );
}

/** 向右箭头 */
export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m9.5 6 6 6-6 6" />
    </Svg>
  );
}

/** 日历（日期选择器） */
export function CalendarIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
      <path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" />
    </Svg>
  );
}

/** 时钟（时间选择器） */
export function ClockIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" />
    </Svg>
  );
}

/** 盾牌（隐私） */
export function ShieldIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3 5 5.8v5.2c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V5.8L12 3Z" />
      <path d="m9 12 2 2 4-4.5" />
    </Svg>
  );
}

/** 设置 */
export function SettingsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7" />
    </Svg>
  );
}

/** 聊天/星语室 */
export function ChatIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M8.5 10.2h7M8.5 13.2h4.5" />
    </Svg>
  );
}

/** 月相（新月/满月） */
export function MoonPhaseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 3.5a8.5 8.5 0 0 1 0 17" />
    </Svg>
  );
}
