import { describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));

import { POST } from "./route";

describe("/api/quiz/results", () => {
  it("is inert: never emails and reports pending_email_design", async () => {
    const res = await POST(new Request("https://x/api/quiz/results", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.co", personalityKey: "fixer", ageGroup: null }),
    }));
    expect(await res.json()).toEqual({ ok: false, reason: "pending_email_design" });
    expect(send).not.toHaveBeenCalled();
  });

  it("does not even parse the body while disabled", async () => {
    const res = await POST(new Request("https://x/api/quiz/results", { method: "POST", body: "{bad" }));
    expect(res.status).toBe(200);
  });
});
