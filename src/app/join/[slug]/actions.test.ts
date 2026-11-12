import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSupabase } from "@/test-utils/supabase-mock";

const mocks = vi.hoisted(() => ({
  sendSignInEmail: vi.fn(async (..._a: unknown[]) => {}),
  generateLink: vi.fn(),
  signInWithOtp: vi.fn(async (..._a: unknown[]) => ({ error: null as null | { message: string } })),
  listSize: 0,
  listed: false,
  archived: null as string | null,
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "bccacademy.io" }) }));
vi.mock("@/lib/email", () => ({ sendSignInEmail: mocks.sendSignInEmail }));
vi.mock("@/lib/programs", () => ({
  getProgramBySlug: () => ({ name: "Catalyst" }),
  isProductionHost: (h: string) => h === "bccacademy.io",
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithOtp: mocks.signInWithOtp } }),
  createServiceClient: () => ({
    ...makeSupabase((table) => {
      if (table === "programs") return { data: { id: "p1" } };
      if (table === "track_overrides") return { data: { archived_at: mocks.archived } };
      if (table === "allowed_signup_emails")
        return { data: mocks.listed ? { email: "x" } : null, count: mocks.listSize, error: null };
      return { data: null };
    }),
    auth: { admin: { generateLink: mocks.generateLink } },
  }),
}));

import { sendJoinLink } from "./actions";

const base = { email: "Kid@Example.test", programSlug: "catalyst", trackSlug: "catalyst-labs", origin: "https://bccacademy.io" };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
  delete process.env.LOGIN_VIA_RESEND;
  mocks.listSize = 0;
  mocks.listed = false;
  mocks.archived = null;
  mocks.generateLink.mockResolvedValue({ data: { properties: { hashed_token: "h1" } }, error: null });
});

describe("sendJoinLink gating", () => {
  it("open enrollment: empty allowlist admits anyone", async () => {
    expect(await sendJoinLink(base)).toEqual({ ok: true });
    expect(mocks.sendSignInEmail).toHaveBeenCalledTimes(1);
  });

  it("restricted track rejects an unlisted email with no email sent", async () => {
    mocks.listSize = 5;
    expect(await sendJoinLink(base)).toEqual({ ok: false, rejected: true });
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.sendSignInEmail).not.toHaveBeenCalled();
  });

  it("restricted track admits a listed email", async () => {
    mocks.listSize = 5;
    mocks.listed = true;
    expect(await sendJoinLink(base)).toEqual({ ok: true });
  });

  it("blocks signup into an archived course", async () => {
    mocks.archived = "2026-01-01T00:00:00Z";
    const r = await sendJoinLink(base);
    expect(r.ok).toBe(false);
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });

  it("emails a token_hash link carrying join and track", async () => {
    await sendJoinLink(base);
    const { magicLink, to } = mocks.sendSignInEmail.mock.calls[0][0] as { magicLink: string; to: string };
    expect(to).toBe("kid@example.test");
    const u = new URL(magicLink);
    expect(u.searchParams.get("token_hash")).toBe("h1");
    expect(u.searchParams.get("join")).toBe("catalyst");
    expect(u.searchParams.get("track")).toBe("catalyst-labs");
  });
});

describe("sendJoinLink origin handling", () => {
  it("builds the emailed link from the server-derived host", async () => {
    await sendJoinLink({ ...base, origin: "https://other.example.test" });
    const { magicLink } = mocks.sendSignInEmail.mock.calls[0][0] as { magicLink: string };
    expect(new URL(magicLink).host).toBe("bccacademy.io");
  });

  it("builds the OTP fallback redirect from the server-derived host", async () => {
    process.env.LOGIN_VIA_RESEND = "false";
    await sendJoinLink({ ...base, origin: "https://other.example.test" });
    const opts = mocks.signInWithOtp.mock.calls[0][0] as { options: { emailRedirectTo: string } };
    expect(new URL(opts.options.emailRedirectTo).host).toBe("bccacademy.io");
  });
});
