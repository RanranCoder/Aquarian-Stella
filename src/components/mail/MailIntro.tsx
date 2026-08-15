"use client";

import { StarButton } from "@/components/StarButton";
import { MoonIcon, SparkleIcon } from "@/components/icons";

export function MailIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex w-full flex-col items-center gap-6 py-10 text-center md:py-16">
      {/* 装饰：月亮 + 稀疏星点（纯装饰，pointer-events 交给内容） */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="absolute left-1/2 top-[6%] -translate-x-1/2">
          <MoonIcon className="h-14 w-14 text-moon-200/70" />
        </span>
        <span className="animate-twinkle absolute left-[14%] top-[20%] h-1 w-1 rounded-full bg-lav-300" />
        <span className="animate-twinkle absolute right-[16%] top-[30%] h-1.5 w-1.5 rounded-full bg-gold-300" style={{ animationDelay: "1.2s" }} />
        <span className="animate-twinkle absolute left-[22%] top-[58%] h-1 w-1 rounded-full bg-moon-200" style={{ animationDelay: "0.6s" }} />
        <span className="animate-twinkle absolute right-[24%] top-[64%] h-1 w-1 rounded-full bg-lav-200" style={{ animationDelay: "2s" }} />
      </div>

      <SparkleIcon className="h-6 w-6 text-gold-300" />
      <h1 className="display-zh text-4xl md:text-5xl">星邮</h1>
      <p className="display-zh text-lg text-moon-200 md:text-xl">写一封信给 Ta</p>
      <p className="max-w-xs text-sm leading-relaxed text-moon-400 md:max-w-sm">
        有些话，也许现在说不出口。
        <br />
        但你可以先把它写下来。
      </p>
      <StarButton size="lg" arrow onClick={onStart}>
        写封信给 Ta
      </StarButton>
    </div>
  );
}
