import "server-only";
import { requireManager } from "@/app/dashboard/admin/actions-shared";
import { allowedProgramIds, allowedTrackSlugs } from "@/lib/auth/program-access";
import { getHomeProgramForTrack } from "@/lib/programs";
import { resolveScopeTrackSlugs } from "@/lib/programs/scope";
import { buildMvpSchedule, type MvpScheduleInput } from "./schedule";
import { parseMvpReviewDecision, parseMvpReviewScope, type MvpReviewDecision, type MvpReviewScope } from "./attendance-finalization";
import type { MvpAttendanceReview } from "./attendance-verification";

export type MvpSavedReview = MvpAttendanceReview & { supersedes_id: string | null; review_reason: string | null };

// Reauthorize each operation, including corrections and history reads. An
// instructor grant cannot borrow a home-program admin's write permission.
async function authorize(decision: MvpReviewScope) {
  const actor = await requireManager();
  if (!["admin", "super_admin"].includes(actor.role)) throw new Error("MVP review access is required.");
  const grants = actor.grants.filter(grant => grant.role === "admin");
  if (actor.role !== "super_admin") {
    const tracks = allowedTrackSlugs(actor.programId, grants, decision.programId);
    if (!allowedProgramIds(actor.programId, grants).includes(decision.programId) ||
        (tracks !== null && !tracks.includes(decision.courseSlug))) throw new Error("MVP review access is required.");
  }
  const program = await actor.svc.from("programs").select("slug").eq("id", decision.programId).single();
  if (program.error || !program.data) throw new Error("Unable to verify review program.");
  const slugs = await resolveScopeTrackSlugs({ ids: [decision.programId], slugs: [program.data.slug] });
  if (!slugs.includes(decision.courseSlug)) throw new Error("Course is not in the selected program.");
  // Current enrollment establishes the scoped learner, not historical eligibility.
  // That separate staff attestation and its evidence reference are mandatory.
  const roster = await actor.svc.from("student_tracks").select("id")
    .eq("program_id", decision.programId).eq("track_slug", decision.courseSlug)
    .eq("student_id", decision.learnerId).limit(1);
  if (roster.error || !roster.data?.length) throw new Error("Unable to verify the learner's enrollment.");
  return actor;
}

// Independently resolve the canonical schedule. Missing settings fail closed;
// elapsed dates alone do not prove delivery, and optional extras never qualify.
async function verifyHeldSession(actor: Awaited<ReturnType<typeof authorize>>, decision: MvpReviewDecision, asOf: Date) {
  const home = getHomeProgramForTrack(decision.courseSlug);
  const base = home?.tracks.find(track => track.slug === decision.courseSlug);
  let ownerId = decision.programId;
  if (home) {
    const owner = await actor.svc.from("programs").select("id").eq("slug", home.slug).single();
    if (owner.error || !owner.data) throw new Error("Unable to verify schedule owner.");
    ownerId = owner.data.id;
  }
  const columns = "start_date, total_weeks, sessions_per_week, last_session_day_offset, unit_label, week_summaries, self_paced";
  const result = await actor.svc.from("track_overrides").select(columns).eq("program_id", ownerId).eq("track_slug", decision.courseSlug).maybeSingle();
  if (result.error) throw new Error("Unable to verify schedule.");
  const o = result.data;
  const startDate = o?.start_date ?? base?.startDate;
  const totalWeeks = o?.total_weeks ?? base?.totalWeeks;
  const sessionsPerWeek = o?.sessions_per_week ?? base?.sessionsPerWeek;
  const lastSessionDayOffset = o?.last_session_day_offset ?? base?.lastSessionDayOffset;
  const track: MvpScheduleInput["track"] = startDate && totalWeeks != null && sessionsPerWeek != null && lastSessionDayOffset != null ? {
    slug: decision.courseSlug, name: decision.courseSlug, shortName: decision.courseSlug,
    startDate, totalWeeks, sessionsPerWeek, lastSessionDayOffset,
    startDateTbd: o?.start_date ? false : base?.startDateTbd,
    selfPaced: o?.self_paced ?? base?.selfPaced, unitLabel: o?.unit_label ?? base?.unitLabel,
    weekSummaries: o?.week_summaries ?? base?.weekSummaries ?? [],
  } : null;
  const schedule = buildMvpSchedule({ track, asOf, verifiedStartSessions: null, confirmedHeldSessions: null });
  if (!schedule.scheduledRequiredSessions?.some(slot => slot.weekNumber === decision.weekNumber && slot.sessionNumber === decision.sessionNumber) ||
      Date.parse(decision.heldAt) > asOf.getTime()) throw new Error("Only required sessions already held can be reviewed.");
  // Session content is keyed by course slug, not its potentially stale program stamp.
  const delivery = await actor.svc.from("session_content").select("status, status_2, status_3")
    .eq("track", decision.courseSlug).eq("week_number", decision.weekNumber).limit(2);
  const field = (["status", "status_2", "status_3"] as const)[decision.sessionNumber - 1];
  if (delivery.error || delivery.data?.length !== 1 || delivery.data[0][field] !== "completed") {
    throw new Error("Session delivery must be verified without conflicting records.");
  }
  if (decision.outcome === "absent") {
    const attendance = await actor.svc.from("attendance").select("id")
      .eq("track", decision.courseSlug).eq("student_id", decision.learnerId)
      .eq("week_number", decision.weekNumber).eq("session_number", decision.sessionNumber).limit(1);
    if (attendance.error || attendance.data?.length) throw new Error("Resolve conflicting or unavailable check-in evidence before confirming absence.");
  }
}

// One save finalizes one learner/session decision. Later saves append a linked
// correction. Database time and authenticated actor identify every audit entry.
export async function finalizeMvpAttendanceReview(input: unknown): Promise<MvpSavedReview> {
  const decision = parseMvpReviewDecision(input);
  const actor = await authorize(decision);
  await verifyHeldSession(actor, decision, new Date());
  const result = await actor.svc.rpc("finalize_mvp_attendance_review", { p_decision: decision, p_actor: actor.userId });
  if (result.error?.code === "40001") throw new Error("Attendance review changed. Reload before saving your correction.");
  if (result.error || !result.data) throw new Error("Attendance review was not saved.");
  return result.data as MvpSavedReview;
}

// Complete per-learner/session audit history; unknown/missing migration errors
// do not masquerade as an empty history. The original reviews remain intact.
export async function readMvpAttendanceReviewHistory(input: unknown): Promise<MvpSavedReview[]> {
  const decision = parseMvpReviewScope(input);
  const actor = await authorize(decision);
  const history: MvpSavedReview[] = [];
  let cursor = 0;
  while (true) {
    const result = await actor.svc.from("mvp_attendance_reviews").select("*")
      .eq("program_id", decision.programId).eq("track_slug", decision.courseSlug).eq("student_id", decision.learnerId)
      .eq("week_number", decision.weekNumber).eq("session_number", decision.sessionNumber)
      .gt("revision", cursor).order("revision").limit(500);
    if (result.error || !Array.isArray(result.data)) throw new Error("Unable to load attendance review history.");
    if (!result.data.length) return history;
    const next = result.data[result.data.length - 1].revision;
    if (!Number.isSafeInteger(next) || next <= cursor) throw new Error("Review history pagination did not advance.");
    history.push(...result.data as MvpSavedReview[]);
    cursor = next;
  }
}
