import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { createMvpScheduleLoader } from "./schedule-loader";
import { resolveMvpHeldSessions } from "./held-sessions";
import type { MvpSessionSlot } from "./milestones";
import { mapLimit, MVP_DB_CONCURRENCY } from "./concurrency";

type Learner = { id: string; enrollments: { programId: string; courseSlug: string }[] };
// Internal only: matching must be the complete authorized and filtered roster,
// before sorting/pagination. Count session opportunities once per program/course,
// never once per learner. Current cohort links do not establish a cohort schedule.
export async function loadLearnerSessionContext(db: ReturnType<typeof createServiceClient>, matching: readonly Learner[], asOf = new Date()) {
  const heldByOffering = new Map<string, { slots: MvpSessionSlot[] | null; reason: string | null; sessionsHeld: number | null }>();
  const offerings = new Map(matching.flatMap(learner => learner.enrollments.map(enrollment =>
    [JSON.stringify([enrollment.programId, enrollment.courseSlug]), enrollment] as const)));
  // Offerings resolve in parallel; a shared course's delivery is read once and awaited by each.
  const loadSchedule = createMvpScheduleLoader(db);
  await mapLimit([...offerings.values()], MVP_DB_CONCURRENCY, async ({ programId, courseSlug }) => {
    const schedule = await loadSchedule(programId, courseSlug);
    const track = schedule.track;
    const delivery = await schedule.delivery();
    const result = resolveMvpHeldSessions(track, delivery, asOf);
    const slots = result.heldRequiredSessions;
    heldByOffering.set(JSON.stringify([programId, courseSlug]), { slots, reason: result.unavailableReason, sessionsHeld: result.delivered });
  });
  return { heldByOffering, summary: summarizeLearnerSessionContext(matching, heldByOffering, asOf) };
}

// Reuse this request's authorized offering context after status filtering.
// Missing context is unknown, never zero; each remaining offering counts once.
export function summarizeLearnerSessionContext(matching: readonly Learner[],
  heldByOffering: ReadonlyMap<string, { sessionsHeld: number | null; reason: string | null }>, asOf: Date) {
  const keys = new Set(matching.flatMap(learner => learner.enrollments.map(e => JSON.stringify([e.programId, e.courseSlug]))));
  let sessionsHeld = 0;
  const reasons = new Set<string>();
  for (const key of keys) {
    const offering = heldByOffering.get(key);
    if (!offering || offering.sessionsHeld === null) reasons.add(offering?.reason ?? "Verified session delivery is unavailable.");
    else sessionsHeld += offering.sessionsHeld;
  }
  return {
    totalEnrolled: new Set(matching.map(learner => learner.id)).size,
    sessionsHeld: reasons.size ? null : sessionsHeld,
    sessionsHeldUnavailableReason: reasons.size ? [...reasons].join(" ") : null,
    asOf: asOf.toISOString(),
  };
}

export async function loadLearnerSummary(db: ReturnType<typeof createServiceClient>, matching: readonly Learner[], asOf = new Date()) {
  return (await loadLearnerSessionContext(db, matching, asOf)).summary;
}
