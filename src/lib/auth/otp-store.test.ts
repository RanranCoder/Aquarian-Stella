import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { storeOtp, claimOtpAttempt, consumeOtp, deleteOtp } from "./otp-store";
import { hashCode } from "./otp";
import { OTP_MAX_ATTEMPTS } from "./types";
import { MemoryD1 } from "./d1-mock";

describe("otp-store", () => {
  it("storeOtp overwrites an existing code", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    const h1 = await hashCode("111111");
    const h2 = await hashCode("222222");
    await storeOtp(db, "a@b.com", h1, Date.now() + 60_000);
    await storeOtp(db, "a@b.com", h2, Date.now() + 60_000);
    expect(await consumeOtp(db, "a@b.com", h1)).toBe(false);
    expect(await consumeOtp(db, "a@b.com", h2)).toBe(true);
  });

  it("storeOtp resets attempts on overwrite", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await storeOtp(db, "a@b.com", await hashCode("111111"), Date.now() + 60_000);
    expect(await claimOtpAttempt(db, "a@b.com", OTP_MAX_ATTEMPTS, Date.now())).toBe("ok");
    await storeOtp(db, "a@b.com", await hashCode("222222"), Date.now() + 60_000);
    expect(await claimOtpAttempt(db, "a@b.com", OTP_MAX_ATTEMPTS, Date.now())).toBe("ok");
  });

  it("claimOtpAttempt returns none when there is no code", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    expect(await claimOtpAttempt(db, "nobody@x.com", OTP_MAX_ATTEMPTS, Date.now())).toBe("none");
  });

  it("claimOtpAttempt returns expired and removes the stale code", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await storeOtp(db, "a@b.com", await hashCode("111111"), Date.now() - 1000);
    expect(await claimOtpAttempt(db, "a@b.com", OTP_MAX_ATTEMPTS, Date.now())).toBe("expired");
    expect(await claimOtpAttempt(db, "a@b.com", OTP_MAX_ATTEMPTS, Date.now())).toBe("none");
  });

  it("claimOtpAttempt returns ok and increments attempts", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await storeOtp(db, "a@b.com", await hashCode("111111"), Date.now() + 60_000);
    expect(await claimOtpAttempt(db, "a@b.com", OTP_MAX_ATTEMPTS, Date.now())).toBe("ok");
    expect(await claimOtpAttempt(db, "a@b.com", OTP_MAX_ATTEMPTS, Date.now())).toBe("ok");
  });

  it("claimOtpAttempt returns limited once attempts reach the cap", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await storeOtp(db, "a@b.com", await hashCode("111111"), Date.now() + 60_000);
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      expect(await claimOtpAttempt(db, "a@b.com", OTP_MAX_ATTEMPTS, Date.now())).toBe("ok");
    }
    expect(await claimOtpAttempt(db, "a@b.com", OTP_MAX_ATTEMPTS, Date.now())).toBe("limited");
  });

  it("consumeOtp succeeds only once (no replay)", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    const h = await hashCode("111111");
    await storeOtp(db, "a@b.com", h, Date.now() + 60_000);
    expect(await consumeOtp(db, "a@b.com", h)).toBe(true);
    expect(await consumeOtp(db, "a@b.com", h)).toBe(false);
  });

  it("consumeOtp fails when the hash does not match", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await storeOtp(db, "a@b.com", await hashCode("111111"), Date.now() + 60_000);
    expect(await consumeOtp(db, "a@b.com", await hashCode("999999"))).toBe(false);
  });

  it("deleteOtp removes the code", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await storeOtp(db, "a@b.com", await hashCode("111111"), Date.now() + 60_000);
    await deleteOtp(db, "a@b.com");
    expect(await claimOtpAttempt(db, "a@b.com", OTP_MAX_ATTEMPTS, Date.now())).toBe("none");
  });
});
