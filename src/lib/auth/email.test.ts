import { afterEach, describe, expect, it, vi } from "vitest";
import { sendOtpEmail } from "./email";

describe("sendOtpEmail", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("logs the code and does not fetch in devLog mode", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await sendOtpEmail({ email: "a@b.com", code: "123456", from: "no-reply@x.com", apiKey: "k", devLog: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("123456"));
  });

  it("posts to the Resend API with bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await sendOtpEmail({ email: "a@b.com", code: "123456", from: "no-reply@x.com", apiKey: "re_xxx", devLog: false });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_xxx" }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toEqual(["a@b.com"]);
    expect(body.text).toContain("123456");
  });

  it("throws when Resend responds non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(
      sendOtpEmail({ email: "a@b.com", code: "123456", from: "no-reply@x.com", apiKey: "k", devLog: false }),
    ).rejects.toThrow();
  });
});
