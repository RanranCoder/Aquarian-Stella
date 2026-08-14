"use client";

import { useEffect, useRef } from "react";

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

export function Turnstile({
  onToken,
  className,
}: {
  onToken: (token: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | undefined;

    const render = () => {
      if (!containerRef.current || widgetId || !window.turnstile || cancelled) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    };

    const boot = () => {
      if (window.turnstile) render();
    };

    let script: HTMLScriptElement | null = null;
    const existing = document.querySelector<HTMLScriptElement>('script[src*="/turnstile/v0/api.js"]');
    if (existing) {
      existing.addEventListener("load", boot);
      boot();
    } else {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.addEventListener("load", boot);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      const el = script ?? existing;
      if (el) el.removeEventListener("load", boot);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}
