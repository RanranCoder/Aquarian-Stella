import { StarIcon } from "./icons";

/**
 * 品牌分享卡框架（9:16，适配手机分享）。
 * 全部使用显式颜色（hex/rgba），避免 Tailwind v4 color-mix 影响 modern-screenshot 截图。
 */
export function ShareCardFrame({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        width: "min(340px, 100%)",
        aspectRatio: "9 / 16",
        background:
          "linear-gradient(168deg, #151B33 0%, #0D1124 46%, #080A12 100%)",
      }}
      className="relative mx-auto flex flex-col overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.14)] px-7 pb-6 pt-7 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
    >
      {/* 顶部品牌 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            style={{ background: "linear-gradient(180deg,#EAD9B4,#C9A96E)" }}
            className="grid h-7 w-7 place-items-center rounded-full text-[#080A12]"
          >
            <StarIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[15px] font-semibold tracking-wide text-[#F2EFF8]">
            星语星愿
          </span>
        </div>
        <span className="text-[#9B8EC4]">✦</span>
      </div>

      {/* 内容区 */}
      <div className="flex flex-1 flex-col items-center justify-center">
        {children}
      </div>

      {/* 底部 */}
      <p className="pt-3 text-center text-[10px] tracking-[0.3em] text-[#6E6885]">
        看见星象，也看见自己
      </p>
    </div>
  );
}
