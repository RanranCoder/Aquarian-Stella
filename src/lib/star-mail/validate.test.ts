import { describe, expect, it } from "vitest";
import { validateStarMail, isValidEmailShape, BODY_MAX, SIGNATURE_MAX, TITLE_MAX, TA_NAME_MAX } from "./validate";

describe("isValidEmailShape", () => {
  it("accepts normal emails", () => {
    expect(isValidEmailShape("a@b.com")).toBe(true);
    expect(isValidEmailShape("hello.world@sub.example.org")).toBe(true);
  });
  it("rejects malformed emails", () => {
    expect(isValidEmailShape("")).toBe(false);
    expect(isValidEmailShape("nope")).toBe(false);
    expect(isValidEmailShape("a@b")).toBe(false);
    expect(isValidEmailShape("a b@c.com")).toBe(false);
  });
});

describe("validateStarMail", () => {
  const base = { recipient: "ta@gmail.com", title: "有些话想告诉你", body: "你好。", signature: "R", taName: "小星" };
  it("passes valid input and returns normalized fields", () => {
    const r = validateStarMail({ ...base, recipient: "  Ta@Gmail.com  ", title: "  标题  ", taName: "  小星  " });
    expect(r).toEqual({ ok: true, recipient: "ta@gmail.com", title: "标题", body: "你好。", signature: "R", taName: "小星" });
  });
  it("rejects invalid recipient", () => {
    expect(validateStarMail({ ...base, recipient: "bad" })).toMatchObject({ ok: false, field: "recipient" });
  });
  it("rejects empty body", () => {
    expect(validateStarMail({ ...base, body: "   " })).toMatchObject({ ok: false, field: "body", reason: "BODY_EMPTY" });
  });
  it("rejects body over the max", () => {
    expect(validateStarMail({ ...base, body: "x".repeat(BODY_MAX + 1) })).toMatchObject({ ok: false, field: "body", reason: "BODY_TOO_LONG" });
  });
  it("rejects title over the max", () => {
    expect(validateStarMail({ ...base, title: "x".repeat(TITLE_MAX + 1) })).toMatchObject({ ok: false, field: "title" });
  });
  it("rejects signature over the max", () => {
    expect(validateStarMail({ ...base, signature: "x".repeat(SIGNATURE_MAX + 1) })).toMatchObject({ ok: false, field: "signature" });
  });
  it("rejects empty taName", () => {
    expect(validateStarMail({ ...base, taName: "   " })).toMatchObject({ ok: false, field: "taName", reason: "TA_NAME_EMPTY" });
  });
  it("rejects taName over the max", () => {
    expect(validateStarMail({ ...base, taName: "x".repeat(TA_NAME_MAX + 1) })).toMatchObject({ ok: false, field: "taName", reason: "TA_NAME_TOO_LONG" });
  });
});
