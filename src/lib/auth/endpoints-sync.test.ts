import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryD1 } from "./d1-mock";
import { hashPassword } from "./crypto";
import type { D1Database } from "@cloudflare/workers-types";
import { NextRequest } from "next/server";
import { signSession } from "./session";

/* ------------------------------------------------------------------ */
/*  Mock @opennextjs/cloudflare                                       */
/* ------------------------------------------------------------------ */

let mockDb: D1Database;
const AUTH_SECRET = "test-secret-for-endpoints";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: {
      DB: mockDb,
      AUTH_SECRET,
    },
  }),
}));

async function loadProfile() {
  return import("@/app/api/profile/route");
}

async function loadClear() {
  return import("@/app/api/account/data/clear/route");
}

/* ------------------------------------------------------------------ */
/*  Setup                                                             */
/* ------------------------------------------------------------------ */

const TEST_EMAIL = "user@test.com";

async function makeAuthedDb(): Promise<D1Database> {
  const db = new MemoryD1() as unknown as D1Database;
  // 建一个可登录的用户（带密码）拿 uid
  const hash = await hashPassword("pw");
  await db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .bind(TEST_EMAIL, hash)
    .run();
  return db;
}

async function sessionForToken(db: D1Database, email: string) {
  const user = await (await import("./db")).getUserByEmail(db as D1Database, email);
  if (!user) throw new Error("no user");
  return signSession({ uid: user.id, email, exp: Date.now() + 3_600_000 }, AUTH_SECRET);
}

function req(url: string, method: string, body?: unknown, cookie?: string): NextRequest {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie) headers.set("Cookie", `stella_session=${cookie}`);
  return new NextRequest(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const GOOD_PROFILE = {
  nickname: "小星",
  birthDate: "2000-01-01",
  birthTime: "08:30",
  birthTimeAccuracy: "exact",
  birthCity: "广州",
  interests: ["爱情", "事业"],
};

/* ================================================================== */
/*  /api/profile                                                      */
/* ================================================================== */

describe("/api/profile", () => {
  beforeEach(() => {
    mockDb = undefined!;
  });

  it("GET returns 401 without login", async () => {
    mockDb = new MemoryD1() as unknown as D1Database;
    const { GET } = await loadProfile();
    const res = await GET(req("http://localhost/api/profile", "GET"));
    expect((await (res as Response).json()).error).toBe("NOT_LOGGED_IN");
  });

  it("PUT then GET round-trips profile for authenticated user", async () => {
    mockDb = await makeAuthedDb();
    const { PUT, GET } = await loadProfile();
    const token = await sessionForToken(mockDb, TEST_EMAIL);
    const putRes = await PUT(req("http://localhost/api/profile", "PUT", { profile: GOOD_PROFILE }, token));
    expect((await (putRes as Response).json()).ok).toBe(true);
    const getRes = await GET(req("http://localhost/api/profile", "GET", undefined, token));
    const body = await (getRes as Response).json();
    expect(body.profile.nickname).toBe("小星");
    expect(body.profile.updatedAt).toBeTruthy();
  });

  it("rejects invalid birthDate", async () => {
    mockDb = await makeAuthedDb();
    const { PUT } = await loadProfile();
    const token = await sessionForToken(mockDb, TEST_EMAIL);
    const res = await PUT(req("http://localhost/api/profile", "PUT", { profile: { ...GOOD_PROFILE, birthDate: "not-a-date" } }, token));
    expect((await (res as Response).json()).error).toBe("INVALID_BIRTH_DATE");
  });

  it("rejects nickname too long", async () => {
    mockDb = await makeAuthedDb();
    const { PUT } = await loadProfile();
    const token = await sessionForToken(mockDb, TEST_EMAIL);
    const res = await PUT(req("http://localhost/api/profile", "PUT", { profile: { ...GOOD_PROFILE, nickname: "x".repeat(20) } }, token));
    expect((await (res as Response).json()).error).toBe("INVALID_NICKNAME");
  });

  it("rejects unknown accuracy with birthTime (unknown must have no time)", async () => {
    mockDb = await makeAuthedDb();
    const { PUT } = await loadProfile();
    const token = await sessionForToken(mockDb, TEST_EMAIL);
    const res = await PUT(req("http://localhost/api/profile", "PUT", { profile: { ...GOOD_PROFILE, birthTimeAccuracy: "unknown", birthTime: "08:00" } }, token));
    expect((await (res as Response).json()).error).toBe("INVALID_TIME_ACCURACY");
  });

  it("rejects invalid interest (not in whitelist)", async () => {
    mockDb = await makeAuthedDb();
    const { PUT } = await loadProfile();
    const token = await sessionForToken(mockDb, TEST_EMAIL);
    const res = await PUT(req("http://localhost/api/profile", "PUT", { profile: { ...GOOD_PROFILE, interests: ["离谱"] } }, token));
    expect((await (res as Response).json()).error).toBe("INVALID_INTERESTS");
  });
});

/* ================================================================== */
/*  /api/account/data/clear                                          */
/* ================================================================== */

describe("/api/account/data/clear", () => {
  beforeEach(() => {
    mockDb = undefined!;
  });

  it("clears wishes and profile but keeps user", async () => {
    mockDb = await makeAuthedDb();
    const db = mockDb as D1Database;
    const user = await (await import("./db")).getUserByEmail(db, TEST_EMAIL);
    const uid = user!.id;

    const { PUT: putProfile } = await loadProfile();
    const token = await sessionForToken(db, TEST_EMAIL);
    await putProfile(req("http://localhost/api/profile", "PUT", { profile: GOOD_PROFILE }, token));

    const wishesDb = await import("../wishes/db");
    await wishesDb.syncWishes(db, uid, {
      upserts: [{ id: "w1", title: "看星星", category: "life", status: "active", createdAt: "2026-01-01", updatedAt: 100 }],
      deletes: [],
    }, 200);

    const { POST } = await loadClear();
    const res = await POST(req("http://localhost/api/account/data/clear", "POST", undefined, token));
    expect((await (res as Response).json()).ok).toBe(true);

    // 云端数据已清，账号保留
    expect(await wishesDb.getWishesByUser(db, uid)).toHaveLength(0);
    const profileDb = await import("../profile/db");
    expect(await profileDb.getProfile(db, uid)).toBeNull();
    expect(await (await import("./db")).getUserByEmail(db, TEST_EMAIL)).not.toBeNull();
  });
});
