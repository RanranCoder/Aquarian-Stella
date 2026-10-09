import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { MemoryD1 } from "../auth/d1-mock";
import { getProfile, upsertProfile } from "./db";
import type { BirthProfile } from "../astrology";

function makeDb() {
  return new MemoryD1() as unknown as D1Database;
}

const PROFILE: BirthProfile = {
  nickname: "小星",
  birthDate: "2000-01-01",
  birthTime: "08:30",
  birthTimeAccuracy: "exact",
  birthCity: "广州",
  interests: ["爱情", "事业"],
};

describe("profiles/db", () => {
  it("returns null when no profile", async () => {
    expect(await getProfile(makeDb(), 1)).toBeNull();
  });

  it("upserts and reads profile", async () => {
    const db = makeDb();
    await upsertProfile(db, 1, PROFILE, 1000);
    const p = await getProfile(db, 1);
    expect(p).not.toBeNull();
    expect(p!.nickname).toBe("小星");
    expect(p!.birthDate).toBe("2000-01-01");
    expect(p!.birthTime).toBe("08:30");
    expect(p!.updatedAt).toBe(1000);
    expect(p!.interests).toEqual(["爱情", "事业"]);
  });

  it("upsert updates existing row (same user, later updated_at)", async () => {
    const db = makeDb();
    await upsertProfile(db, 1, PROFILE, 1000);
    await upsertProfile(db, 1, { ...PROFILE, nickname: "新昵称" }, 2000);
    const p = await getProfile(db, 1);
    expect(p!.nickname).toBe("新昵称");
    expect(p!.updatedAt).toBe(2000);
  });

  it("users are isolated by user_id", async () => {
    const db = makeDb();
    await upsertProfile(db, 1, PROFILE, 1000);
    expect(await getProfile(db, 2)).toBeNull();
  });
});
