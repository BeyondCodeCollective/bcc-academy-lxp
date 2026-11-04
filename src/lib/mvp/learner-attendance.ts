import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { loadMvpAttendanceReviews } from "./attendance-review-queries";
import { verifyMvpMissedSessions } from "./attendance-verification";
import type { MvpAttendanceRecord, MvpSessionSlot } from "./milestones";

type Learner = { id: string; enrollments: { programId: string; courseSlug: string }[] };
type Result = { attendance: { present: number; eligibleHeld: number } | null; attendanceUnavailableReason: string | null };

// Internal only. Both directory and schedules must come from the authorized loader.
// Raw reviews (including eligibility basis and staff identity) never leave this layer.
export async function loadLearnerAttendance<T extends Learner>(
  db: ReturnType<typeof createServiceClient>, directory: T[],
  heldByOffering: ReadonlyMap<string, { slots: MvpSessionSlot[] | null; reason: string | null }>, asOf: Date,
): Promise<Array<Omit<T, "enrollments"> & { enrollments: Array<Omit<T["enrollments"][number], keyof Result> & Result> }>> {
  const offerings = new Map<string, { programId: string; courseSlug: string; ids: Set<string> }>();
  for (const learner of directory) for (const enrollment of learner.enrollments) {
    const key = JSON.stringify([enrollment.programId, enrollment.courseSlug]);
    const offering = offerings.get(key) ?? { ...enrollment, ids: new Set<string>() };
    offering.ids.add(learner.id); offerings.set(key, offering);
  }
  const results = new Map<string, Map<string, Result>>();
  for (const [key, { programId, courseSlug, ids }] of offerings) {
    const schedule = heldByOffering.get(key);
    const byLearner = new Map<string, Result>();
    results.set(key, byLearner);
    if (!schedule?.slots?.length) {
      for (const id of ids) byLearner.set(id, { attendance: schedule?.slots ? { present: 0, eligibleHeld: 0 } : null,
        attendanceUnavailableReason: schedule?.slots ? null : schedule?.reason ?? "Verified course schedule is unavailable." });
      continue;
    }
    const selected = [...ids];
    for (let offset = 0; offset < selected.length; offset += 100) {
      const batch = selected.slice(offset, offset + 100);
      const reviews = await loadMvpAttendanceReviews(db, programId, courseSlug, batch);
      const attendance: MvpAttendanceRecord[] = [];
      let cursor: string | null = null;
      while (true) {
        // Check-ins identify learner + course, not a historical program enrollment.
        let query = db.from("attendance").select("id,student_id,track,week_number,session_number,checked_in_at")
          .eq("track", courseSlug).in("student_id", batch).order("id").limit(500);
        if (cursor !== null) query = query.gt("id", cursor);
        const { data, error } = await query;
        if (error || !Array.isArray(data)) throw new Error("Unable to load complete learner attendance.");
        if (!data.length) break;
        const next: unknown = data[data.length - 1].id;
        if (typeof next !== "string" || !next || (cursor !== null && next <= cursor)) throw new Error("Learner attendance pagination did not advance.");
        attendance.push(...data as MvpAttendanceRecord[]); cursor = next;
      }
      for (const learnerId of batch) {
        const verified = verifyMvpMissedSessions({ programId, courseSlug, learnerId, heldRequiredSessions: schedule.slots, reviews, attendance, asOf });
        byLearner.set(learnerId, { attendance: verified.finalizedAttendance
          ? { present: verified.finalizedAttendance.attended, eligibleHeld: verified.finalizedAttendance.held } : null,
        attendanceUnavailableReason: verified.finalizedAttendance ? null : verified.unavailableReason ?? "Excused or ineligible sessions require a configured denominator policy." });
      }
    }
  }
  return directory.map(learner => ({ ...learner, enrollments: learner.enrollments.map(enrollment => ({
    ...(enrollment as T["enrollments"][number]),
    ...results.get(JSON.stringify([enrollment.programId, enrollment.courseSlug]))!.get(learner.id)!,
  })) }));
}
