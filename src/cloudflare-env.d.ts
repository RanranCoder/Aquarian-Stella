import type { D1Database, KVNamespace } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    OTP_KV: KVNamespace;
    RESEND_API_KEY: string;
    AUTH_SECRET: string;
    AUTH_FROM_EMAIL: string;
    AUTH_DEV_LOG_CODE?: string;
    TURNSTILE_SECRET_KEY: string;
  }
}

export {};
