// src/components/mail/MailCompose.tsx
"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { StarButton } from "@/components/StarButton";
import { isValidEmailShape } from "@/lib/star-mail/validate";
import { ANONYMOUS_SIGNATURE } from "@/lib/star-mail/signature";
import { STAR_MAIL_DRAFT_KEY, type StarMailDraft } from "@/lib/star-mail/types";
import { store, useMounted } from "@/lib/store";

const TITLE_SUGGESTIONS = [
  "给你的一句话",
  "我一直想告诉你",
  "有些话想对你说",
  "好久不见",
  "谢谢你",
  "对不起",
  "我想你了",
  "写给未来的你",
];

const INPUT_CLASS =
  "h-12 w-full rounded-xl border border-hairline bg-white/[0.04] px-4 text-[15px] text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400";

function loadDraft(): StarMailDraft | null {
  try {
    const raw = window.localStorage.getItem(STAR_MAIL_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StarMailDraft>;
    if (typeof parsed.recipient !== "string") return null;
    return {
      recipient: parsed.recipient ?? "",
      title: parsed.title ?? "",
      signatureType: parsed.signatureType ?? "name",
      customSignature: parsed.customSignature ?? "",
      body: parsed.body ?? "",
      taName: parsed.taName ?? "",
    };
  } catch {
    return null;
  }
}

export function MailCompose({
  initial,
  onPreview,
}: {
  initial: StarMailDraft | null;
  onPreview: (draft: StarMailDraft) => void;
}) {
  const mounted = useMounted();
  const s = store.useStore();
  const nickname = mounted ? s.profile?.nickname ?? "" : "";

  // 首次挂载：优先用父组件传入的 initial；没有（如登录跳回/直开 /mail）则从 localStorage 恢复草稿。
  // typeof window 守卫避免 SSR 期间访问 localStorage。
  const [recipient, setRecipient] = useState(
    initial?.recipient ?? (typeof window !== "undefined" ? loadDraft()?.recipient ?? "" : ""),
  );
  const [taName, setTaName] = useState(
    initial?.taName ?? (typeof window !== "undefined" ? loadDraft()?.taName ?? "" : ""),
  );
  const [title, setTitle] = useState(
    initial?.title ?? (typeof window !== "undefined" ? loadDraft()?.title ?? "" : ""),
  );
  const [signatureType, setSignatureType] = useState<StarMailDraft["signatureType"]>(
    initial?.signatureType ?? (typeof window !== "undefined" ? loadDraft()?.signatureType ?? "name" : "name"),
  );
  const [customSignature, setCustomSignature] = useState(
    initial?.customSignature ?? (typeof window !== "undefined" ? loadDraft()?.customSignature ?? "" : ""),
  );
  const [body, setBody] = useState(
    initial?.body ?? (typeof window !== "undefined" ? loadDraft()?.body ?? "" : ""),
  );
  const [error, setError] = useState("");

  // 草稿自动保存（300ms 防抖）
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STAR_MAIL_DRAFT_KEY,
          JSON.stringify({ recipient, taName, title, signatureType, customSignature, body }),
        );
      } catch {
        // localStorage 不可用时静默降级
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [recipient, taName, title, signatureType, customSignature, body]);

  const emailOk = isValidEmailShape(recipient.trim());
  const bodyLen = body.length;

  function handlePreview() {
    setError("");
    if (!recipient.trim()) { setError("请填写收件邮箱"); return; }
    if (!taName.trim()) { setError("请填写 Ta 的昵称"); return; }
    if (!emailOk) { setError("邮箱格式不正确，请检查后再试"); return; }
    if (!body.trim()) { setError("写点什么吧，哪怕只有一句话"); return; }
    if (bodyLen > 2000) { setError("正文不能超过 2000 字"); return; }
    onPreview({
      recipient: recipient.trim().toLowerCase(),
      taName: taName.trim(),
      title: title.trim(),
      signatureType,
      customSignature: customSignature.trim(),
      body,
    });
  }

  return (
    <GlassCard glow="none" className="w-full">
      <div className="flex flex-col gap-7 p-5 md:p-7">
        <div className="text-center">
          <p className="text-sm tracking-[0.22em] text-gold-300">✦</p>
          <h1 className="display-zh mt-3 text-2xl">写封信给 Ta</h1>
        </div>

        {/* 收件邮箱 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-moon-500" htmlFor="sm-recipient">Ta 的邮箱</label>
          <input
            id="sm-recipient"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="example@email.com"
            className={INPUT_CLASS}
          />
          <p className="text-xs leading-relaxed text-moon-500">
            请确认邮箱地址准确无误，Stella 会将这封信寄往这里。
          </p>
        </div>

        {/* Ta 的昵称 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-moon-500" htmlFor="sm-taname">Ta 的昵称</label>
          <input
            id="sm-taname"
            type="text"
            value={taName}
            onChange={(e) => setTaName(e.target.value)}
            placeholder="比如：小星 / 小冉"
            maxLength={20}
            className={INPUT_CLASS}
          />
        </div>

        {/* 标题 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-moon-500" htmlFor="sm-title">
            信的标题 <span className="opacity-60">（可选）</span>
          </label>
          <input
            id="sm-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="有些话想告诉你"
            maxLength={60}
            className={INPUT_CLASS}
          />
          <div className="flex flex-wrap gap-2">
            {TITLE_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTitle(s)}
                className={`rounded-full border px-3 py-2 min-h-9 text-sm transition-colors ${
                  title === s
                    ? "border-gold-400/70 bg-gold-400/10 text-gold-200"
                    : "border-hairline text-moon-400 hover:border-gold-400/50 hover:text-moon-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 署名 */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-moon-500">署名</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            {(
              [
                { v: "name" as const, label: "我的名字", hint: nickname || "未设置昵称" },
                { v: "anonymous" as const, label: "匿名", hint: ANONYMOUS_SIGNATURE },
                { v: "custom" as const, label: "自定义署名", hint: "" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setSignatureType(o.v)}
                className={`flex min-h-11 flex-1 flex-col items-start justify-center rounded-xl border px-4 py-2.5 text-left transition-colors ${
                  signatureType === o.v
                    ? "border-lav-400/70 bg-lav-400/10"
                    : "border-hairline hover:border-lav-400/40"
                }`}
              >
                <span className="text-sm text-moon-100">{o.label}</span>
                {o.hint && (
                  <span className="mt-0.5 max-w-[16rem] truncate text-xs text-moon-500">{o.hint}</span>
                )}
              </button>
            ))}
          </div>
          {signatureType === "custom" && (
            <input
              type="text"
              value={customSignature}
              onChange={(e) => setCustomSignature(e.target.value)}
              placeholder="比如：R / 那个一直记得你的人 / 星星知道是谁"
              maxLength={30}
              className={INPUT_CLASS}
            />
          )}
        </div>

        {/* 正文 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-moon-500" htmlFor="sm-body">想说的话</label>
          <textarea
            id="sm-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            maxLength={2000}
            placeholder="写下你一直想说，却还没有说出口的话……"
            className="w-full resize-y rounded-xl border border-hairline bg-white/[0.04] px-4 py-3 text-[15px] leading-relaxed text-moon-100 outline-none transition-colors placeholder:text-moon-500 focus:border-lav-400"
          />
          <div className="text-right text-xs text-moon-500">{bodyLen} / 2000</div>
        </div>

        {/* 定时发送 UI 占位 */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-white/[0.02] px-4 py-3">
          <span className="text-sm text-moon-300">发送时机</span>
          <div className="inline-flex rounded-full border border-hairline p-0.5 text-sm">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-moon-200">立即寄出</span>
            <span className="px-3 py-1 text-moon-500">定时寄出</span>
          </div>
          <button
            type="button"
            onClick={() => setError("定时发送即将上线，先帮你立即寄出。")}
            className="ml-auto rounded-full border border-hairline px-3 py-1.5 min-h-9 text-xs text-moon-500 transition-colors hover:border-gold-400/50 hover:text-gold-300"
          >
            即将上线
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-center">
          <StarButton size="lg" arrow onClick={handlePreview}>预览这封信</StarButton>
        </div>
      </div>
    </GlassCard>
  );
}
