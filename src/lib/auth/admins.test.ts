import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// admins.ts reads env at import time, so each case re-imports with fresh env.
async function load(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  for (const k of ["SUPER_ADMIN_EMAILS", "ADMIN_EMAILS", "MASTER_EMAILS", "STAFF_EMAILS", "STAFF_EMAIL_DOMAINS", "STAFF_DOMAIN_PROGRAMS"]) {
    delete process.env[k];
  }
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
  return import("./admins");
}

beforeEach(() => vi.resetModules());
afterEach(() => {
  for (const k of ["SUPER_ADMIN_EMAILS", "ADMIN_EMAILS", "MASTER_EMAILS", "STAFF_EMAILS", "STAFF_EMAIL_DOMAINS", "STAFF_DOMAIN_PROGRAMS"]) {
    delete process.env[k];
  }
});

describe("isMasterEmail", () => {
  it("accepts the baked-in owner regardless of case", async () => {
    const a = await load();
    expect(a.isMasterEmail("fonz.morris@wearebgc.org")).toBe(true);
    expect(a.isMasterEmail("FONZ.Morris@WeAreBGC.org")).toBe(true);
  });

  it("rejects null, undefined and empty", async () => {
    const a = await load();
    expect(a.isMasterEmail(null)).toBe(false);
    expect(a.isMasterEmail(undefined)).toBe(false);
    expect(a.isMasterEmail("")).toBe(false);
  });

  it("rejects lookalike domains and subaddress tricks", async () => {
    const a = await load();
    expect(a.isMasterEmail("fonz.morris@wearebgc.org.evil.test")).toBe(false);
    expect(a.isMasterEmail("fonz.morris@wearebgc.co")).toBe(false);
    expect(a.isMasterEmail("fonz.morris@wearebgc.orgx")).toBe(false);
    expect(a.isMasterEmail("fonz.morris+x@wearebgc.org")).toBe(false);
    expect(a.isMasterEmail("xfonz.morris@wearebgc.org")).toBe(false);
  });

  it("does not trim whitespace (callers must pass a trimmed address)", async () => {
    const a = await load();
    expect(a.isMasterEmail(" fonz.morris@wearebgc.org")).toBe(false);
  });

  it("merges MASTER_EMAILS env, trimmed and lowercased", async () => {
    const a = await load({ MASTER_EMAILS: " Boss@Example.test , ,other@example.test" });
    expect(a.isMasterEmail("boss@example.test")).toBe(true);
    expect(a.isMasterEmail("other@example.test")).toBe(true);
  });

  it("a super_admin env entry is not automatically master", async () => {
    const a = await load({ SUPER_ADMIN_EMAILS: "sa@example.test" });
    expect(a.determineRole("sa@example.test")).toBe("super_admin");
    expect(a.isMasterEmail("sa@example.test")).toBe(false);
  });
});

describe("determineRole / isPrivilegedEmail", () => {
  it("maps by list, case-insensitively, defaulting to student", async () => {
    const a = await load({ SUPER_ADMIN_EMAILS: "sa@example.test", ADMIN_EMAILS: "ad@example.test" });
    expect(a.determineRole("SA@Example.test")).toBe("super_admin");
    expect(a.determineRole("ad@example.test")).toBe("admin");
    expect(a.determineRole("kid@example.test")).toBe("student");
    expect(a.determineRole("devin.cooper@wearebgc.org")).toBe("super_admin");
  });

  it("super_admin wins when an address is in both lists", async () => {
    const a = await load({ SUPER_ADMIN_EMAILS: "x@example.test", ADMIN_EMAILS: "x@example.test" });
    expect(a.determineRole("x@example.test")).toBe("super_admin");
  });

  it("isPrivilegedEmail covers both lists only", async () => {
    const a = await load({ ADMIN_EMAILS: "ad@example.test" });
    expect(a.isPrivilegedEmail("ad@example.test")).toBe(true);
    expect(a.isPrivilegedEmail("kid@example.test")).toBe(false);
    expect(a.isPrivilegedEmail("ad@example.test.evil.test")).toBe(false);
  });
});

describe("staff helpers", () => {
  it("treats the default wearebgc.org domain as staff, not lookalikes", async () => {
    const a = await load();
    expect(a.isStaffEmail("anyone@wearebgc.org")).toBe(true);
    expect(a.isStaffEmail("anyone@WEAREBGC.ORG")).toBe(true);
    expect(a.isStaffEmail("anyone@evil-wearebgc.org")).toBe(false);
    expect(a.isStaffEmail("anyone@wearebgc.org.evil.test")).toBe(false);
    expect(a.isStaffEmail("anyone@sub.wearebgc.org")).toBe(false);
    expect(a.isStaffEmail(null)).toBe(false);
  });

  it("honors explicit STAFF_EMAILS on other domains", async () => {
    const a = await load({ STAFF_EMAILS: "temp@gmail.test" });
    expect(a.isStaffEmail("TEMP@gmail.test")).toBe(true);
  });

  it("staffHomeProgramSlug maps by domain and tolerates bad input", async () => {
    const a = await load({ STAFF_DOMAIN_PROGRAMS: "partner.test:forte, bad, :x" });
    expect(a.staffHomeProgramSlug("a@wearebgc.org")).toBe("bgc");
    expect(a.staffHomeProgramSlug("a@wearebcc.org")).toBe("catalyst");
    expect(a.staffHomeProgramSlug("a@partner.test")).toBe("forte");
    expect(a.staffHomeProgramSlug("a@unknown.test")).toBeNull();
    expect(a.staffHomeProgramSlug("no-at-sign")).toBeNull();
    expect(a.staffHomeProgramSlug(undefined)).toBeNull();
  });
});
