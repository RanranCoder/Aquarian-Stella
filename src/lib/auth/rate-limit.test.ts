import { describe, expect, it } from "vitest";
import { checkRateLimit, incrementRate, type SimpleKV } from "./rate-limit";
import { RATE_EMAIL_PER_HOUR, RATE_IP_PER_HOUR } from "./types";

class MemoryKV implements SimpleKV {
  private map = new Map<string, { value: string; exp: number }>();
  async get(key: string): Promise<string | null> {
    const e = this.map.get(key);
    if (!e) return null;
    if (Date.now() > e.exp) { this.map.delete(key); return null; }
    return e.value;
  }
  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    this.map.set(key, { value, exp: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : Infinity });
  }
}

async function prime(kv: MemoryKV, times: number, key: string) {
  for (let i = 0; i < times; i++) {
    const n = Number((await kv.get(key)) ?? "0") + 1;
    await kv.put(key, String(n), { expirationTtl: 3600 });
  }
}

describe("rate-limit", () => {
  it("allows requests under the limit", async () => {
    const kv = new MemoryKV();
    expect(await checkRateLimit(kv, "a@b.com", "1.2.3.4")).toEqual({ allowed: true });
    await incrementRate(kv, "a@b.com", "1.2.3.4");
    expect(await checkRateLimit(kv, "a@b.com", "1.2.3.4")).toEqual({ allowed: true });
  });

  it("blocks when the email limit is hit", async () => {
    const kv = new MemoryKV();
    await prime(kv, RATE_EMAIL_PER_HOUR, `otp:rate:a@b.com`);
    const r = await checkRateLimit(kv, "a@b.com", "9.9.9.9");
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBeDefined();
  });

  it("blocks when the IP limit is hit even if email is fresh", async () => {
    const kv = new MemoryKV();
    await prime(kv, RATE_IP_PER_HOUR, "otp:rate:1.2.3.4");
    const r = await checkRateLimit(kv, "a@b.com", "1.2.3.4");
    expect(r.allowed).toBe(false);
  });
});
