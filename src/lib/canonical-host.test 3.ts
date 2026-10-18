import { describe, it, expect } from "vitest";

/** Mirrors the host rule in src/proxy.ts. Kept as a pure function here so the
 *  decision is testable without booting the middleware — the bug it guards
 *  against (catalyst.bccacademy.io silently serving a full second copy of the
 *  app) is invisible until someone shares one of those URLs. */
const CANONICAL_HOST = "bccacademy.io";

export function shouldRedirectToCanonical(host: string): boolean {
  const bare = host.split(":")[0].toLowerCase();
  return bare.endsWith(`.${CANONICAL_HOST}`) && bare !== `www.${CANONICAL_HOST}`;
}

describe("canonical host", () => {
  it("redirects the legacy program subdomain", () => {
    expect(shouldRedirectToCanonical("catalyst.bccacademy.io")).toBe(true);
  });

  it("redirects any other legacy subdomain", () => {
    for (const h of ["forte.bccacademy.io", "bgc.bccacademy.io", "atg.bccacademy.io"]) {
      expect(shouldRedirectToCanonical(h)).toBe(true);
    }
  });

  it("leaves the apex alone", () => {
    expect(shouldRedirectToCanonical("bccacademy.io")).toBe(false);
  });

  it("leaves www alone — it already serves the marketing context", () => {
    expect(shouldRedirectToCanonical("www.bccacademy.io")).toBe(false);
  });

  it("leaves preview deployments and localhost alone", () => {
    for (const h of [
      "learning-portal-git-branch-team.vercel.app",
      "localhost:3000",
      "127.0.0.1:3001",
    ]) {
      expect(shouldRedirectToCanonical(h)).toBe(false);
    }
  });

  it("ignores the port and casing", () => {
    expect(shouldRedirectToCanonical("Catalyst.BCCAcademy.io:443")).toBe(true);
  });

  it("does not match a lookalike domain that merely ends in the same letters", () => {
    expect(shouldRedirectToCanonical("notbccacademy.io")).toBe(false);
    expect(shouldRedirectToCanonical("evil-bccacademy.io")).toBe(false);
  });
});
