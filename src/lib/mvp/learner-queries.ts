import "server-only";
import { getSessionContext } from "@/lib/auth/session";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";
import { allowedProgramIds, allowedTrackSlugs, type ProgramGrant } from "@/lib/auth/program-access";
import { canViewMvp, canManageStudents } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { loadLearnerOptions } from "./learner-options";
import { loadLearnerRoster, parseLearnerQuery, type LearnerQueryParams } from "./learner-roster";
import { paginateLearners, parseLearnerPagination } from "./learner-pagination";
import { parseLearnerSort, sortLearners } from "./learner-sort";
import { loadLearnerProgress } from "./learner-progress";
import { loadLearnerActivity } from "./learner-activity";
import { loadLearnerSessionContext } from "./learner-summary";
import { loadLearnerAttendance } from "./learner-attendance";
import { evaluateLearnerCheckIns } from "./learner-check-ins";
import { aggregateLearnerAttendance } from "./learner-attendance-aggregates";

export type LearnerProgramScope = {
  id: string; name: string; slug: string;
  // null means program-wide access; never interpret [] as unrestricted.
  courseSlugs: string[] | null;
};

// Server-only entry point. Every roster request rechecks access; no caller can
// supply a trusted scope or bypass student-preview restrictions.
async function loadAuthorizedLearnerContext(params: LearnerQueryParams = {}) {
  const context = await getSessionContext();
  const role = context?.student?.role ?? "student";
  if (!context?.userId || !canViewMvp(role) || !canManageStudents(role) || await isPreviewingAsStudent(role)) {
    throw new Error("Learner access is required.");
  }
  if (Array.isArray(params.programId) || (params.programId !== undefined && typeof params.programId !== "string")) {
    throw new Error("Choose one program.");
  }
  const requested = params.programId?.trim() || null;
  const filters = parseLearnerQuery(params);
  const requestedPage = parseLearnerPagination(params);
  const sorting = parseLearnerSort(params);
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
  const options = await loadLearnerOptions(db, programs);
  return { db, programs, options, filters, requestedPage, sorting, requested };
}

// Options-only page entry point: rechecks access/preview mode, but never reads
// the learner roster or activity. No caller-supplied permission scope is trusted.
export async function getMvpLearnerFilterOptions() {
  return (await loadAuthorizedLearnerContext()).options;
}

export async function getMvpLearnersData(params: LearnerQueryParams = {}) {
  const { db, programs, options, filters, requestedPage, sorting, requested } = await loadAuthorizedLearnerContext(params);
  const matching = await loadLearnerRoster(db, options, filters);
  const asOf = new Date();
  const sessionContext = await loadLearnerSessionContext(db, matching, asOf);
  // The check-in count and status filters require complete scoped evidence.
  // Batch loaders must finish before counting; only the returned directory is paginated.
  const activity = await loadLearnerActivity(db, matching, asOf);
  const attendance = await loadLearnerAttendance(db, activity, sessionContext.heldByOffering, asOf);
  const evaluated = evaluateLearnerCheckIns(attendance, programs, asOf);
  const filtered = filters.status === "all" ? evaluated : evaluated.map(learner => ({ ...learner,
    enrollments: learner.enrollments.filter(enrollment => enrollment.status === filters.status),
  })).filter(learner => learner.enrollments.length > 0);
  const needsCheckIn = new Set(filtered.filter(learner => learner.enrollments.some(enrollment =>
    enrollment.status === "needs_check_in" && enrollment.checkIn.attentionFlags.length > 0)).map(learner => learner.id)).size;
  const page = paginateLearners(sortLearners(filtered, sorting), requestedPage);
  const directory = await loadLearnerProgress(page.directory, programs);
  const summary = { ...(filters.status === "all" ? sessionContext.summary : (await loadLearnerSessionContext(db, filtered, asOf)).summary), needsCheckIn };
  const attendanceBySession = aggregateLearnerAttendance(filtered);
  return { state: "directory_ready" as const, programs, options, filters, sorting, selectedProgramId: requested, directory, pagination: page.pagination, summary, attendanceBySession };
}
