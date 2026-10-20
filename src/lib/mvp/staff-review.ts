import type { MvpCheckInEvaluation } from "./check-ins";
import type { MvpAttentionReason, MvpProgramRow } from "./types";

// Serializable course aggregates only: learner IDs and supporting records stay
// on the server. Reason counts can overlap; each learner counts once per course.
export type MvpCourseStaffReview = {
  id: string;
  programId: string;
  programName: string;
  courseName: string | null;
  courseSlug: string | null;
  cohortId: string | null;
  cohortName: string | null;
  verifiedLearnerCount: number;
  evaluationComplete: boolean;
  reasons: { reason: MvpAttentionReason; learnerCount: number }[];
};

const reasons: readonly MvpAttentionReason[] = [
  "missed_sessions", "missing_required_submission", "low_assessment", "behind_expected_progress",
];

// Call only with authorized, filtered course rows and evaluations from those
// same rosters. This projection is not an authorization or evidence evaluator.
export function buildMvpStaffReview(
  rows: readonly MvpProgramRow[], evaluations: readonly MvpCheckInEvaluation[],
) {
  const scoped = new Map(rows.map(row => [row.id, new Map<string, MvpCheckInEvaluation[]>()]));
  for (const item of evaluations) {
    const roster = scoped.get(item.programRowId);
    if (!roster || !item.learnerId.trim()) continue;
    roster.set(item.learnerId, [...(roster.get(item.learnerId) ?? []), item]);
  }

  const courses: MvpCourseStaffReview[] = rows.map(row => {
    const roster = scoped.get(row.id)!;
    const flagged = new Set<string>();
    const byReason = new Map(reasons.map(reason => [reason, new Set<string>()]));
    let evaluationComplete = row.totalParticipants !== null && Number.isInteger(row.totalParticipants)
      && row.totalParticipants >= 0 && roster.size === row.totalParticipants;
    for (const [learnerId, items] of roster) {
      for (const item of items) {
        if (item.checkInStatus === "not_evaluated" || item.unevaluatedRuleIds.length || item.unavailableReason) {
          evaluationComplete = false;
        }
        const verified = item.checkInStatus === "flagged" ? item.attentionFlags.filter(flag =>
          byReason.has(flag.reason) && flag.evidence.some(record => record.sourceRecordId.trim() && record.label.trim())) : [];
        if (item.checkInStatus === "flagged" && verified.length !== item.attentionFlags.length) evaluationComplete = false;
        if (item.checkInStatus === "flagged" && !verified.length) evaluationComplete = false;
        for (const flag of verified) {
          flagged.add(learnerId);
          byReason.get(flag.reason)!.add(learnerId);
        }
      }
    }
    return {
      id: row.id, programId: row.programId, programName: row.programName,
      courseName: row.courseName, courseSlug: row.courseSlug,
      cohortId: row.cohortId, cohortName: row.cohortName,
      verifiedLearnerCount: flagged.size, evaluationComplete,
      reasons: reasons.flatMap(reason => {
        const learnerCount = byReason.get(reason)!.size;
        return learnerCount ? [{ reason, learnerCount }] : [];
      }),
    };
  });

  // Known flags survive incomplete evidence elsewhere. Completeness describes
  // configured rules only; it never implies unconfigured policies were checked.
  const flaggedCourses = courses.filter(course => course.verifiedLearnerCount > 0)
    .sort((a, b) => b.verifiedLearnerCount - a.verifiedLearnerCount || a.id.localeCompare(b.id, "en-US"));
  return {
    courses,
    flaggedCourses,
    coursesWithVerifiedFlags: flaggedCourses.length,
    incompleteCourseCount: courses.filter(course => !course.evaluationComplete).length,
  };
}
