import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { upsertUserByEmail, getUserByEmail } from "./db";

type Row = { id: number; email: string; created_at: string };

/** 记录 SQL 与参数并返回可编程结果的假 D1（只实现本模块用到的 API）。 */
class FakeD1 {
  calls: Array<{ sql: string; params: unknown[] }> = [];
  results: Row[] = [];
  prepare(sql: string) {
    const self = this;
    self.calls.push({ sql, params: [] });
    return {
      bind(...params: unknown[]) {
        self.calls[self.calls.length - 1].params = params;
        return this;
      },
      async run() {
        return { success: true };
      },
      async first<T>() {
        const r = self.results.shift();
        return (r ?? null) as T | null;
      },
    };
  }
}

describe("db", () => {
  it("upserts a user (create table, insert-or-ignore, select)", async () => {
    const db = new FakeD1();
    db.results.push({ id: 1, email: "a@b.com", created_at: "2026-08-14" });
    const user = await upsertUserByEmail(db as unknown as D1Database, "a@b.com");
    expect(user).toEqual({ id: 1, email: "a@b.com", created_at: "2026-08-14" });
    const sqls = db.calls.map((c) => c.sql);
    expect(sqls[0]).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(sqls[1]).toContain("INSERT INTO users");
    expect(sqls[1]).toContain("ON CONFLICT(email)");
    expect(sqls[2]).toContain("SELECT id, email, created_at");
    expect(db.calls[1].params).toEqual(["a@b.com"]);
    expect(db.calls[2].params).toEqual(["a@b.com"]);
  });

  it("getUserByEmail returns null when absent", async () => {
    const db = new FakeD1();
    expect(await getUserByEmail(db as unknown as D1Database, "nobody@x.com")).toBeNull();
  });
});
