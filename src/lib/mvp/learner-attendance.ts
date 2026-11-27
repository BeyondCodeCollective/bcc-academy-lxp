import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { loadMvpAttendanceReviews } from "./attendance-review-queries";
import { verifyMvpMissedSessions, type MvpAttendanceSessionState } from "./attendance-verification";
import { calculateAttendanceMilestone, type MvpAttendanceRecord, type MvpSessionSlot } from "./milestones";
import { mapLimit, MVP_DB_CONCURRENCY } from "./concurrency";

type Learner = { id: string; enrollments: { programId: string; courseSlug: string }[] };
type Result = { hasStartEvidence: boolean | null; attendance: { present: number; eligibleHeld: number } | null; attendanceUnavailableReason: string | null;
  attendanceSessions: MvpAttendanceSessionState[] | null };

// Internal only. Both directory and schedules must come from the authorized loader.
// Raw reviews (including eligibility basis and staff identity) never leave this layer.
export async function loadLearnerAttendance<T extends Learner>(
  db: ReturnType<typeof createServiceClient>, directory: T[],
  heldByOffering: ReadonlyMap<string, { slots: MvpSessionSlot[] | null; startSlots?: MvpSessionSlot[] | null; reason: string | null }>, asOf: Date,
): Promise<Array<Omit<T, "enrollments"> & { enrollments: Array<Omit<T["enrollments"][number], keyof Result> & Result> }>> {
  const offerings = new Map<string, { programId: string; courseSlug: string; ids: Set<string> }>();
  for (const learner of directory) for (const enrollment of learner.enrollments) {
    const key = JSON.stringify([enrollment.programId, enrollment.courseSlug]);
    const offering = offerings.get(key) ?? { ...enrollment, ids: new Set<string>() };
    offering.ids.add(learner.id); offerings.set(key, offering);
  }
  const results = new Map<string, Map<string, Result>>();
  await mapLimit([...offerings], MVP_DB_CONCURRENCY, async ([key, { programId, courseSlug, ids }]) => {
    const schedule = heldByOffering.get(key);
    const byLearner = new Map<string, Result>();
    results.set(key, byLearner);
    if (!schedule?.slots?.length && !schedule?.startSlots?.length) {
      for (const id of ids) byLearner.set(id, { hasStartEvidence: schedule?.startSlots == null ? null : false, attendance: schedule?.slots ? { present: 0, eligibleHeld: 0 } : null,
        attendanceSessions: schedule?.slots ? [] : null,
        attendanceUnavailableReason: schedule?.slots ? null : schedule?.reason ?? "Verified course schedule is unavailable." });
      return;
    }
    const selected = [...ids];
    for (let offset = 0; offset < selected.length; offset += 100) {
      const batch = selected.slice(offset, offset + 100);
      const [reviews, attendance] = await Promise.all([schedule?.slots?.length ? loadMvpAttendanceReviews(db, programId, courseSlug, batch) : Promise.resolve([]), (async () => {
      const attendance: MvpAttendanceRecord[] = [];
      let cursor: string | null = null;
      while (true) {
        // Check-ins are tenant-scoped even when learner/course IDs are shared.
        let query = db.from("attendance").select("id,student_id,track,week_number,session_number,checked_in_at")
          .eq("program_id", programId).eq("track", courseSlug).in("student_id", batch).order("id").limit(500);
        if (cursor !== null) query = query.gt("id", cursor);
        const { data, error } = await query;
        if (error || !Array.isArray(data)) throw new Error("Unable to load complete learner attendance.");
        if (!data.length) break;
        const next: unknown = data[data.length - 1].id;
        if (typeof next !== "string" || !next || (cursor !== null && next <= cursor)) throw new Error("Learner attendance pagination did not advance.");
        attendance.push(...data as MvpAttendanceRecord[]); cursor = next;
      }
      return attendance;
      })()]);
      for (const learnerId of batch) {
        const verified = verifyMvpMissedSessions({ programId, courseSlug, learnerId, heldRequiredSessions: schedule?.slots ?? null, reviews, attendance, asOf });
        byLearner.set(learnerId, { hasStartEvidence: calculateAttendanceMilestone({
          learnerId, courseSlug, records: attendance, startSessions: schedule?.startSlots ?? null,
          heldRequiredSessions: schedule?.slots ?? null,
        }).hasStartEvidence, attendanceSessions: schedule?.slots?.length === 0 ? [] : verified.sessionStates, attendance: schedule?.slots?.length === 0 ? { present: 0, eligibleHeld: 0 } : verified.finalizedAttendance
          ? { present: verified.finalizedAttendance.attended, eligibleHeld: verified.finalizedAttendance.held } : null,
        attendanceUnavailableReason: schedule?.slots?.length === 0 || verified.finalizedAttendance ? null : verified.unavailableReason ?? "Verified attendance is unavailable." });
      }
    }
  });
  return directory.map(learner => ({ ...learner, enrollments: learner.enrollments.map(enrollment => ({
    ...(enrollment as T["enrollments"][number]),
    ...results.get(JSON.stringify([enrollment.programId, enrollment.courseSlug]))!.get(learner.id)!,
  })) }));
}
