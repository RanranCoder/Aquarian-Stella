import { describe, expect, it } from "vitest";
import { getRelation } from "@/lib/relation";
import type { BirthProfile } from "@/lib/astrology";
import { decodeSharedRelation, encodeSharedRelation } from "./relation-share";

const profileA: BirthProfile = {
  nickname: "A",
  birthDate: "1995-01-01",
  birthTime: "12:00",
  birthTimeAccuracy: "exact",
  birthCity: "北京",
  interests: [],
};

const profileB: BirthProfile = {
  nickname: "B",
  birthDate: "1997-06-15",
  birthTime: "08:30",
  birthTimeAccuracy: "exact",
  birthCity: "上海",
  interests: [],
};

describe("relation sharing", () => {
  it("round-trips calculated results without including birth data", () => {
    const result = getRelation(profileA, profileB);
    const token = encodeSharedRelation({
      name: "TA",
      result,
      aiRelation: {
        keywords: ["默契"],
        attraction: result.attraction,
        misunderstanding: result.misunderstanding,
        growth: result.growth,
        advice: result.advice,
      },
    });
    const decoded = decodeSharedRelation(token);

    expect(decoded).toEqual({
      name: "TA",
      result,
      aiRelation: {
        keywords: ["默契"],
        attraction: result.attraction,
        misunderstanding: result.misunderstanding,
        growth: result.growth,
        advice: result.advice,
      },
    });
    expect(atob(token.replaceAll("-", "+").replaceAll("_", "/"))).not.toContain("1995-01-01");
  });

  it("rejects malformed, oversized, or unsupported payloads", () => {
    expect(decodeSharedRelation("%%%")).toBeNull();
    expect(decodeSharedRelation("A".repeat(30_000))).toBeNull();
    const unsupported = btoa(JSON.stringify({ v: 2, name: "TA", result: {} }));
    expect(decodeSharedRelation(unsupported)).toBeNull();
  });
});
