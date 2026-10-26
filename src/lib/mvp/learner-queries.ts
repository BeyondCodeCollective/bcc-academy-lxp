import "server-only";
import { getSessionContext } from "@/lib/auth/session";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";
import { allowedProgramIds, allowedTrackSlugs, type ProgramGrant } from "@/lib/auth/program-access";
import { canViewMvp, canManageStudents } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";

export type LearnerProgramScope = {
  id: string; name: string; slug: string;
  // null means program-wide access; never interpret [] as unrestricted.
  courseSlugs: string[] | null;
};

// Access foundation only. No learner records are loaded yet, and this module
// is not an API route or a client-callable server action. Future roster queries
// belong after these checks in this entry point, not behind client-supplied scope.
export async function getMvpLearnersData(params: { programId?: string | string[] } = {}) {
  const context = await getSessionContext();
  const role = context?.student?.role ?? "student";
  if (!context?.userId || !canViewMvp(role) || !canManageStudents(role) || await isPreviewingAsStudent(role)) {
    throw new Error("Learner access is required.");
  }
  if (Array.isArray(params.programId) || (params.programId !== undefined && typeof params.programId !== "string")) {
    throw new Error("Choose one program.");
  }
  const requested = params.programId?.trim() || null;
  const db = createServiceClient();
  let homeId: string | null = null;
  const grants: ProgramGrant[] = [];
  if (role !== "super_admin") {
    const home = await db.from("students").select("program_id").eq("id", context.userId).single();
    if (home.error || !home.data || (home.data.program_id !== null && typeof home.data.program_id !== "string")) throw new Error("Unable to verify learner access.");
    homeId = home.data.program_id;
    let cursor: string | null = null;
    while (true) {
      let query = db.from("staff_program_access").select("id, program_id, role, track_slug")
        .eq("student_id", context.userId).order("id").limit(500);
      if (cursor) query = query.gt("id", cursor);
      const { data, error } = await query;
      if (error || !Array.isArray(data)) throw new Error("Unable to verify learner access.");
      if (!data.length) break;
      for (const row of data) {
        if (typeof row.id !== "string" || typeof row.program_id !== "string" || !["admin", "instructor"].includes(row.role) || (row.track_slug !== null && typeof row.track_slug !== "string")) throw new Error("Unable to verify learner access.");
        // Instructor grants cannot broaden an admin course grant.
        if (canViewMvp(row.role) && canManageStudents(row.role)) grants.push({ programId: row.program_id, role: row.role, trackSlug: row.track_slug });
      }
      const next: string = data[data.length - 1].id;
      if (!next || (cursor !== null && next <= cursor)) throw new Error("Learner access pagination did not advance.");
      cursor = next;
    }
  }
  const allowed = allowedProgramIds(homeId, grants);
  if (role !== "super_admin" && requested && !allowed.includes(requested)) throw new Error("The selected program is unavailable.");
  const programs: LearnerProgramScope[] = [];
  let cursor: string | null = null;
  if (role === "super_admin" || allowed.length) while (true) {
    let query = db.from("programs").select("id, name, slug").order("id").limit(500);
    if (role !== "super_admin") query = query.in("id", allowed);
    if (requested) query = query.eq("id", requested);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error || !Array.isArray(data)) throw new Error("Unable to load authorized learner programs.");
    if (!data.length) break;
    for (const row of data) {
      if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.slug !== "string" || (role !== "super_admin" && !allowed.includes(row.id)) || (requested && row.id !== requested)) throw new Error("Unable to load authorized learner programs.");
      programs.push({ id: row.id, name: row.name, slug: row.slug, courseSlugs: role === "super_admin" ? null : allowedTrackSlugs(homeId, grants, row.id) });
    }
    const next: string = data[data.length - 1].id;
    if (!next || (cursor !== null && next <= cursor)) throw new Error("Learner program pagination did not advance.");
    cursor = next;
  }
  if (requested && !programs.some(program => program.id === requested)) throw new Error("The selected program is unavailable.");
  return { state: "scope_ready" as const, programs, selectedProgramId: requested, directory: null };
}
