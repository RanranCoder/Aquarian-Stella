import { describe, expect, it } from "vitest";
import { checkModeration } from "./moderation";

const base = { title: "标题", body: "正文内容", signature: "R", taName: "小星" };

describe("checkModeration", () => {
  it("allows clean content", () => {
    expect(checkModeration(base)).toEqual({ allowed: true });
  });
  it("rejects more than 2 URLs", () => {
    const body = "见 https://a.com/1 和 https://b.com/2 还有 www.c.com/3";
    expect(checkModeration({ ...base, body })).toEqual({ allowed: false, reason: "SPAM_URL" });
  });
  it("allows a single URL (e.g. personal site)", () => {
    expect(checkModeration({ ...base, body: "这是我的主页 https://me.example.com" })).toEqual({ allowed: true });
  });
  it("rejects spam keywords in any field", () => {
    expect(checkModeration({ ...base, signature: "加微信看更多" })).toEqual({ allowed: false, reason: "SPAM_KEYWORD" });
  });
  it("rejects spam keywords in taName", () => {
    expect(checkModeration({ ...base, taName: "加微信" })).toEqual({ allowed: false, reason: "SPAM_KEYWORD" });
  });
  it("rejects a body line repeated 5+ times", () => {
    const body = Array.from({ length: 5 }, () => "关注我").join("\n");
    expect(checkModeration({ ...base, body })).toEqual({ allowed: false, reason: "SPAM_REPEAT" });
  });
  it("allows 4 repeats (below threshold)", () => {
    const body = Array.from({ length: 4 }, () => "想你").join("\n");
    expect(checkModeration({ ...base, body })).toEqual({ allowed: true });
  });
});
