import { beforeEach, describe, expect, it, vi } from "vitest";

const reqHeaders = new Map<string, string>();
const reqCookies = new Map<string, string>();

vi.mock("@/lib/supabase/server", () => {
  const b: Record<string, unknown> = {};
  const self = () => b;
  for (const m of ["select", "eq", "order", "limit"]) b[m] = self;
  b.maybeSingle = async () => ({ data: null });
  b.single = async () => ({ data: null });
  b.then = (ok: (v: unknown) => void) => ok({ data: [] });
  return { createServiceClient: () => ({ from: () => b }) };
});
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => reqHeaders.get(k) ?? null }),
  cookies: async () => ({
    get: (k: string) => (reqCookies.has(k) ? { value: reqCookies.get(k) } : undefined),
  }),
}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/programs/hidden", () => ({ getHiddenTrackSlugs: async () => new Set<string>() }));

import { getProgramByDomain, isKnownProgramHost } from "@/lib/programs";
import { getProgram } from "@/lib/programs/server";

beforeEach(() => {
  reqHeaders.clear();
  reqCookies.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("DOMAIN_MAP via getProgramByDomain", () => {
  it("maps the apex and www to the marketing context", () => {
    expect(getProgramByDomain("bccacademy.io").slug).toBe("marketing");
    expect(getProgramByDomain("www.bccacademy.io").slug).toBe("marketing");
    expect(getProgramByDomain("bccacademy.io:443").slug).toBe("marketing");
  });

  it("falls back to catalyst for previews, localhost and unknown hosts", () => {
    expect(getProgramByDomain("localhost:3000").slug).toBe("catalyst");
    expect(getProgramByDomain("learning-portal-abc.vercel.app").slug).toBe("catalyst");
    expect(getProgramByDomain("forte.bccacademy.io").slug).toBe("catalyst");
  });

  it("does not match a lookalike of the apex", () => {
    expect(getProgramByDomain("bccacademy.io.evil.test").slug).not.toBe("marketing");
    expect(getProgramByDomain("evilbccacademy.io").slug).not.toBe("marketing");
  });

  it("isKnownProgramHost is always false (no program subdomains)", () => {
    expect(isKnownProgramHost("bccacademy.io")).toBe(false);
    expect(isKnownProgramHost("forte.bccacademy.io")).toBe(false);
  });
});

describe("getProgram resolution order", () => {
  it("uses the host when no signals are present", async () => {
    reqHeaders.set("host", "bccacademy.io");
    expect((await getProgram()).slug).toBe("marketing");
  });

  it("header beats the program-slug cookie", async () => {
    reqHeaders.set("host", "localhost:3000");
    reqHeaders.set("x-program-slug", "forte");
    reqCookies.set("program-slug", "bgc");
    expect((await getProgram()).slug).toBe("forte");
  });

  it("an unknown header slug falls through to the cookie", async () => {
    reqHeaders.set("host", "localhost:3000");
    reqHeaders.set("x-program-slug", "does-not-exist");
    reqCookies.set("program-slug", "bgc");
    expect((await getProgram()).slug).toBe("bgc");
  });
});
