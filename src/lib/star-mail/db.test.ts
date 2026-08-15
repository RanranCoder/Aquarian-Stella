import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { MemoryD1 } from "@/lib/auth/d1-mock";
import { insertStarMailRecord } from "./db";

describe("insertStarMailRecord", () => {
  it("inserts a masked metadata record", async () => {
    const db = new MemoryD1();
    const d = db as unknown as D1Database;
    await insertStarMailRecord(d, {
      userId: 7,
      recipient: "a***@gmail.com",
      recipientDomain: "gmail.com",
      title: "有些话想告诉你",
      signature: "R",
    });
    const rows = db.getStarMails();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: 7,
      recipient: "a***@gmail.com",
      recipient_domain: "gmail.com",
      title: "有些话想告诉你",
      signature: "R",
      status: "sent",
    });
  });
});
