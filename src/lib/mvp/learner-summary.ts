import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { getHomeProgramForTrack } from "@/lib/programs";
import { calculateMvpSessionsRemaining } from "./sessions-remaining";
import { buildMvpSchedule, type MvpScheduleInput } from "./schedule";
import type { MvpSessionSlot } from "./milestones";
import type { MvpSessionDelivery } from "./course-performance";

type Learner = { id: string; enrollments: { programId: string; courseSlug: string }[] };
type Db = ReturnType<typeof createServiceClient>;
const overrideColumns = "id, start_date, total_weeks, sessions_per_week, unit_label, last_session_day_offset, week_summaries, self_paced";

async function loadOverride(db: Db, programId: string, courseSlug: string) {
  const { data, error } = await db.from("track_overrides").select(overrideColumns)
    .eq("program_id", programId).eq("track_slug", courseSlug).order("id").limit(2);
  if (error || !Array.isArray(data)) throw new Error("Unable to verify learner session schedule.");
  if (!data.length) return null;
  // Check the next cursor even when the server caps a response at one row.
  const first = data[0];
  if (typeof first.id !== "string" || !first.id) throw new Error("Invalid learner session schedule.");
  const next = await db.from("track_overrides").select("id")
    .eq("program_id", programId).eq("track_slug", courseSlug).gt("id", first.id).order("id").limit(1);
  if (next.error || !Array.isArray(next.data)) throw new Error("Unable to verify learner session schedule.");
  if (data.length > 1 || next.data.length) throw new Error("Ambiguous learner session schedule.");
  return first;
}

// Internal only: matching must be the complete authorized and filtered roster,
// before sorting/pagination. Count session opportunities once per program/course,
// never once per learner. Current cohort links do not establish a cohort schedule.
export async function loadLearnerSessionContext(db: Db, matching: readonly Learner[], asOf = new Date()) {
  const heldByOffering = new Map<string, { slots: MvpSessionSlot[] | null; reason: string | null }>();
  const totalEnrolled = new Set(matching.map(learner => learner.id)).size;
  const offerings = new Map(matching.flatMap(learner => learner.enrollments.map(enrollment =>
    [JSON.stringify([enrollment.programId, enrollment.courseSlug]), enrollment] as const)));
  let sessionsHeld = 0;
  const reasons = new Set<string>();
  const deliveryByCourse = new Map<string, MvpSessionDelivery[]>();
  for (const { programId, courseSlug } of offerings.values()) {
    // Match the dashboard's canonical owner/override resolution, including shared
    // courses and DB-only builder courses. Owner reads contain schedule metadata only.
    const home = getHomeProgramForTrack(courseSlug);
    const base = home?.tracks.find(track => track.slug === courseSlug);
    let ownerId = programId;
    if (home) {
      const owner = await db.from("programs").select("id").eq("slug", home.slug).single();
      if (owner.error || !owner.data || typeof owner.data.id !== "string") throw new Error("Unable to resolve learner schedule ownership.");
      ownerId = owner.data.id;
    }
    let override = await loadOverride(db, ownerId, courseSlug);
    if (!override && ownerId !== programId) override = await loadOverride(db, programId, courseSlug);
    const startDate = override?.start_date ?? base?.startDate;
    const totalWeeks = override?.total_weeks ?? base?.totalWeeks;
    const sessionsPerWeek = override?.sessions_per_week ?? base?.sessionsPerWeek;
    const lastSessionDayOffset = override?.last_session_day_offset ?? base?.lastSessionDayOffset;
    const track: MvpScheduleInput["track"] = startDate && totalWeeks != null && sessionsPerWeek != null && lastSessionDayOffset != null ? {
      slug: courseSlug, name: courseSlug, shortName: courseSlug, startDate, totalWeeks, sessionsPerWeek, lastSessionDayOffset,
      startDateTbd: override?.start_date ? false : base?.startDateTbd,
      unitLabel: override?.unit_label ?? base?.unitLabel,
      weekSummaries: override?.week_summaries ?? base?.weekSummaries ?? [],
      selfPaced: override?.self_paced ?? base?.selfPaced,
    } : null;
    let delivery = deliveryByCourse.get(courseSlug);
    if (!delivery) {
      delivery = [];
      let cursor: string | null = null;
      while (true) {
        let query = db.from("session_content").select("id, week_number, status, status_2, status_3")
          .eq("track", courseSlug).order("id").limit(500);
        if (cursor) query = query.gt("id", cursor);
        const { data, error } = await query;
        if (error || !Array.isArray(data)) throw new Error("Unable to verify delivered learner sessions.");
        if (!data.length) break;
        const next: unknown = data[data.length - 1].id;
        if (typeof next !== "string" || !next || (cursor !== null && next <= cursor)) throw new Error("Learner session pagination did not advance.");
        delivery.push(...data);
        cursor = next;
      }
      deliveryByCourse.set(courseSlug, delivery);
    }
    const result = calculateMvpSessionsRemaining(track, delivery, asOf);
    const confirmed = delivery.flatMap(row => [row.status, row.status_2, row.status_3].flatMap((status, index) =>
      status === "completed" ? [{ weekNumber: row.week_number, sessionNumber: index + 1, label: `Session ${row.week_number}.${index + 1}` }] : []));
    const slots = result.delivered === null ? null : buildMvpSchedule({ track, asOf, verifiedStartSessions: null, confirmedHeldSessions: confirmed }).heldRequiredSessions;
    heldByOffering.set(JSON.stringify([programId, courseSlug]), { slots, reason: result.unavailableReason });
    if (result.delivered === null) reasons.add(result.unavailableReason ?? "Verified session delivery is unavailable.");
    else sessionsHeld += result.delivered;
  }
  return { heldByOffering, summary: {
    totalEnrolled,
    sessionsHeld: reasons.size ? null : sessionsHeld,
    sessionsHeldUnavailableReason: reasons.size ? [...reasons].join(" ") : null,
    asOf: asOf.toISOString(),
  } };
}

export async function loadLearnerSummary(db: Db, matching: readonly Learner[], asOf = new Date()) {
  return (await loadLearnerSessionContext(db, matching, asOf)).summary;
}
