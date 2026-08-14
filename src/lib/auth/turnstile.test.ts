import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "./turnstile";

describe("verifyTurnstileToken", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns true when siteverify succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await verifyTurnstileToken("tok", "secret", "1.2.3.4")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.body).toContain("remoteip=1.2.3.4");
  });

  it("returns false when siteverify fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }));
    expect(await verifyTurnstileToken("tok", "secret")).toBe(false);
  });

  it("returns false when the HTTP call errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    expect(await verifyTurnstileToken("tok", "secret")).toBe(false);
  });
});
