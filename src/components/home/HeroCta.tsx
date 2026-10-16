"use client";

import { StarButton } from "@/components/StarButton";
import { store, useMounted } from "@/lib/store";

/** 根据是否建档决定 CTA 去向与文案：未建档→Onboarding，已建档→今日星语 */
export function HeroCta({ size = "lg" }: { size?: "sm" | "md" | "lg" }) {
  const mounted = useMounted();
  const s = store.useStore();
  const onboarded = mounted && s.onboarded;
  return (
    <div className="flex flex-col items-center gap-3">
      <StarButton href={onboarded ? "/today" : "/onboarding"} size={size} arrow>
        {onboarded ? "查看今日星语" : "生成我的今日星语"}
      </StarButton>
      {!onboarded && (
        <p className="text-xs leading-relaxed text-moon-500 md:text-sm">
          登录后填写生日 · 时间与城市可稍后补充
        </p>
      )}
    </div>
  );
}
