import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { claimRate } from "./rate-limit";
import { RATE_EMAIL_PER_HOUR, RATE_IP_PER_HOUR } from "./types";
import { MemoryD1 } from "./d1-mock";

describe("rate-limit", () => {
  it("allows requests under the limit", async () => {
    const db = new MemoryD1();
    const d = db as unknown as D1Database;
    expect(await claimRate(d, "a@b.com", "1.2.3.4")).toEqual({ allowed: true });
    expect(await claimRate(d, "a@b.com", "1.2.3.4")).toEqual({ allowed: true });
  });

  it("blocks when the email limit is hit", async () => {
    const db = new MemoryD1();
    const d = db as unknown as D1Database;
    for (let i = 0; i < RATE_EMAIL_PER_HOUR; i++) {
      expect((await claimRate(d, "a@b.com", "1.2.3.4")).allowed).toBe(true);
    }
    const r = await claimRate(d, "a@b.com", "1.2.3.4");
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBeDefined();
  });

  it("blocks when the IP limit is hit even if email is fresh", async () => {
    const db = new MemoryD1();
    db.seed("rate_limits", "otp:rate:1.2.3.4", { count: RATE_IP_PER_HOUR, window_end: Date.now() + 60_000 });
    const r = await claimRate(db as unknown as D1Database, "a@b.com", "1.2.3.4");
    expect(r.allowed).toBe(false);
  });

  it("resets the counter once the window expires", async () => {
    const db = new MemoryD1();
    db.seed("rate_limits", "otp:rate:a@b.com", { count: RATE_EMAIL_PER_HOUR, window_end: Date.now() - 1000 });
    const r = await claimRate(db as unknown as D1Database, "a@b.com", "9.9.9.9");
    expect(r.allowed).toBe(true);
  });
});
