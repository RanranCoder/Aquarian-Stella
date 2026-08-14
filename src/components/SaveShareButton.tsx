"use client";

import { useState } from "react";
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
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  async function handle() {
    const node = document.getElementById(targetId);
    if (!node) return;
    setState("saving");
    const timer = window.setTimeout(() => setState("idle"), 10000); // 兜底，避免无限卡住
    try {
      await downloadNodeAsPng(node, filename);
      window.clearTimeout(timer);
      setState("done");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      window.clearTimeout(timer);
      setState("idle");
    }
  }

  return (
    <StarButton
      variant={state === "done" ? "lav" : "glass"}
      size="sm"
      onClick={handle}
    >
      {state === "done" ? (
        <>
          <CheckIcon className="h-4 w-4" />
          已保存
        </>
      ) : state === "saving" ? (
        "生成中…"
      ) : (
        "保存图片"
      )}
    </StarButton>
  );
}
