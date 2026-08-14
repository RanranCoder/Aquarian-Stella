import { describe, expect, it } from "vitest";
import { isValidEmail, generateOtp, hashCode, verifyOtp } from "./otp";

describe("otp", () => {
  it("isValidEmail accepts normal emails and rejects garbage", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("hello.world+tag@example.co.uk")).toBe(true);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("generateOtp returns 6 digits", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  it("hashCode is deterministic", async () => {
    expect(await hashCode("123456")).toBe(await hashCode("123456"));
    expect(await hashCode("123456")).not.toBe(await hashCode("123457"));
  });

  it("verifyOtp matches only the right code", async () => {
    const h = await hashCode("482913");
    expect(await verifyOtp("482913", h)).toBe(true);
    expect(await verifyOtp("482914", h)).toBe(false);
  });
});
