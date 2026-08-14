"use client";

import { StarButton } from "@/components/StarButton";
import { store, useMounted } from "@/lib/store";

/** 根据是否建档决定 CTA 去向：未建档→Onboarding，已建档→今日星语 */
export function HeroCta({ size = "lg" }: { size?: "sm" | "md" | "lg" }) {
  const mounted = useMounted();
  const s = store.useStore();
  const href = mounted && s.onboarded ? "/today" : "/onboarding";
  return (
    <StarButton href={href} size={size} arrow>
      开始探索
    </StarButton>
  );
}
