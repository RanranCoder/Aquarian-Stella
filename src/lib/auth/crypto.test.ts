import { describe, expect, it } from "vitest";
import { encode, toBase64Url, fromBase64Url, hmacSha256, sha256Hex, timingSafeEqual } from "./crypto";

describe("crypto", () => {
  it("base64url roundtrip", () => {
    const bytes = encode("{\"a\":1}");
    const b64 = toBase64Url(bytes);
    expect(b64).not.toMatch(/[+/=]/);
    expect(new TextDecoder().decode(fromBase64Url(b64))).toBe("{\"a\":1}");
  });

  it("sha256Hex is deterministic and hex", async () => {
    const h1 = await sha256Hex("123456");
    const h2 = await sha256Hex("123456");
    const h3 = await sha256Hex("654321");
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hmacSha256 differs by secret and is base64url", async () => {
    const a = await hmacSha256("body", "secret-a");
    const b = await hmacSha256("body", "secret-b");
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/[+/=]/);
  });

  it("timingSafeEqual compares correctly", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});
