// src/components/mail/MailPreview.tsx
"use client";

import { useState } from "react";
import { StarButton } from "@/components/StarButton";
import { Turnstile } from "@/components/Turnstile";
import { useAuth } from "@/lib/use-auth";
import { resolveSignature } from "@/lib/star-mail/signature";
import { store, useMounted } from "@/lib/store";
import type { StarMailDraft } from "@/lib/star-mail/types";

export function MailPreview({
  draft,
  sendError,
  onEdit,
  onSeal,
}: {
  draft: StarMailDraft;
  sendError: string;
  onEdit: () => void;
  onSeal: (turnstileToken: string) => void;
}) {
  const mounted = useMounted();
  const nickname = mounted ? store.useStore().profile?.nickname : undefined;
  const auth = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const signature = resolveSignature(draft, nickname);

  function handleSeal() {
    if (auth.status !== "authenticated") {
      setShowLogin(true);
      return;
    }
    if (confirmed && turnstileToken) onSeal(turnstileToken);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* 信纸 */}
      <div className="rounded-[1.5rem] bg-[#FFFDF6] px-5 py-6 text-[#1B2034] shadow-card-lg md:px-8 md:py-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-lg text-[#B08D55]">✦</span>
          <p className="text-sm tracking-[0.24em] text-[#837D9C]">To: Ta</p>
          <h2 className="display-zh mt-3 text-xl text-[#0D1124] md:text-2xl">
            {draft.title || "有些话想告诉你"}
          </h2>
        </div>
        <div className="mx-auto mt-6 h-px w-24 bg-[#EAD9B4]" />
        <p className="mt-6 text-[15px] leading-loose text-[#1B2034]">亲爱的 {draft.taName}：</p>
        <p className="mt-2 whitespace-pre-line text-[15px] leading-loose text-[#1B2034]">{draft.body}</p>
        <p className="mt-8 text-right text-[15px] text-[#1B2034]">—— {signature}</p>
        <div className="mt-10 text-center">
          <span className="text-[12px] tracking-[0.3em] text-[#9E98B3]">Stella</span>
        </div>
      </div>

      {/* 收件邮箱确认 */}
      <label className="flex min-h-11 items-start gap-2.5 text-sm text-moon-300">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-[#9B8EC4]"
        />
        <span>
          我已确认收件邮箱 <span className="text-moon-100">{draft.recipient}</span> 准确无误
        </span>
      </label>

      {sendError && <p className="text-sm text-red-400">{sendError}</p>}

      {auth.status === "loading" && (
        <p className="text-center text-sm text-moon-500">正在确认登录状态…</p>
      )}

      {auth.status === "anonymous" && !showLogin && (
        <p className="text-sm text-moon-400">发送需要登录 Stella。登录后，你的信会在本地草稿中保留。</p>
      )}

      {showLogin && (
        <div className="rounded-2xl border border-gold-400/40 bg-gold-400/[0.06] p-6 text-center">
          <p className="text-sm leading-relaxed text-moon-200">
            发送前先登录 Stella，这封信会保存在你的草稿里。
          </p>
          <div className="mt-4 flex justify-center">
            <StarButton href="/login?next=/mail" size="md" variant="gold">
              去登录
            </StarButton>
          </div>
        </div>
      )}

      {/* 操作区 */}
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <StarButton variant="ghost" onClick={onEdit}>重新编辑</StarButton>
        {auth.status === "authenticated" && (
          <StarButton size="lg" arrow disabled={!confirmed || !turnstileToken} onClick={handleSeal}>
            封存这封信
          </StarButton>
        )}
        {auth.status === "anonymous" && (
          <StarButton size="lg" arrow disabled={!confirmed} onClick={handleSeal}>
            封存这封信
          </StarButton>
        )}
      </div>

      {auth.status === "authenticated" && (
        <Turnstile onToken={setTurnstileToken} className="min-h-[65px]" />
      )}
    </div>
  );
}
