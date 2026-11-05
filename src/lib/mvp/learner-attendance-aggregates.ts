import "server-only";
import type { MvpAttendanceSessionState } from "./attendance-verification";
import type { LearnerChartData } from "./learner-chart-data";
import { MVP_MINIMUM_GROUP_SIZE } from "./privacy";

type State = MvpAttendanceSessionState["state"];
export type AttendanceSessionAggregate = {
  programId: string; courseSlug: string; weekNumber: number; sessionNumber: number;
  // Matching learners, NOT an attendance-rate denominator. Includes excused
  // and not-eligible learners; neither is silently counted as absent.
  total: number;
  counts: Record<State, number>;
};
type Learner = { id: string; enrollments: {
  programId: string; courseSlug: string;
  attendanceSessions: MvpAttendanceSessionState[] | null;
}[] };

// Internal only: input must be the complete authorized, status-filtered roster,
// with verified held-required-session evidence, before directory pagination.
export function aggregateLearnerAttendance(learners: Learner[]): LearnerChartData<AttendanceSessionAggregate> {
  const groups = new Map<string, { row: AttendanceSessionAggregate; learners: Map<string, State> }>();
  const offeringSlots = new Map<string, string>();
  for (const learner of learners) for (const enrollment of learner.enrollments) {
    const sessions = enrollment.attendanceSessions;
    if (sessions === null) return { state: "unavailable" };
    const slots = new Set(sessions.map(s => JSON.stringify([s.weekNumber, s.sessionNumber])));
    const signature = JSON.stringify([...slots].sort());
    const offering = JSON.stringify([enrollment.programId, enrollment.courseSlug]);
    const previous = offeringSlots.get(offering);
    // Partial evidence must not shrink a session's matching population.
    if (previous !== undefined && previous !== signature) return { state: "unavailable" };
    offeringSlots.set(offering, signature);
    for (const session of sessions) {
      if (![session.weekNumber, session.sessionNumber].every(n => Number.isSafeInteger(n) && n > 0)) return { state: "unavailable" };
      const key = JSON.stringify([enrollment.programId, enrollment.courseSlug, session.weekNumber, session.sessionNumber]);
      let group = groups.get(key);
      if (!group) {
        group = { row: { programId: enrollment.programId, courseSlug: enrollment.courseSlug,
          weekNumber: session.weekNumber, sessionNumber: session.sessionNumber, total: 0,
          counts: { verified_present: 0, verified_absent: 0, excused: 0, unrecorded: 0, unresolved: 0, not_eligible: 0 } }, learners: new Map() };
        groups.set(key, group);
      }
      const prior = group.learners.get(learner.id);
      if (prior !== undefined && prior !== session.state) return { state: "unavailable" };
      if (prior === undefined) {
        group.learners.set(learner.id, session.state);
        group.row.total++;
        group.row.counts[session.state]++;
      }
    }
  }
  const rows = [...groups.values()].map(group => group.row).sort((a, b) =>
    a.programId.localeCompare(b.programId) || a.courseSlug.localeCompare(b.courseSlug) ||
    a.weekNumber - b.weekNumber || a.sessionNumber - b.sessionNumber);
  if (!rows.length) return { state: "empty" };
  // Suppress the whole chart, including labels/totals, so complementary cells
  // cannot reconstruct a withheld count. No learner identifiers leave here.
  if (rows.some(row => [row.total, ...Object.values(row.counts)].some(n => n > 0 && n < MVP_MINIMUM_GROUP_SIZE))) return { state: "suppressed" };
  return { state: "ready", rows };
}
