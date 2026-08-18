// src/components/mail/MailSent.tsx
"use client";

import { StarButton } from "@/components/StarButton";
import { SparkleIcon } from "@/components/icons";

export function MailSent({ masked }: { masked: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-5 py-8 text-center">
      <SparkleIcon className="h-6 w-6 text-gold-300" />
      <h1 className="display-zh text-3xl md:text-4xl">已启程</h1>
      <p className="text-sm leading-relaxed text-moon-300">这封信已经寄出。</p>
      <p className="text-sm leading-relaxed text-moon-300">
        希望 Ta 能在某个刚刚好的时刻，
        <br />
        看见它。
      </p>
      <p className="rounded-full border border-hairline bg-white/[0.04] px-4 py-2 text-sm text-moon-400">
        已发送至：<span className="text-moon-200">{masked}</span>
      </p>
      <div className="mt-2">
        <StarButton href="/" size="lg" arrow>回到星语星愿</StarButton>
      </div>
    </div>
  );
}
