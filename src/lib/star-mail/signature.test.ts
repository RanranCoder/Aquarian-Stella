import { describe, expect, it } from "vitest";
import { ANONYMOUS_SIGNATURE, resolveSignature } from "./signature";

describe("resolveSignature", () => {
  it("uses nickname for type=name", () => {
    expect(resolveSignature({ signatureType: "name", customSignature: "" }, "小明")).toBe("小明");
  });
  it("falls back to anonymous phrase when nickname missing", () => {
    expect(resolveSignature({ signatureType: "name", customSignature: "" }, undefined)).toBe(ANONYMOUS_SIGNATURE);
    expect(resolveSignature({ signatureType: "name", customSignature: "" }, "   ")).toBe(ANONYMOUS_SIGNATURE);
  });
  it("uses anonymous phrase for type=anonymous", () => {
    expect(resolveSignature({ signatureType: "anonymous", customSignature: "" })).toBe(ANONYMOUS_SIGNATURE);
  });
  it("uses custom text for type=custom, trimmed", () => {
    expect(resolveSignature({ signatureType: "custom", customSignature: "  —— R  " })).toBe("—— R");
  });
  it("caps signature at SIGNATURE_MAX", () => {
    expect(resolveSignature({ signatureType: "custom", customSignature: "x".repeat(99) }).length).toBeLessThanOrEqual(30);
  });
});
