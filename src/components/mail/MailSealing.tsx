// src/components/mail/MailSealing.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { store, useMounted } from "@/lib/store";
import { resolveSignature } from "@/lib/star-mail/signature";
import type { StarMailDraft } from "@/lib/star-mail/types";
import "../../app/mail/mail-sealing.css";

type SendState =
  | { kind: "sending" }
  | { kind: "error"; reason: string }
  | { kind: "done"; masked: string };

export function MailSealing({
  draft,
  turnstileToken,
  onDone,
  onError,
}: {
  draft: StarMailDraft;
  turnstileToken: string;
  onDone: (masked: string) => void;
  onError: (reason: string) => void;
}) {
  const mounted = useMounted();
  const nickname = mounted ? store.useStore().profile?.nickname : undefined;
  const nicknameRef = useRef(nickname);

  const [animDone, setAnimDone] = useState(false);
  const [send, setSend] = useState<SendState>({ kind: "sending" });

  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  const firedRef = useRef(false);

  // 同步最新的 nickname / 回调到 ref（effect 内更新，避免 render 期间写 ref）
  useEffect(() => {
    nicknameRef.current = nickname;
    onDoneRef.current = onDone;
    onErrorRef.current = onError;
  }, [nickname, onDone, onError]);

  // 动画时长（尊重 prefers-reduced-motion 与 app 内动效开关）
  useEffect(() => {
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("motion-reduced");
    const t = window.setTimeout(() => setAnimDone(true), reduced ? 500 : 2600);
    return () => window.clearTimeout(t);
  }, []);

  // 动画与发送都完成后再进入终态
  useEffect(() => {
    if (!animDone || firedRef.current) return;
    if (send.kind === "done") {
      firedRef.current = true;
      onDoneRef.current(send.masked);
    } else if (send.kind === "error") {
      firedRef.current = true;
      onErrorRef.current(send.reason);
    }
  }, [animDone, send]);

  // 发起发送
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/star-mail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: draft.recipient.trim(),
            title: draft.title.trim(),
            body: draft.body,
            signature: resolveSignature(draft, nicknameRef.current),
            taName: draft.taName.trim(),
            turnstileToken,
          }),
        });
        const data = (await res.json()) as { error?: string; maskedRecipient?: string };
        if (!res.ok) {
          if (alive) setSend({ kind: "error", reason: data.error ?? "SEND_FAILED" });
          return;
        }
        if (alive && data.maskedRecipient) setSend({ kind: "done", masked: data.maskedRecipient });
      } catch {
        if (alive) setSend({ kind: "error", reason: "SEND_FAILED" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [draft, turnstileToken]);

  return (
    <div className="flex w-full flex-col items-center gap-8 py-6 text-center">
      <div className="seal-stage relative flex h-64 w-full max-w-xs flex-col items-center justify-center">
        {/* 信纸 */}
        <div className="seal-letter h-52 w-40 rounded-lg bg-[#FFFDF6] p-4 shadow-card-lg">
          <p className="text-[10px] tracking-[0.2em] text-[#9E98B3]">To: Ta</p>
          <p className="mt-2 text-[12px] font-medium text-[#0D1124]">
            {draft.title || "有些话想告诉你"}
          </p>
          <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-[#1B2034]">
            {draft.body}
          </p>
        </div>
        {/* 信封（折叠后出现，沿星轨飞走） */}
        <div className="seal-envelope absolute grid h-24 w-36 place-items-center rounded-md bg-gradient-to-b from-[#EAD9B4] to-[#D8BF92] shadow-card-lg">
          <span className="text-xl text-[#0D1124]">✦</span>
        </div>
      </div>

      <p className="seal-text-1 text-sm text-moon-200">把这份心意交给星星。</p>
      <p className="seal-text-2 text-sm text-moon-400">正在寄出……</p>
    </div>
  );
}
