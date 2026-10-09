import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import {
  upsertUserByEmail,
  getUserByEmail,
  createUserWithPassword,
  getUserPasswordHash,
  updateUserPassword,
  deleteUser,
} from "./db";
import { MemoryD1 } from "./d1-mock";

type Row = { id: number; email: string; created_at: string };

/** 记录 SQL 与参数并返回可编程结果的假 D1（只实现本模块用到的 API）。 */
class FakeD1 {
  calls: Array<{ sql: string; params: unknown[] }> = [];
  results: Row[] = [];
  prepare(sql: string) {
    this.calls.push({ sql, params: [] });
    const call = this.calls[this.calls.length - 1];
    const stmt = {
      bind: (...params: unknown[]) => {
        call.params = params;
        return stmt;
      },
      async run() {
        return { success: true };
      },
      first: async <T>() => {
        const r = this.results.shift();
        return (r ?? null) as T | null;
      },
    };
    return stmt;
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

describe("db (password auth)", () => {
  it("createUserWithPassword creates a user with hash", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    const user = await createUserWithPassword(db, "new@b.com", "hash123");
    expect(user.email).toBe("new@b.com");
    expect(typeof user.id).toBe("number");
    expect(user.created_at).toBeTruthy();
  });

  it("createUserWithPassword throws on duplicate email", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await createUserWithPassword(db, "dup@b.com", "hash1");
    await expect(createUserWithPassword(db, "dup@b.com", "hash2")).rejects.toThrow();
  });

  it("getUserPasswordHash returns hash for existing user", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await createUserWithPassword(db, "pw@b.com", "storedhash");
    expect(await getUserPasswordHash(db, "pw@b.com")).toBe("storedhash");
  });

  it("getUserPasswordHash returns null for user without password", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await upsertUserByEmail(db, "otp@b.com");
    expect(await getUserPasswordHash(db, "otp@b.com")).toBeNull();
  });

  it("getUserPasswordHash returns null for nonexistent user", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    expect(await getUserPasswordHash(db, "nope@b.com")).toBeNull();
  });

  it("updateUserPassword changes the hash", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await createUserWithPassword(db, "upd@b.com", "old");
    await updateUserPassword(db, "upd@b.com", "new");
    expect(await getUserPasswordHash(db, "upd@b.com")).toBe("new");
  });

  it("deleteUser removes the user", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    await createUserWithPassword(db, "del@b.com", "hash");
    expect(await deleteUser(db, "del@b.com")).toBe(true);
    expect(await getUserByEmail(db, "del@b.com")).toBeNull();
  });

  it("deleteUser returns false for nonexistent user", async () => {
    const db = new MemoryD1() as unknown as D1Database;
    expect(await deleteUser(db, "ghost@b.com")).toBe(false);
  });
});
