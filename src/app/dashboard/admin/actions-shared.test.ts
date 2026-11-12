import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSupabase } from "@/test-utils/supabase-mock";

const st = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  student: { role: "admin", program_id: "progA", email: "a@example.test" } as {
    role: string;
    program_id: string | null;
    email: string | null;
  } | null,
  preview: "" as string,
  grants: [] as { programId: string; role: string; trackSlug: string | null }[],
  studentRow: null as { program_id: string | null } | null,
  trackOwner: null as { program_id: string | null } | null,
  programIds: {} as Record<string, string>,
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (k === "preview-as-student" && st.preview ? { value: st.preview } : undefined) }),
}));
vi.mock("@/lib/auth/program-access", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/program-access")>()),
  getProgramGrants: async () => st.grants,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: st.user } }) } }),
  createServiceClient: () =>
    makeSupabase((table, _op, f) => {
      if (table === "students") {
        // requireCapability reads by id with role/email; the student guard reads program_id
        return { data: f.id === "target" ? st.studentRow : st.student };
      }
      if (table === "programs") {
        const id = st.programIds[String(f.slug)];
        return id ? { data: { id }, error: null } : { data: null, error: { message: "nf" } };
      }
      if (table === "track_overrides") return { data: st.trackOwner };
      return { data: null };
    }),
}));

import { createServiceClient } from "@/lib/supabase/server";
import {
  allowedProgramIdsForActor,
  assertLandingPageInActorProgram,
  assertStudentInActorProgram,
  assertTrackInActorProgram,
  requireAdmin,
  requireCapability,
  requireManager,
  requireSuperAdmin,
  resolveProgramForActor,
} from "./actions-shared";

const svc = () => createServiceClient();

beforeEach(() => {
  st.user = { id: "u1" };
  st.student = { role: "admin", program_id: "progA", email: "a@example.test" };
  st.preview = "";
  st.grants = [];
  st.studentRow = null;
  st.trackOwner = null;
  st.programIds = { a: "progA", b: "progB" };
});

describe("requireCapability role matrix", () => {
  it("redirects an anonymous caller", async () => {
    st.user = null;
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });

  it.each([
    ["student", false, false, false],
    ["instructor", true, false, false],
    ["admin", true, true, false],
    ["super_admin", true, true, true],
  ])("%s: admin=%s manager=%s superAdmin=%s", async (role, admin, manager, sa) => {
    st.student = { role, program_id: "progA", email: "x@example.test" };
    const ok = async (f: () => Promise<unknown>) => f().then(() => true, () => false);
    expect(await ok(requireAdmin)).toBe(admin);
    expect(await ok(requireManager)).toBe(manager);
    expect(await ok(requireSuperAdmin)).toBe(sa);
  });

  it("a missing student row has no role and is rejected", async () => {
    st.student = null;
    await expect(requireAdmin()).rejects.toThrow("Not authorized");
  });

  it("a master email bypasses the capability check even with a student role", async () => {
    st.student = { role: "student", program_id: null, email: "Fonz.Morris@wearebgc.org" };
    await expect(requireManager()).resolves.toMatchObject({ isMaster: true });
  });

  it("a lookalike master email does not bypass", async () => {
    st.student = { role: "student", program_id: null, email: "fonz.morris@wearebgc.org.evil.test" };
    await expect(requireManager()).rejects.toThrow("Not authorized");
  });
});

describe("preview as student blocks mutations", () => {
  it.each(["admin", "instructor", "super_admin"])("%s previewing is blocked", async (role) => {
    st.student = { role, program_id: "progA", email: "x@example.test" };
    st.preview = "some-track";
    await expect(requireCapability("access_admin_panel")).rejects.toThrow("Exit student preview");
  });

  it("multi-course preview cookie also blocks", async () => {
    st.preview = "t1,t2";
    await expect(requireAdmin()).rejects.toThrow("Exit student preview");
  });

  it("an empty or comma-only preview cookie does not block", async () => {
    st.preview = " , ";
    await expect(requireAdmin()).resolves.toBeTruthy();
  });

  it("a student-role caller fails on capability before preview matters", async () => {
    st.student = { role: "student", program_id: null, email: "s@example.test" };
    st.preview = "t";
    await expect(requireAdmin()).rejects.toThrow("Not authorized");
  });

  it("the master is also blocked while previewing (real restriction)", async () => {
    st.student = { role: "super_admin", program_id: null, email: "fonz.morris@wearebgc.org" };
    st.preview = "t";
    await expect(requireAdmin()).rejects.toThrow("Exit student preview");
  });
});

describe("program boundary helpers", () => {
  const admin = { role: "admin", programId: "progA", grants: [] as never[] };

  it("resolveProgramForActor allows own program, rejects another, passes super_admin and master", async () => {
    await expect(resolveProgramForActor(admin, svc(), "a")).resolves.toBe("progA");
    await expect(resolveProgramForActor(admin, svc(), "b")).rejects.toThrow("Not authorized for this program");
    await expect(resolveProgramForActor({ ...admin, role: "super_admin" }, svc(), "b")).resolves.toBe("progB");
    await expect(resolveProgramForActor({ ...admin, isMaster: true }, svc(), "b")).resolves.toBe("progB");
  });

  it("a cross-program grant opens exactly the granted program", async () => {
    const granted = { ...admin, grants: [{ programId: "progB", role: "instructor" as const, trackSlug: null }] };
    await expect(resolveProgramForActor(granted, svc(), "b")).resolves.toBe("progB");
  });

  it("an unknown program slug throws", async () => {
    await expect(resolveProgramForActor(admin, svc(), "zzz")).rejects.toThrow("Program not found");
  });

  it("assertStudentInActorProgram rejects other-program, null-program and missing students", async () => {
    st.studentRow = { program_id: "progA" };
    await expect(assertStudentInActorProgram(admin, svc(), "target")).resolves.toBeUndefined();
    st.studentRow = { program_id: "progB" };
    await expect(assertStudentInActorProgram(admin, svc(), "target")).rejects.toThrow("Not authorized for this student");
    st.studentRow = { program_id: null };
    await expect(assertStudentInActorProgram(admin, svc(), "target")).rejects.toThrow();
    st.studentRow = null;
    await expect(assertStudentInActorProgram(admin, svc(), "target")).rejects.toThrow();
    await expect(assertStudentInActorProgram({ ...admin, role: "super_admin" }, svc(), "target")).resolves.toBeUndefined();
  });

  it("assertTrackInActorProgram: builder track owned by another program is rejected", async () => {
    st.trackOwner = { program_id: "progB" };
    await expect(assertTrackInActorProgram(admin, svc(), "builder-track-xyz")).rejects.toThrow("Not authorized for this track");
    st.trackOwner = { program_id: "progA" };
    await expect(assertTrackInActorProgram(admin, svc(), "builder-track-xyz")).resolves.toBeUndefined();
    st.trackOwner = null;
    await expect(assertTrackInActorProgram(admin, svc(), "builder-track-xyz")).rejects.toThrow();
  });

  it("a track-scoped grant narrows to the named course", async () => {
    const scoped = { role: "instructor", programId: null, grants: [{ programId: "progB", role: "instructor" as const, trackSlug: "only-this" }] };
    st.trackOwner = { program_id: "progB" };
    await expect(assertTrackInActorProgram(scoped, svc(), "only-this")).resolves.toBeUndefined();
    await expect(assertTrackInActorProgram(scoped, svc(), "other-one")).rejects.toThrow("Not authorized for this track");
  });

  it("assertLandingPageInActorProgram: platform pages are out of reach for program admins", () => {
    expect(() => assertLandingPageInActorProgram(admin, { program_id: null })).toThrow();
    expect(() => assertLandingPageInActorProgram(admin, { program_id: "progB" })).toThrow();
    expect(() => assertLandingPageInActorProgram(admin, { program_id: "progA" })).not.toThrow();
    expect(() => assertLandingPageInActorProgram({ ...admin, role: "super_admin" }, { program_id: null })).not.toThrow();
  });

  it("allowedProgramIdsForActor is null only for super_admin/master", () => {
    expect(allowedProgramIdsForActor({ role: "super_admin", programId: null })).toBeNull();
    expect(allowedProgramIdsForActor({ role: "admin", programId: null, isMaster: true })).toBeNull();
    expect(allowedProgramIdsForActor({ role: "admin", programId: null })).toEqual([]);
  });
});
