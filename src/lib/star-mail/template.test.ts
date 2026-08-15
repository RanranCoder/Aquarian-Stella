import { describe, expect, it } from "vitest";
import { buildStarMailHtml, escapeHtml } from "./template";

describe("escapeHtml", () => {
  it("escapes HTML metacharacters", () => {
    expect(escapeHtml("<script>alert('x')</script>")).toBe("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(escapeHtml("a & b \"q\"")).toBe("a &amp; b &quot;q&quot;");
  });
});

describe("buildStarMailHtml", () => {
  it("embeds escaped title, body, taName and signature", () => {
    const html = buildStarMailHtml({ title: "你好 <Ta>", body: "第一行\n第二行", signature: "R", taName: "小星" });
    expect(html).toContain("你好 &lt;Ta&gt;");
    expect(html).toContain("第一行<br>第二行");
    expect(html).toContain("亲爱的 小星：");
    expect(html).toContain("—— R");
    expect(html).toContain("有些话，写下来就已经很好了。");
  });
});
