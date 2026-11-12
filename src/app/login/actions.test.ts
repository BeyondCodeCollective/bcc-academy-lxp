import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSupabase } from "@/test-utils/supabase-mock";

const mocks = vi.hoisted(() => ({
  sendSignInEmail: vi.fn(async (..._a: unknown[]) => {}),
  generateLink: vi.fn(),
  allow: [] as { track_slug: string }[],
  student: null as { role: string } | null,
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "bccacademy.io" }) }));
vi.mock("@/lib/email", () => ({ sendSignInEmail: mocks.sendSignInEmail }));
vi.mock("@/lib/programs/server", () => ({
  getProgram: async () => ({ name: "Catalyst" }),
  resolveHomeProgramSlug: async () => null,
  fetchDynamicProgram: async () => null,
}));
vi.mock("@/lib/programs", () => ({ getHomeProgramForTrack: () => null, isProductionHost: (h: string) => h === "bccacademy.io" }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithOtp: vi.fn(async () => ({ error: null })) } }),
  createServiceClient: () => ({
    ...makeSupabase((table) => {
      if (table === "allowed_signup_emails") return { data: mocks.allow, count: mocks.allow.length };
      if (table === "students") return { data: mocks.student };
      return { data: null };
    }),
    auth: { admin: { createUser: async () => ({}), generateLink: mocks.generateLink } },
  }),
}));

import { sendLoginLink } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
  delete process.env.LOGIN_VIA_RESEND;
  mocks.allow = [{ track_slug: "catalyst-labs" }];
  mocks.student = null;
  mocks.generateLink.mockResolvedValue({
    data: { properties: { hashed_token: "hash123", email_otp: "123456" } },
    error: null,
  });
});

describe("sendLoginLink admission", () => {
  it("rejects an unknown email without minting a link", async () => {
    mocks.allow = [];
    const r = await sendLoginLink({ email: "stranger@example.test", origin: "https://bccacademy.io" });
    expect(r.ok).toBe(false);
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.sendSignInEmail).not.toHaveBeenCalled();
  });

  it("normalizes email case and whitespace", async () => {
    await sendLoginLink({ email: "  Kid@Example.TEST ", origin: "https://bccacademy.io" });
    expect(mocks.generateLink.mock.calls[0][0].email).toBe("kid@example.test");
  });

  it("emails the /auth/confirm interstitial with token_hash on the request host", async () => {
    const r = await sendLoginLink({ email: "kid@example.test", origin: "https://bccacademy.io", next: "/dashboard/x" });
    expect(r).toEqual({ ok: true });
    const link = new URL((mocks.sendSignInEmail.mock.calls[0][0] as { magicLink: string }).magicLink);
    expect(link.pathname).toBe("/auth/confirm");
    expect(link.searchParams.get("token_hash")).toBe("hash123");
    expect(link.searchParams.get("email")).toBe("kid@example.test");
    expect(link.searchParams.get("next")).toBe("/dashboard/x");
  });
});

describe("sendLoginLink origin handling", () => {
  it("builds the emailed link from the server-derived host", async () => {
    await sendLoginLink({ email: "kid@example.test", origin: "https://other.example.test" });
    const { magicLink } = mocks.sendSignInEmail.mock.calls[0][0] as { magicLink: string };
    expect(new URL(magicLink).host).toBe("bccacademy.io");
  });

  it("builds the generateLink redirectTo from the server-derived host", async () => {
    await sendLoginLink({ email: "kid@example.test", origin: "https://other.example.test" });
    const redirectTo = mocks.generateLink.mock.calls[0][0].options.redirectTo as string;
    expect(new URL(redirectTo).host).toBe("bccacademy.io");
  });
});
