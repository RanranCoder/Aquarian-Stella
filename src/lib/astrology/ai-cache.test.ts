import { describe, it, expect, beforeEach } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { D1Mock } from "@/lib/auth/d1-mock-cache";
import { getCachedContent, setCachedContent, invalidateAiCache } from "./ai-cache";

function makeDb(): D1Database {
  return new D1Mock() as unknown as D1Database;
}

describe("ai-cache", () => {
  let db: D1Database;
  beforeEach(() => {
    db = makeDb();
  });

  it("写入后可读取", async () => {
    const payload = { core: "测试星语", keywords: ["关键词"] };
    const now = Date.now();
    await setCachedContent(db, "u1:today:2026-09-06", "today", 1, payload, now + 86400000);
    const result = await getCachedContent(db, "u1:today:2026-09-06");
    expect(result).toEqual(payload);
  });

  it("未写入时返回 null", async () => {
    const result = await getCachedContent(db, "u1:today:2026-09-06");
    expect(result).toBeNull();
  });

  it("过期后返回 null", async () => {
    const payload = { core: "测试" };
    const pastTime = Date.now() - 1000;
    await setCachedContent(db, "u1:today:2026-09-06", "today", 1, payload, pastTime);
    const result = await getCachedContent(db, "u1:today:2026-09-06");
    expect(result).toBeNull();
  });

  it("invalidateAiCache 删除指定用户的所有缓存", async () => {
    await setCachedContent(db, "u1:today:2026-09-06", "today", 1, { a: 1 }, Date.now() + 86400000);
    await setCachedContent(db, "u1:personality:abc", "personality", 1, { b: 2 }, Date.now() + 86400000);
    await setCachedContent(db, "u2:today:2026-09-06", "today", 2, { c: 3 }, Date.now() + 86400000);
    await invalidateAiCache(db, 1);
    expect(await getCachedContent(db, "u1:today:2026-09-06")).toBeNull();
    expect(await getCachedContent(db, "u1:personality:abc")).toBeNull();
    expect(await getCachedContent(db, "u2:today:2026-09-06")).toEqual({ c: 3 });
  });
});
