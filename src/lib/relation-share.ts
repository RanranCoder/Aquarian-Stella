import type { RelationResult } from "@/lib/relation";

export type RelationContent = Pick<
  RelationResult,
  "keywords" | "attraction" | "misunderstanding" | "growth" | "advice"
>;

export type SharedRelation = {
  name: string;
  result: RelationResult;
  aiRelation?: RelationContent;
};

const MAX_PAYLOAD_BYTES = 16 * 1024;
const PLANETS = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "asc",
]);
const ASPECT_TYPES = new Set([
  "conjunction", "opposition", "trine", "square", "sextile",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown, maxLength = 1000): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 20 && value.every((item) => isString(item));
}

function isRelationContent(value: unknown): value is RelationContent {
  return (
    isRecord(value) &&
    isStringList(value.keywords) &&
    isStringList(value.attraction) &&
    isStringList(value.misunderstanding) &&
    isString(value.growth) &&
    isString(value.advice)
  );
}

function isPlanetPosition(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.planet === "string" &&
    PLANETS.has(value.planet) &&
    isString(value.label, 100) &&
    isString(value.signName, 100) &&
    isString(value.signSymbol, 20) &&
    typeof value.degree === "number" &&
    Number.isFinite(value.degree) &&
    value.degree >= 0 &&
    value.degree <= 30
  );
}

function isAspect(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.planetA === "string" &&
    PLANETS.has(value.planetA) &&
    typeof value.planetB === "string" &&
    PLANETS.has(value.planetB) &&
    typeof value.type === "string" &&
    ASPECT_TYPES.has(value.type) &&
    typeof value.angle === "number" &&
    Number.isFinite(value.angle) &&
    typeof value.orb === "number" &&
    Number.isFinite(value.orb) &&
    typeof value.strength === "number" &&
    Number.isFinite(value.strength) &&
    isString(value.label, 200)
  );
}

function isFactor(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.type === "positive" || value.type === "negative") &&
    typeof value.planetA === "string" &&
    PLANETS.has(value.planetA) &&
    typeof value.planetB === "string" &&
    PLANETS.has(value.planetB) &&
    typeof value.aspectType === "string" &&
    ASPECT_TYPES.has(value.aspectType) &&
    typeof value.weight === "number" &&
    Number.isFinite(value.weight) &&
    isString(value.label, 200)
  );
}

function isRelationResult(value: unknown): value is RelationResult {
  return (
    isRecord(value) &&
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    value.score >= 0 &&
    value.score <= 100 &&
    isStringList(value.keywords) &&
    isStringList(value.attraction) &&
    isStringList(value.misunderstanding) &&
    isString(value.growth) &&
    isString(value.advice) &&
    Array.isArray(value.positionsA) &&
    value.positionsA.length <= 20 &&
    value.positionsA.every(isPlanetPosition) &&
    Array.isArray(value.positionsB) &&
    value.positionsB.length === value.positionsA.length &&
    value.positionsB.length <= 20 &&
    value.positionsB.every(isPlanetPosition) &&
    Array.isArray(value.synastryAspects) &&
    value.synastryAspects.length <= 100 &&
    value.synastryAspects.every(isAspect) &&
    Array.isArray(value.factors) &&
    value.factors.length <= 100 &&
    value.factors.every(isFactor)
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Encode only the calculated report; no birth date, time, or city is included. */
export function encodeSharedRelation(report: SharedRelation): string {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ v: 1, ...report }),
  );
  if (bytes.length > MAX_PAYLOAD_BYTES) {
    throw new Error("分享内容过大，无法生成链接");
  }
  return toBase64Url(bytes);
}

export function decodeSharedRelation(token: string): SharedRelation | null {
  try {
    if (!token || token.length > Math.ceil((MAX_PAYLOAD_BYTES * 4) / 3)) return null;
    const bytes = fromBase64Url(token);
    if (bytes.length > MAX_PAYLOAD_BYTES) return null;
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (
      !isRecord(value) ||
      value.v !== 1 ||
      !isString(value.name, 40) ||
      !isRelationResult(value.result) ||
      (value.aiRelation !== undefined && !isRelationContent(value.aiRelation))
    ) {
      return null;
    }
    return {
      name: value.name,
      result: value.result,
      ...(value.aiRelation ? { aiRelation: value.aiRelation } : {}),
    };
  } catch {
    return null;
  }
}
