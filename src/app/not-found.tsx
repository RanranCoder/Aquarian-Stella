import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 md:py-32">
      <GlassCard glow="lav">
        <div className="flex flex-col items-center gap-5 px-8 py-14 text-center">
          <span className="animate-breathe text-4xl text-moon-400">✦</span>
          <h1 className="display-zh text-3xl">这片星空里，没有这颗星星</h1>
          <p className="max-w-sm text-sm leading-relaxed text-moon-400">
            你访问的页面不存在，或已经被星轨带走了。
          </p>
          <StarButton href="/" arrow>
            回到首页
          </StarButton>
        </div>
      </GlassCard>
    </div>
  );
}
