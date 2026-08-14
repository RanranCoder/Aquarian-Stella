import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";
import type { SessionPayload } from "./types";

const SECRET = "test-secret-123";
const payload: SessionPayload = { uid: 7, email: "a@b.com", exp: Date.now() + 100000 };

describe("session", () => {
  it("signs and verifies a roundtrip token", async () => {
    const token = await signSession(payload, SECRET);
    const verified = await verifySession(token, SECRET);
    expect(verified).toEqual(payload);
  });

  it("rejects tampered tokens", async () => {
    const token = await signSession(payload, SECRET);
    const tampered = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA");
    expect(await verifySession(tampered, SECRET)).toBeNull();
  });

  it("rejects tokens signed with a different secret", async () => {
    const token = await signSession(payload, SECRET);
    expect(await verifySession(token, "other-secret")).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const expired = await signSession({ ...payload, exp: Date.now() - 1000 }, SECRET);
    expect(await verifySession(expired, SECRET)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifySession("not-a-token", SECRET)).toBeNull();
  });
});
