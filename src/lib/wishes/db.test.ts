import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { MemoryD1 } from "../auth/d1-mock";
import {
  getWishesByUser,
  getDeletedIdsByUser,
  syncWishes,
  type SyncWish,
} from "./db";

function makeDb() {
  return new MemoryD1() as unknown as D1Database;
}

function w(partial: Partial<SyncWish>): SyncWish {
  return {
    id: "w1",
    title: "看星星",
    category: "life",
    status: "active",
    createdAt: "2026-08-19",
    updatedAt: 1000,
    ...partial,
  };
}

describe("wishes/db", () => {
  it("returns empty array for user with no wishes", async () => {
    const db = makeDb();
    expect(await getWishesByUser(db, 1)).toEqual([]);
  });

  it("syncWishes stores and retrieves wishes (with updated_at)", async () => {
    const db = makeDb();
    await syncWishes(db, 1, {
      upserts: [
        w({ id: "w1", updatedAt: 100 }),
        w({ id: "w2", title: "学吉他", category: "growth", status: "done", createdAt: "2026-08-18", completedAt: "2026-08-19", updatedAt: 200 }),
      ],
      deletes: [],
    }, 300);
    const result = await getWishesByUser(db, 1);
    expect(result).toHaveLength(2);
    const w2 = result.find((r) => r.id === "w2")!;
    expect(w2.completed_at).toBe("2026-08-19");
    expect(w2.updated_at).toBe(200);
  });

  it("stale upsert (lower updated_at) is ignored", async () => {
    const db = makeDb();
    await syncWishes(db, 1, { upserts: [w({ id: "w1", title: "new", updatedAt: 500 })], deletes: [] }, 1000);
    await syncWishes(db, 1, { upserts: [w({ id: "w1", title: "stale", updatedAt: 100 })], deletes: [] }, 1000);
    const result = await getWishesByUser(db, 1);
    expect(result[0].title).toBe("new");
  });

  it("upsert to another user's id is ignored (no overwrite)", async () => {
    const db = makeDb();
    await syncWishes(db, 1, { upserts: [w({ id: "w1", title: "A", updatedAt: 100 })], deletes: [] }, 1000);
    // 用户 2 尝试写同 id，应 0 行不覆盖
    await syncWishes(db, 2, { upserts: [w({ id: "w1", title: "B", updatedAt: 999 })], deletes: [] }, 1000);
    const r1 = await getWishesByUser(db, 1);
    expect(r1[0].title).toBe("A");
    expect(await getWishesByUser(db, 2)).toHaveLength(0);
  });

  it("tombstone hides wish and records deletedAt", async () => {
    const db = makeDb();
    await syncWishes(db, 1, { upserts: [w({ id: "w1", updatedAt: 100 })], deletes: [] }, 1000);
    await syncWishes(db, 1, { upserts: [], deletes: ["w1"] }, 2000);
    expect(await getWishesByUser(db, 1)).toHaveLength(0);
    const del = await getDeletedIdsByUser(db, 1);
    expect(del).toEqual([{ id: "w1", deletedAt: 2000 }]);
  });

  it("re-winning upsert resurrects a tombstoned wish", async () => {
    const db = makeDb();
    await syncWishes(db, 1, { upserts: [w({ id: "w1", updatedAt: 100 })], deletes: [] }, 1000);
    await syncWishes(db, 1, { upserts: [], deletes: ["w1"] }, 2000);
    expect(await getWishesByUser(db, 1)).toHaveLength(0);
    // 本地较新的复活：updated_at 3000 > deletedAt 2000
    await syncWishes(db, 1, { upserts: [w({ id: "w1", title: "复活", updatedAt: 3000 })], deletes: [] }, 3001);
    const result = await getWishesByUser(db, 1);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("复活");
  });

  it("stale upsert does not resurrect tombstone", async () => {
    const db = makeDb();
    await syncWishes(db, 1, { upserts: [w({ id: "w1", updatedAt: 100 })], deletes: [] }, 1000);
    await syncWishes(db, 1, { upserts: [], deletes: ["w1"] }, 2000);
    // 陈旧版本（100 < deletedAt 2000）不复活
    await syncWishes(db, 1, { upserts: [w({ id: "w1", updatedAt: 100 })], deletes: [] }, 3000);
    expect(await getWishesByUser(db, 1)).toHaveLength(0);
  });

  it("different users have separate wishes", async () => {
    const db = makeDb();
    await syncWishes(db, 1, { upserts: [w({ id: "w1", title: "User1", updatedAt: 1 })], deletes: [] }, 1000);
    await syncWishes(db, 2, { upserts: [w({ id: "w2", title: "User2", updatedAt: 1 })], deletes: [] }, 1000);
    expect(await getWishesByUser(db, 1)).toHaveLength(1);
    expect(await getWishesByUser(db, 2)).toHaveLength(1);
    expect((await getWishesByUser(db, 1))[0].title).toBe("User1");
  });
});
