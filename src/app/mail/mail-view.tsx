"use client";

import { useState } from "react";
import { MailIntro } from "@/components/mail/MailIntro";
import { MailCompose } from "@/components/mail/MailCompose";
import { MailPreview } from "@/components/mail/MailPreview";
import { MailSealing } from "@/components/mail/MailSealing";
import { MailSent } from "@/components/mail/MailSent";
import { STAR_MAIL_DRAFT_KEY, type StarMailDraft } from "@/lib/star-mail/types";

type Step = "intro" | "compose" | "preview" | "sealing" | "sent";

export function errorText(reason: string): string {
  switch (reason) {
    case "RATE_LIMITED": return "今天寄出的信有点多了，明天再试试吧。";
    case "SPAM_URL": return "信件中包含过多链接，请移除后再试。";
    case "SPAM_KEYWORD": return "信件中包含疑似广告内容，请调整后再试。";
    case "SPAM_REPEAT": return "信件中重复内容过多，请调整后再试。";
    case "TURNSTILE_FAILED": return "人机验证未通过，请重试。";
    case "SEND_FAILED": return "信件暂时没有寄出，请稍后重试。";
    default: return "信件暂时没有寄出，请稍后重试。";
  }
}

export function MailView() {
  // 登录跳回 /mail 时，若本地有未寄出的草稿，直接回到写信步，而非 intro
  const [step, setStep] = useState<Step>(() =>
    typeof window !== "undefined" && window.localStorage.getItem(STAR_MAIL_DRAFT_KEY)
      ? "compose"
      : "intro",
  );
  const [draft, setDraft] = useState<StarMailDraft | null>(null);
  const [token, setToken] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [sendError, setSendError] = useState("");
  const [masked, setMasked] = useState("");

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col items-center justify-center px-5 py-14 md:py-20">
      {step === "intro" && <MailIntro onStart={() => setStep("compose")} />}

      {step === "compose" && (
        <MailCompose
          initial={draft}
          onPreview={(d) => {
            setDraft(d);
            setSendError("");
            setStep("preview");
          }}
        />
      )}

      {step === "preview" && (
        <MailPreview
          key={previewKey}
          draft={draft!}
          sendError={sendError}
          onEdit={() => setStep("compose")}
          onSeal={(t) => {
            setToken(t);
            setStep("sealing");
          }}
        />
      )}

      {step === "sealing" && (
        <MailSealing
          draft={draft!}
          turnstileToken={token}
          onDone={(m) => {
            setMasked(m);
            try {
              window.localStorage.removeItem(STAR_MAIL_DRAFT_KEY);
            } catch {
              // 忽略
            }
            setStep("sent");
          }}
          onError={(reason) => {
            setSendError(errorText(reason));
            setPreviewKey((k) => k + 1); // 让 Turnstile 重新渲染拿新 token
            setStep("preview");
          }}
        />
      )}

      {step === "sent" && <MailSent masked={masked} />}
    </div>
  );
}
