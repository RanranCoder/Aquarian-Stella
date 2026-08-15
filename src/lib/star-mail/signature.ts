import { SIGNATURE_MAX } from "./validate";

export const ANONYMOUS_SIGNATURE = "一个想把这句话告诉你的人";

export function resolveSignature(
  draft: { signatureType: "name" | "anonymous" | "custom"; customSignature: string },
  nickname?: string,
): string {
  if (draft.signatureType === "name") {
    const name = nickname?.trim();
    return (name || ANONYMOUS_SIGNATURE).slice(0, SIGNATURE_MAX);
  }
  if (draft.signatureType === "custom") {
    return (draft.customSignature.trim() || ANONYMOUS_SIGNATURE).slice(0, SIGNATURE_MAX);
  }
  return ANONYMOUS_SIGNATURE;
}
