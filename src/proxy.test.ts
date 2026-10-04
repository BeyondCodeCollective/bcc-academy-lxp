import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Drives the real proxy() with Supabase stubbed at the createServerClient
// boundary: getClaims decides who is signed in, the students lookup decides
// the role. Everything else (host rules, redirects, cookies) is the real code.
const getClaims = vi.fn();
const maybeSingle = vi.fn();
const from = vi.fn(() => ({
  select: () => ({ eq: () => ({ maybeSingle }) }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims }, from }),
}));

import { proxy } from "@/proxy";

function req(url: string, cookies: Record<string, string> = {}) {
  const u = new URL(url);
  const headers = new Headers({ host: u.host });
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(u, { headers });
}

const signedIn = (role: string) => {
  getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } } });
  maybeSingle.mockResolvedValue({ data: { role } });
};
const signedOut = () => getClaims.mockResolvedValue({ data: null });

const location = (res: Response) => {
  const l = res.headers.get("location");
  return l ? new URL(l) : null;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  signedOut();
});

describe("proxy: legacy subdomains", () => {
  it("308s a program subdomain to the apex, keeping path and query", async () => {
    const res = await proxy(req("https://catalyst.bccacademy.io/bcc/mass?utm=x"));
    expect(res.status).toBe(308);
    const to = location(res)!;
    expect(to.host).toBe("bccacademy.io");
    expect(to.pathname + to.search).toBe("/bcc/mass?utm=x");
    expect(to.protocol).toBe("https:");
  });

  it("leaves the apex, www and preview hosts alone", async () => {
    for (const u of [
      "https://bccacademy.io/bcc/mass",
      "https://www.bccacademy.io/bcc/mass",
      "https://learning-portal-git-x-beyond-code-collective.vercel.app/bcc/mass",
    ]) {
      const res = await proxy(req(u));
      expect(res.status).toBe(200);
      expect(location(res)).toBeNull();
    }
  });
});

describe("proxy: routes that skip the auth check", () => {
  it("never asks Supabase on a public page, and still sets the program cookie", async () => {
    const res = await proxy(req("https://bccacademy.io/bcc/mass"));
    expect(getClaims).not.toHaveBeenCalled();
    expect(res.cookies.get("program-slug")?.value).toBeTruthy();
  });

  it("forwards the program slug and pathname to server components", async () => {
    const res = await proxy(req("https://bccacademy.io/bcc/mass"));
    expect(res.headers.get("x-middleware-request-x-pathname")).toBe("/bcc/mass");
    expect(res.headers.get("x-middleware-request-x-program-slug")).toBeTruthy();
  });

  it("skips auth entirely when Supabase isn't configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const res = await proxy(req("https://bccacademy.io/dashboard"));
    expect(getClaims).not.toHaveBeenCalled();
    expect(location(res)).toBeNull();
  });
});

describe("proxy: signed-out visitors", () => {
  it("sends /dashboard/* to /login carrying the destination", async () => {
    const res = await proxy(req("https://bccacademy.io/dashboard/track/mass/1"));
    const to = location(res)!;
    expect(to.pathname).toBe("/login");
    expect(to.searchParams.get("next")).toBe("/dashboard/track/mass/1");
  });

  it("lets them see the public homepage", async () => {
    const res = await proxy(req("https://bccacademy.io/"));
    expect(location(res)).toBeNull();
  });
});

describe("proxy: signed-in visitors", () => {
  it("sends a student on / to /dashboard", async () => {
    signedIn("student");
    const res = await proxy(req("https://bccacademy.io/"));
    expect(location(res)!.pathname).toBe("/dashboard");
  });

  it("sends staff on / and /dashboard straight to the admin panel", async () => {
    signedIn("admin");
    for (const u of ["https://bccacademy.io/", "https://bccacademy.io/dashboard"]) {
      const res = await proxy(req(u));
      expect(location(res)!.pathname).toBe("/dashboard/admin");
    }
  });

  it("keeps a student on /dashboard", async () => {
    signedIn("student");
    const res = await proxy(req("https://bccacademy.io/dashboard"));
    expect(location(res)).toBeNull();
  });

  it("does not bounce staff who are previewing as a student", async () => {
    signedIn("super_admin");
    const res = await proxy(
      req("https://bccacademy.io/dashboard", { "preview-as-student": "1" }),
    );
    expect(location(res)).toBeNull();
  });

  it("does not bounce staff who are using the ?as= preview override", async () => {
    signedIn("admin");
    const res = await proxy(req("https://bccacademy.io/dashboard?as=catalyst"));
    expect(location(res)).toBeNull();
    expect(res.cookies.get("program-override")?.value).toBe("catalyst");
  });

  it("skips the role lookup on deeper dashboard routes", async () => {
    signedIn("admin");
    const res = await proxy(req("https://bccacademy.io/dashboard/track/mass/1"));
    expect(from).not.toHaveBeenCalled();
    expect(location(res)).toBeNull();
  });
});
