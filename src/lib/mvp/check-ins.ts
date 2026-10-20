import { evaluateMvpAttention, type MvpAttentionResult } from "./attention";
import type { MvpAttendanceRecord, MvpSessionSlot } from "./milestones";
import { verifyMvpMissedSessions, type MvpAttendanceReview } from "./attendance-verification";
import type { MvpAdditionalSignals } from "./check-in-signals";

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
  verification?: { programId: string; reviews: readonly MvpAttendanceReview[] },
  additionalSignals: ReadonlyMap<string, MvpAdditionalSignals> = new Map(),
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
    if (verification) {
      const observation = verifyMvpMissedSessions({ programId: verification.programId, courseSlug, learnerId,
        heldRequiredSessions, reviews: verification.reviews, attendance, asOf });
      return { ...evaluateMvpAttention(learnerId, programRowId, [
        { id: "framework-missed-sessions-v1", reason: "missed_sessions", threshold: 2 },
      ], { missed_sessions: observation }, asOf), learnerId, programRowId, unavailableReason: observation.unavailableReason };
    }
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
  const combined = evaluations.map(item => {
    const additional = additionalSignals.get(item.learnerId);
    if (!additional?.rules.length) return item;
    const result = evaluateMvpAttention(item.learnerId, programRowId, additional.rules, additional.observations, asOf);
    const attentionFlags = [...item.attentionFlags, ...result.attentionFlags];
    const unevaluatedRuleIds = [...item.unevaluatedRuleIds, ...result.unevaluatedRuleIds];
    return { ...item, attentionFlags, unevaluatedRuleIds,
      checkInStatus: attentionFlags.length ? "flagged" as const : unevaluatedRuleIds.length ? "not_evaluated" as const : "no_flags" as const,
      unavailableReason: [item.unavailableReason, result.unevaluatedRuleIds.length ? "Some configured check-in evidence is unavailable." : null].filter(Boolean).join(" ") || null };
  });
  return {
    evaluations: combined,
    learnersNeedingCheckIn: combined.some((item) => item.checkInStatus === "not_evaluated")
      ? null : combined.filter((item) => item.checkInStatus === "flagged").length,
  };
}
