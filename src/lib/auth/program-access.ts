import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";

// Cross-program access grants (staff_program_access). See the migration for
// why these exist: without them, the only way to work across two programs was
// super_admin — a platform-wide tier handed out for what is really a
// two-program job.
//
// Reading model, in one place so every call site agrees:
//   - super_admin / master  → every program, every track (no grants needed)
//   - anyone with grants    → exactly the granted programs, at the granted
//                             role, narrowed to the granted tracks when the
//                             grant names one
//   - everyone else         → their own students.program_id, as before
export type ProgramGrant = {
  programId: string;
  role: "instructor" | "admin";
  // null = the whole program; a slug = that one course inside it.
  trackSlug: string | null;
};

/** Every grant held by one person. Deduped per request. */
export const getProgramGrants = cache(
  async (studentId: string): Promise<ProgramGrant[]> => {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("staff_program_access")
      .select("program_id, role, track_slug")
      .eq("student_id", studentId);
    if (error) {
      // Fail CLOSED on read errors — an empty grant list costs someone access
      // they should have; a permissive fallback would hand out a program.
      console.error("getProgramGrants error:", error.message);
      return [];
    }
    return (data ?? []).map((r) => ({
      programId: r.program_id as string,
      role: r.role as "instructor" | "admin",
      trackSlug: (r.track_slug as string | null) ?? null,
    }));
  },
);

/** The program ids a person may act in: their home stamp plus every grant. */
export function allowedProgramIds(
  homeProgramId: string | null,
  grants: ProgramGrant[],
): string[] {
  const ids = new Set<string>();
  if (homeProgramId) ids.add(homeProgramId);
  for (const g of grants) ids.add(g.programId);
  return [...ids];
}

/**
 * Track narrowing WITHIN one program. Returns null when the person sees the
 * whole program (their home program, or a grant with no track named), or the
 * list of track slugs their grants confine them to.
 *
 * A whole-program grant beats a track-scoped one, so adding a course-level
 * grant can never shrink access someone already has program-wide.
 */
export function allowedTrackSlugs(
  homeProgramId: string | null,
  grants: ProgramGrant[],
  programId: string,
): string[] | null {
  if (homeProgramId && programId === homeProgramId) return null;
  const forProgram = grants.filter((g) => g.programId === programId);
  if (forProgram.length === 0) return null; // not granted at all — callers gate on allowedProgramIds
  if (forProgram.some((g) => g.trackSlug === null)) return null;
  return forProgram.map((g) => g.trackSlug as string);
}

/**
 * The role a person effectively holds in one program. Their own role in their
 * home program; the granted role elsewhere. Used so a grant can't quietly
 * promote someone (an instructor granted a program stays an instructor there
 * unless the grant itself says admin).
 */
export function effectiveRoleInProgram(
  baseRole: string,
  homeProgramId: string | null,
  grants: ProgramGrant[],
  programId: string,
): string {
  if (homeProgramId && programId === homeProgramId) return baseRole;
  const forProgram = grants.filter((g) => g.programId === programId);
  if (forProgram.length === 0) return baseRole;
  return forProgram.some((g) => g.role === "admin") ? "admin" : "instructor";
}
