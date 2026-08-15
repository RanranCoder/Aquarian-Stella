import { describe, expect, it } from "vitest";
import { maskEmail } from "./mask";

describe("maskEmail", () => {
  it("masks the local part after the first char", () => {
    expect(maskEmail("a@example.com")).toBe("a***@example.com");
    expect(maskEmail("zhangsan@163.com")).toBe("z***@163.com");
  });
  it("keeps the domain intact", () => {
    expect(maskEmail("loveyou@gmail.com")).toBe("l***@gmail.com");
  });
});
