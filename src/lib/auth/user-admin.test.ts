import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { findUserByEmail, adminCreateUser } from "./user-admin";
import { upsertUserByEmail } from "./db";
import { verifyPassword } from "./crypto";
import { MemoryD1 } from "./d1-mock";

describe("user-admin", () => {
  describe("findUserByEmail", () => {
    it("returns null for nonexistent email", async () => {
      const db = new MemoryD1() as unknown as D1Database;
      expect(await findUserByEmail(db, "nope@b.com")).toBeNull();
    });

    it("returns user after OTP-based upsert", async () => {
      const db = new MemoryD1() as unknown as D1Database;
      await upsertUserByEmail(db, "otp@b.com");
      const user = await findUserByEmail(db, "otp@b.com");
      expect(user).not.toBeNull();
      expect(user!.email).toBe("otp@b.com");
      expect(typeof user!.id).toBe("number");
    });

    it("returns user after password-based creation", async () => {
      const db = new MemoryD1() as unknown as D1Database;
      await adminCreateUser(db, { email: "pw@b.com", password: "secret" });
      const user = await findUserByEmail(db, "pw@b.com");
      expect(user).not.toBeNull();
      expect(user!.email).toBe("pw@b.com");
    });
  });

  describe("adminCreateUser", () => {
    it("creates a user with a valid password hash", async () => {
      const db = new MemoryD1() as unknown as D1Database;
      const user = await adminCreateUser(db, { email: "new@b.com", password: "mypassword" });
      expect(user.email).toBe("new@b.com");
      expect(typeof user.id).toBe("number");
    });

    it("password can be verified after creation", async () => {
      const db = new MemoryD1() as unknown as D1Database;
      await adminCreateUser(db, { email: "check@b.com", password: "correct-horse" });

      // getUserPasswordHash is internal to db.ts; use the D1 mock directly
      const hash = await (db as unknown as { prepare: (s: string) => { bind: (...a: unknown[]) => { first: <T>() => Promise<T | null> } } })
        .prepare("SELECT password_hash FROM users WHERE email = ?")
        .bind("check@b.com")
        .first<{ password_hash: string | null }>();

      expect(hash).not.toBeNull();
      expect(hash!.password_hash).toBeTruthy();
      expect(await verifyPassword("correct-horse", hash!.password_hash!)).toBe(true);
      expect(await verifyPassword("wrong", hash!.password_hash!)).toBe(false);
    });

    it("throws on duplicate email", async () => {
      const db = new MemoryD1() as unknown as D1Database;
      await adminCreateUser(db, { email: "dup@b.com", password: "p1" });
      await expect(adminCreateUser(db, { email: "dup@b.com", password: "p2" })).rejects.toThrow();
    });
  });
});
