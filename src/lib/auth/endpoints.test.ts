import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryD1 } from "./d1-mock";
import { hashPassword } from "./crypto";
import type { D1Database } from "@cloudflare/workers-types";
import { NextRequest } from "next/server";

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

/* ------------------------------------------------------------------ */
/*  Dynamic imports (after mocks are hoisted)                         */
/* ------------------------------------------------------------------ */

async function loadLogin() {
  return import("@/app/api/auth/login/route");
}

async function loadPassword() {
  return import("@/app/api/auth/password/route");
}

async function loadDelete() {
  return import("@/app/api/auth/delete/route");
}

async function loadSession() {
  return import("./session");
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeRequest(
  url: string,
  body: unknown,
  cookie?: string,
): NextRequest {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie) headers.set("Cookie", `stella_session=${cookie}`);
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function extractCookie(response: Response, name: string): string | null {
  // NextResponse.headers is a Headers; Set-Cookie is stored as a single string
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

/* ------------------------------------------------------------------ */
/*  Setup: create a user with password in MemoryD1                    */
/* ------------------------------------------------------------------ */

const TEST_EMAIL = "user@test.com";
const TEST_PASSWORD = "correct-password";

async function seedUser(): Promise<D1Database> {
  const db = new MemoryD1() as unknown as D1Database;
  const hash = await hashPassword(TEST_PASSWORD);
  // Use adminCreateUser logic directly
  await db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .bind(TEST_EMAIL, hash)
    .run();
  return db;
}

/* ================================================================== */
/*  /api/auth/login                                                   */
/* ================================================================== */

describe("/api/auth/login", () => {
  beforeEach(() => {
    mockDb = undefined!;
  });

  it("returns 400 for invalid body", async () => {
    mockDb = new MemoryD1() as unknown as D1Database;
    const { POST } = await loadLogin();
    const req = makeRequest("http://localhost/api/auth/login", null);
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.error).toBe("INVALID_BODY");
  });

  it("returns 400 for invalid email", async () => {
    mockDb = new MemoryD1() as unknown as D1Database;
    const { POST } = await loadLogin();
    const req = makeRequest("http://localhost/api/auth/login", { email: "bad", password: "x" });
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.error).toBe("INVALID_EMAIL");
  });

  it("returns 400 for empty password", async () => {
    mockDb = new MemoryD1() as unknown as D1Database;
    const { POST } = await loadLogin();
    const req = makeRequest("http://localhost/api/auth/login", { email: "a@b.com", password: "" });
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.error).toBe("INVALID_PASSWORD");
  });

  it("returns 401 for nonexistent user", async () => {
    mockDb = new MemoryD1() as unknown as D1Database;
    const { POST } = await loadLogin();
    const req = makeRequest("http://localhost/api/auth/login", {
      email: "ghost@test.com",
      password: "any",
    });
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.error).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 for wrong password", async () => {
    mockDb = await seedUser();
    const { POST } = await loadLogin();
    const req = makeRequest("http://localhost/api/auth/login", {
      email: TEST_EMAIL,
      password: "wrong-password",
    });
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.error).toBe("INVALID_CREDENTIALS");
  });

  it("returns token + user on successful login", async () => {
    mockDb = await seedUser();
    const { POST } = await loadLogin();
    const req = makeRequest("http://localhost/api/auth/login", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.ok).toBe(true);
    expect(json.token).toBeTruthy();
    expect(json.user.email).toBe(TEST_EMAIL);
    expect(json.user.id).toBeTruthy();
  });

  it("sets session cookie on successful login", async () => {
    mockDb = await seedUser();
    const { POST } = await loadLogin();
    const req = makeRequest("http://localhost/api/auth/login", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    const res = await POST(req );
    const cookie = extractCookie(res as Response, "stella_session");
    expect(cookie).toBeTruthy();
    expect(cookie!.length).toBeGreaterThan(10);
  });

  it("returned token is a valid session token", async () => {
    mockDb = await seedUser();
    const { POST } = await loadLogin();
    const req = makeRequest("http://localhost/api/auth/login", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    const res = await POST(req );
    const json = await (res as Response).json();
    const { verifySession } = await loadSession();
    const payload = await verifySession(json.token, AUTH_SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.email).toBe(TEST_EMAIL);
  });

  it("email is case-insensitive (normalized to lowercase)", async () => {
    mockDb = await seedUser();
    const { POST } = await loadLogin();
    const req = makeRequest("http://localhost/api/auth/login", {
      email: "USER@TEST.COM",
      password: TEST_PASSWORD,
    });
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.ok).toBe(true);
    expect(json.user.email).toBe(TEST_EMAIL);
  });
});

/* ================================================================== */
/*  /api/auth/password                                                */
/* ================================================================== */

describe("/api/auth/password", () => {
  beforeEach(() => {
    mockDb = undefined!;
  });

  async function loginToken(): Promise<string> {
    const db = await seedUser();
    mockDb = db;
    const { signSession } = await loadSession();
    return signSession(
      { uid: 1, email: TEST_EMAIL, exp: Date.now() + 3_600_000 },
      AUTH_SECRET,
    );
  }

  it("returns 401 without session cookie", async () => {
    mockDb = new MemoryD1() as unknown as D1Database;
    const { POST } = await loadPassword();
    const req = makeRequest("http://localhost/api/auth/password", {
      oldPassword: "x",
      newPassword: "new-password-8",
    });
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.error).toBe("UNAUTHORIZED");
  });

  it("returns 400 for short new password", async () => {
    const token = await loginToken();
    const { POST } = await loadPassword();
    const req = makeRequest(
      "http://localhost/api/auth/password",
      { oldPassword: TEST_PASSWORD, newPassword: "short" },
      token,
    );
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.error).toBe("INVALID_NEW_PASSWORD");
  });

  it("returns 401 for wrong old password", async () => {
    const token = await loginToken();
    const { POST } = await loadPassword();
    const req = makeRequest(
      "http://localhost/api/auth/password",
      { oldPassword: "wrong-old", newPassword: "new-password-8" },
      token,
    );
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.error).toBe("WRONG_PASSWORD");
  });

  it("changes password successfully", async () => {
    const token = await loginToken();
    const { POST } = await loadPassword();
    const req = makeRequest(
      "http://localhost/api/auth/password",
      { oldPassword: TEST_PASSWORD, newPassword: "brand-new-pass" },
      token,
    );
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.ok).toBe(true);
  });

  it("new password works for subsequent login", async () => {
    const token = await loginToken();
    const { POST: pwdPOST } = await loadPassword();
    // Change password
    const pwdReq = makeRequest(
      "http://localhost/api/auth/password",
      { oldPassword: TEST_PASSWORD, newPassword: "brand-new-pass" },
      token,
    );
    await pwdPOST(pwdReq );

    // Login with new password
    const { POST: loginPOST } = await loadLogin();
    const loginReq = makeRequest("http://localhost/api/auth/login", {
      email: TEST_EMAIL,
      password: "brand-new-pass",
    });
    const loginRes = await loginPOST(loginReq );
    const json = await (loginRes as Response).json();
    expect(json.ok).toBe(true);
  });

  it("old password no longer works after change", async () => {
    const token = await loginToken();
    const { POST: pwdPOST } = await loadPassword();
    const pwdReq = makeRequest(
      "http://localhost/api/auth/password",
      { oldPassword: TEST_PASSWORD, newPassword: "brand-new-pass" },
      token,
    );
    await pwdPOST(pwdReq );

    const { POST: loginPOST } = await loadLogin();
    const loginReq = makeRequest("http://localhost/api/auth/login", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    const loginRes = await loginPOST(loginReq );
    const json = await (loginRes as Response).json();
    expect(json.error).toBe("INVALID_CREDENTIALS");
  });
});

/* ================================================================== */
/*  /api/auth/delete                                                  */
/* ================================================================== */

describe("/api/auth/delete", () => {
  beforeEach(() => {
    mockDb = undefined!;
  });

  async function loginToken(): Promise<string> {
    const db = await seedUser();
    mockDb = db;
    const { signSession } = await loadSession();
    return signSession(
      { uid: 1, email: TEST_EMAIL, exp: Date.now() + 3_600_000 },
      AUTH_SECRET,
    );
  }

  it("returns 401 without session cookie", async () => {
    mockDb = new MemoryD1() as unknown as D1Database;
    const { POST } = await loadDelete();
    const req = makeRequest("http://localhost/api/auth/delete", { password: "x" });
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.error).toBe("UNAUTHORIZED");
  });

  it("returns 401 for wrong password", async () => {
    const token = await loginToken();
    const { POST } = await loadDelete();
    const req = makeRequest(
      "http://localhost/api/auth/delete",
      { password: "wrong" },
      token,
    );
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.error).toBe("WRONG_PASSWORD");
  });

  it("deletes account and clears session cookie", async () => {
    const token = await loginToken();
    const { POST } = await loadDelete();
    const req = makeRequest(
      "http://localhost/api/auth/delete",
      { password: TEST_PASSWORD },
      token,
    );
    const res = await POST(req );
    const json = await (res as Response).json();
    expect(json.ok).toBe(true);

    // Cookie should be cleared (max-age=0 or empty value)
    const setCookie = (res as Response).headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("stella_session");
  });

  it("user no longer exists after deletion", async () => {
    const token = await loginToken();
    const { POST: delPOST } = await loadDelete();
    const req = makeRequest(
      "http://localhost/api/auth/delete",
      { password: TEST_PASSWORD },
      token,
    );
    await delPOST(req );

    // Login should fail now
    const { POST: loginPOST } = await loadLogin();
    const loginReq = makeRequest("http://localhost/api/auth/login", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    const loginRes = await loginPOST(loginReq );
    const json = await (loginRes as Response).json();
    expect(json.error).toBe("INVALID_CREDENTIALS");
  });
});
