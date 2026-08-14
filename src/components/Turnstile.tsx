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
    let widgetId: string | undefined;

    const render = () => {
      if (!containerRef.current || widgetId || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[src*="/turnstile/v0/api.js"]');
    const boot = () => {
      if (window.turnstile) render();
    };
    if (existing) {
      existing.addEventListener("load", boot);
      boot();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.addEventListener("load", boot);
      document.head.appendChild(script);
    }

    return () => {
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}
