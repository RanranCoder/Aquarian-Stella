"use client";

import { useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("页面错误:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-6 py-24 md:py-32">
      <GlassCard glow="gold">
        <div className="flex flex-col items-center gap-5 px-8 py-14 text-center">
          <span className="animate-breathe text-4xl text-moon-400">✦</span>
          <h1 className="display-zh text-3xl">星轨暂时偏离了方向</h1>
          <p className="max-w-sm text-sm leading-relaxed text-moon-400">
            页面遇到了一个暂时的问题，请稍后再试。
          </p>
          <div className="flex gap-3">
            <StarButton onClick={reset} arrow>
              重试
            </StarButton>
            <StarButton href="/" variant="ghost">
              回到首页
            </StarButton>
          </div>
          {error.digest && (
            <p className="text-xs text-moon-500">错误代码: {error.digest}</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}