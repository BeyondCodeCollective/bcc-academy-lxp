import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchange: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(async () => ({})),
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: (fn: () => unknown) => void fn };
});
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      verifyOtp: mocks.verifyOtp,
      exchangeCodeForSession: mocks.exchange,
      getUser: mocks.getUser,
      signOut: mocks.signOut,
    },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => ({ from: () => ({}) }) }));
vi.mock("@/lib/programs/server", () => ({
  getProgram: async () => ({ slug: "catalyst", name: "Catalyst" }),
  fetchDynamicProgram: async () => null,
  resolveHomeProgramSlug: async () => null,
}));
vi.mock("@/lib/mailchimp", () => ({ subscribeToNewsletter: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendStaffAccountNotification: vi.fn() }));
vi.mock("@/lib/analytics/log-event", () => ({ logActivityEvent: vi.fn() }));

import { GET } from "./route";

const BASE = "https://bccacademy.io";
const get = (qs: string) => GET(new Request(`${BASE}/auth/callback${qs}`, { headers: { host: "bccacademy.io" } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  mocks.verifyOtp.mockResolvedValue({ data: null, error: new Error("expired") });
  mocks.exchange.mockResolvedValue({ data: null, error: new Error("bad code") });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("auth callback failure paths", () => {
  it("redirects to /login?error=auth when there is nothing to verify", async () => {
    const res = await get("");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${BASE}/login?error=auth`);
  });

  it("keeps a safe next across a failed token exchange", async () => {
    const res = await get("?token_hash=abc&type=magiclink&next=/dashboard/survey/1");
    expect(res.headers.get("location")).toBe(`${BASE}/login?error=auth&next=${encodeURIComponent("/dashboard/survey/1")}`);
  });

  it.each(["//evil.test", "https://evil.test", "/\\evil.test", "/admin"])("drops an unsafe next %j on failure", async (bad) => {
    const res = await get(`?token_hash=abc&type=magiclink&next=${encodeURIComponent(bad)}`);
    expect(res.headers.get("location")).toBe(`${BASE}/login?error=auth`);
  });

  it("passes only allow-listed types to verifyOtp", async () => {
    await get("?token_hash=abc&type=magiclink");
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "magiclink" });
  });

  it("blocks the wrong-account fallback and signs the stale session out", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "Other@Example.test" } } });
    const res = await get("?token_hash=abc&type=magiclink&email=Target@Example.test");
    expect(mocks.signOut).toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(`${BASE}/login?error=auth`);
  });

  it("redirect targets stay on the request origin", async () => {
    const res = await get("?code=zzz&next=//evil.test");
    expect(new URL(res.headers.get("location")!).origin).toBe(BASE);
  });
});
