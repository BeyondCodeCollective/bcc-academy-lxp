import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/programs/server", () => ({ resolveHomeProgramSlug: vi.fn(async () => "field-ready") }));
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => true,
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
  createServiceClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "super_admin" } }) }) }) }),
  }),
}));

import { GET } from "./route";

const url = "https://bccacademy.io/dashboard/switch-program?track=field-ready-staff-cohort";

describe("/dashboard/switch-program", () => {
  it("does not touch the program cookie on a router prefetch", async () => {
    const res = await GET(new NextRequest(url, { headers: { rsc: "1", "next-router-prefetch": "1" } }));
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("does not touch the program cookie on a browser speculative prefetch", async () => {
    const res = await GET(new NextRequest(url, { headers: { "sec-purpose": "prefetch;prerender" } }));
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("switches the program on a real navigation", async () => {
    const res = await GET(new NextRequest(url, { headers: { rsc: "1" } }));
    expect(res.status).toBe(307);
    expect(res.headers.get("set-cookie")).toContain("program-override=field-ready");
  });
});
