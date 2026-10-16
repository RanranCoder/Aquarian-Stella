"use client";

import { useRef, useState } from "react";
import { downloadNodeAsPng } from "@/lib/share";
import { StarButton } from "./StarButton";
import { CheckIcon } from "./icons";

/**
 * 把指定 id 的节点（分享卡）导出为 PNG 图片。
 * 分享卡需用显式颜色（hex/rgba）书写，避免 Tailwind v4 的 color-mix 影响截图。
 */
export function SaveShareButton({
  targetId,
  filename,
}: {
  targetId: string;
  filename: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const resetTimer = useRef<number | null>(null);

  async function handle() {
    // 生成中直接返回，避免重复触发与状态互相覆盖
    if (state === "saving") return;
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    const node = document.getElementById(targetId);
    if (!node) {
      setState("error");
      return;
    }
    setState("saving");
    try {
      await downloadNodeAsPng(node, filename);
      setState("done");
      resetTimer.current = window.setTimeout(() => setState("idle"), 1800);
    } catch {
      // 生成失败给出可重试的提示，而不是静默回到初始状态
      setState("error");
    }
  }

  return (
    <StarButton
      variant={state === "done" ? "lav" : "glass"}
      size="sm"
      disabled={state === "saving"}
      onClick={handle}
    >
      {state === "done" ? (
        <>
          <CheckIcon className="h-4 w-4" />
          已保存
        </>
      ) : state === "saving" ? (
        "生成中…"
      ) : state === "error" ? (
        "保存失败，重试"
      ) : (
        "保存图片"
      )}
    </StarButton>
  );
}
