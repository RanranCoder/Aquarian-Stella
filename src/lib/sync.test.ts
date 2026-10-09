import { describe, expect, it } from "vitest";
import { mergeWishes, mergeProfile, type ServerDeletedId } from "./sync";
import type { Wish } from "./store";
import type { BirthProfile } from "./astrology";

function wish(id: string, updatedAt: number, extra: Partial<Wish> = {}): Wish {
  return {
    id,
    title: `wish-${id}`,
    category: "life",
    status: "active",
    createdAt: "2026-08-19",
    updatedAt,
    ...extra,
  };
}

describe("mergeWishes", () => {
  it("keeps additions from both sides (no overwrite)", () => {
    const local = [wish("a", 100)];
    const server = [wish("b", 200)];
    const { merged, toRePush } = mergeWishes(local, server, []);
    expect(merged.map((w) => w.id).sort()).toEqual(["a", "b"]);
    // 本地独占的 a 需要回推
    expect(toRePush.map((w) => w.id)).toContain("a");
  });

  it("same id: newer updated_at wins", () => {
    const local = [wish("a", 500)];
    const server = [wish("a", 300)];
    const { merged } = mergeWishes(local, server, []);
    expect(merged.find((w) => w.id === "a")!.updatedAt).toBe(500);
  });

  it("remote delete with local older -> removed locally", () => {
    const local = [wish("a", 100)];
    const server: Wish[] = [];
    const deleted: ServerDeletedId[] = [{ id: "a", deletedAt: 200 }];
    const { merged, toRemoveLocally } = mergeWishes(local, server, deleted);
    expect(merged.find((w) => w.id === "a")).toBeUndefined();
    expect(toRemoveLocally.has("a")).toBe(true);
  });

  it("remote delete but local newer -> kept and re-pushed (resurrect)", () => {
    const local = [wish("a", 500)];
    const server: Wish[] = [];
    const deleted: ServerDeletedId[] = [{ id: "a", deletedAt: 200 }];
    const { merged, toRePush } = mergeWishes(local, server, deleted);
    expect(merged.find((w) => w.id === "a")).toBeDefined();
    expect(toRePush.map((w) => w.id)).toContain("a");
  });

  it("local deleted (pendingDeletes) removed when server confirms", () => {
    // 本地已删（不在 local 里），服务端也在 deletedIds 中 → 无残留
    const local: Wish[] = [];
    const server: Wish[] = [];
    const deleted: ServerDeletedId[] = [{ id: "x", deletedAt: 100 }];
    const { merged, toRemoveLocally } = mergeWishes(local, server, deleted);
    expect(merged).toHaveLength(0);
    expect(toRemoveLocally.has("x")).toBe(false);
  });
});

const profileA: BirthProfile = {
  nickname: "小星",
  birthDate: "2000-01-01",
  birthTimeAccuracy: "exact",
  interests: ["love"],
};

describe("mergeProfile", () => {
  it("no server profile -> keep and re-push local", () => {
    const r = mergeProfile(profileA, 100, null, 0);
    expect(r.useServer).toBe(false);
    expect(r.toRePush).toBe(true);
  });

  it("no local -> take server", () => {
    const r = mergeProfile(null, undefined, { ...profileA, onboarded: true }, 200);
    expect(r.useServer).toBe(true);
    expect(r.profile!.nickname).toBe("小星");
  });

  it("local newer -> keep local and re-push", () => {
    const r = mergeProfile(profileA, 500, { ...profileA, nickname: "旧" }, 300);
    expect(r.useServer).toBe(false);
    expect(r.toRePush).toBe(true);
    expect(r.profile!.nickname).toBe("小星");
  });

  it("server newer -> take server", () => {
    const r = mergeProfile(profileA, 100, { ...profileA, nickname: "新", onboarded: true }, 300);
    expect(r.useServer).toBe(true);
    expect(r.profile!.nickname).toBe("新");
  });
});
