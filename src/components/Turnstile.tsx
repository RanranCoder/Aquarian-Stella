"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ShieldIcon } from "@/components/icons";

export const TURNSTILE_SITE_KEY =
  process.env.NODE_ENV === "production"
    ? "0x4AAAAAAEP16wGPL8pzhXil"
    : "1x00000000000000000000AA";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const STATUS_TEXT = {
  checking: "正在进行人机验证…",
  interactive: "请完成下方人机验证",
  verified: "人机验证已通过",
  "load-error": "人机验证加载失败",
  error: "人机验证失败",
  timeout: "人机验证已超时",
};

type Status = keyof typeof STATUS_TEXT;
type TurnstileApi = NonNullable<Window["turnstile"]>;
let apiPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  apiPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    const fail = () => {
      script.remove();
      reject(new Error("Turnstile did not load"));
    };
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    apiPromise = undefined;
    throw error;
  });

  return apiPromise;
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const onTokenRef = useRef(onToken);
  const [status, setStatus] = useState<Status>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let removeWidget: (() => void) | undefined;

    const update = (nextStatus: Status, token = "") => {
      if (cancelled) return;
      setStatus(nextStatus);
      onTokenRef.current(token);
    };

    void loadTurnstile().then((api) => {
      if (cancelled) return;
      let size: "compact" | "flexible" | undefined;

      const render = () => {
        // Cloudflare's flexible widget needs at least 300 CSS pixels.
        const nextSize = container.getBoundingClientRect().width < 300 ? "compact" : "flexible";
        if (size === nextSize) return;
        removeWidget?.();
        size = nextSize;
        update("checking");

        try {
          let active = true;
          const report = (nextStatus: Status, token?: string) => {
            if (active) update(nextStatus, token);
          };
          const id = api.render(container, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: "dark",
            language: "zh-cn",
            size,
            appearance: "interaction-only",
            "response-field": false,
            callback: (token: string) => report("verified", token),
            "before-interactive-callback": () => report("interactive"),
            "expired-callback": () => report("checking"),
            "timeout-callback": () => report("timeout"),
            "unsupported-callback": () => report("error"),
            "error-callback": () => {
              report("error");
              return true;
            },
          });
          removeWidget = () => {
            active = false;
            api.remove(id);
          };
        } catch {
          removeWidget = undefined;
          update("error");
        }
      };

      observer = new ResizeObserver(render);
      observer.observe(container);
      render();
    }).catch(() => update("load-error"));

    return () => {
      cancelled = true;
      observer?.disconnect();
      removeWidget?.();
    };
  }, [attempt]);

  const failed = status === "load-error" || status === "error" || status === "timeout";
  const StatusIcon = status === "verified" ? CheckIcon : ShieldIcon;

  return (
    <div className="min-w-0">
      <div className="flex min-h-11 items-center gap-2.5 rounded-xl bg-white/[0.045] px-3">
        <StatusIcon className={`size-4 shrink-0 ${failed ? "text-red-300" : "text-lav-300"}`} />
        <p ref={statusRef} tabIndex={-1} role="status" className="flex-1 py-2 text-sm text-moon-200">
          {STATUS_TEXT[status]}
        </p>
        {failed && (
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-md px-1 text-sm text-lav-200 underline underline-offset-4 hover:text-moon-100"
            onClick={() => {
              statusRef.current?.focus();
              setStatus("checking");
              setAttempt((value) => value + 1);
            }}
          >
            重试
          </button>
        )}
      </div>
      <div ref={containerRef} className={status === "interactive" ? "mt-2" : undefined} />
    </div>
  );
}
