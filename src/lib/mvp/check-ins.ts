import { evaluateMvpAttention, type MvpAttentionResult } from "./attention";
import type { MvpAttendanceRecord, MvpSessionSlot } from "./milestones";

// Current storage records positive check-ins but does not certify absences.
// The result explicitly identifies why a learner cannot yet be evaluated.
export type MvpCheckInEvaluation = MvpAttentionResult & {
  learnerId: string;
  programRowId: string;
  unavailableReason: string | null;
};

export function evaluateMvpCourseCheckIns(
  programRowId: string,
  courseSlug: string,
  learnerIds: string[],
  attendance: MvpAttendanceRecord[],
  heldRequiredSessions: MvpSessionSlot[] | null,
  asOf: Date,
): { evaluations: MvpCheckInEvaluation[]; learnersNeedingCheckIn: number | null } {
  const required = new Set((heldRequiredSessions ?? []).map((slot) => `${slot.weekNumber}:${slot.sessionNumber}`));
  const roster = [...new Set(learnerIds)];
  const attended = new Map(roster.map((id) => [id, new Set<string>()]));
  for (const record of attendance) {
    if (record.track === courseSlug) {
      attended.get(record.student_id)?.add(`${record.week_number}:${record.session_number}`);
    }
  }

  // A full set of positive records establishes zero missed sessions for this
  // evaluated subset. Otherwise absence verification remains unavailable.
  const evaluations = roster.map((learnerId): MvpCheckInEvaluation => {
    const allAttended = required.size > 0 && [...required].every((slot) => attended.get(learnerId)!.has(slot));
    const result = evaluateMvpAttention(learnerId, programRowId, [
      { id: "framework-missed-sessions-v1", reason: "missed_sessions", threshold: 2 },
    ], { missed_sessions: { value: allAttended ? 0 : null, evidence: [] } }, asOf);
    return {
      ...result, learnerId, programRowId,
      unavailableReason: allAttended ? null : required.size === 0
        ? "No verified required sessions are available for evaluation."
        : "Missing check-ins cannot establish absences without attendance finalization and enrollment eligibility history.",
    };
  });
  return {
    evaluations,
    learnersNeedingCheckIn: evaluations.some((item) => item.checkInStatus === "not_evaluated")
      ? null : evaluations.filter((item) => item.checkInStatus === "flagged").length,
  };
}
