import { buildMvpSchedule, type MvpScheduleInput } from "./schedule";
import { calculateAttendanceMilestone, type MvpAttendanceRecord, type MvpSessionSlot } from "./milestones";
import { calculateMvpPercentage } from "./metrics";
import { evaluateMvpCourseCheckIns } from "./check-ins";
import { verifyMvpMissedSessions, type MvpAttendanceReview } from "./attendance-verification";
import type { MvpAdditionalSignals } from "./check-in-signals";
import { evaluateMvpActiveLearner, countMvpActiveLearners, type MvpActiveRule } from "./active-learners";

import { resolveMvpHeldSessions, type MvpSessionDelivery } from "./held-sessions";
export type { MvpSessionDelivery } from "./held-sessions";

// Start mapping requires an explicit dated syllabus. A labeled exam is not
// a kickoff. Multi-session weekly units need a more precise start mapping.
export function getMvpStartSlots(track: MvpScheduleInput["track"]): MvpSessionSlot[] | null {
  if (!track || (track.unitLabel !== "Session" && track.sessionsPerWeek !== 1)) return null;
  const units = track.weekSummaries ?? [];
  if (!units.length || units.some((unit) => !unit.date)) return null;
  const teaching = units.filter((unit) => !unit.label).sort((a, b) => a.date!.localeCompare(b.date!));
  if (!teaching.length) return null;
  if (teaching.length > 1 && teaching[0].date === teaching[1].date) return null;
  const kickoff = units.filter((unit) => /^kick[ -]?off$/i.test(unit.label?.trim() ?? ""));
  return [...kickoff, teaching[0]].map((unit) => ({
    weekNumber: unit.week, sessionNumber: 1, label: unit.label || "First session",
  }));
}

// Computes each learner independently and combines raw counts, rather than
// averaging rounded percentages. The caller supplies a complete scoped roster.
export function calculateMvpCoursePerformance(
  track: MvpScheduleInput["track"],
  learnerIds: string[],
  attendance: MvpAttendanceRecord[],
  delivery: MvpSessionDelivery[],
  asOf: Date,
  programRowId: string = track?.slug ?? "unknown",
  activeRule: MvpActiveRule | null = null,
  requiredWorkByLearner: ReadonlyMap<string, boolean | null> = new Map(),
  verification?: { programId: string; reviews: readonly MvpAttendanceReview[] },
  additionalSignals: ReadonlyMap<string, MvpAdditionalSignals> = new Map(),
) {
  const held = resolveMvpHeldSessions(track, delivery, asOf);
  const schedule = buildMvpSchedule({
    track, asOf, verifiedStartSessions: getMvpStartSlots(track),
    confirmedHeldSessions: held.heldRequiredSessions,
  });
  const distinctLearnerIds = [...new Set(learnerIds)];
  const milestones = distinctLearnerIds.map((learnerId) =>
    calculateAttendanceMilestone({
      learnerId, courseSlug: track?.slug ?? "", records: attendance,
      startSessions: schedule.startSessions,
      heldRequiredSessions: schedule.heldRequiredSessions,
    }),
  );
  const attended = milestones.reduce((total, milestone) => total + (milestone.attendedRequiredSessions ?? 0), 0);
  const opportunities = milestones.reduce((total, milestone) => total + (milestone.heldRequiredSessions ?? 0), 0);
  // Attendance qualification is observable evidence, not a claim that all
  // active requirements are satisfied. Missing check-ins remain unfinalized.
  const attendanceQualified = schedule.heldRequiredSessions?.length
    ? milestones.filter((milestone) => (milestone.attendedRequiredSessions ?? 0) * 100 >=
      (milestone.heldRequiredSessions ?? 0) * 80).length : null;
  // Finalization is per learner and required held session, using the latest
  // scoped revision. Partial/conflicting reviews must not certify inactivity.
  const activeEvaluations = milestones.map((milestone, index) => {
    const learnerId = distinctLearnerIds[index];
    const hasReview = verification?.reviews.some(row => row.program_id === verification.programId &&
      row.track_slug === track?.slug && row.student_id === learnerId &&
      !(Date.parse(row.recorded_at) > asOf.getTime()) && schedule.heldRequiredSessions?.some(slot =>
        slot.weekNumber === row.week_number && slot.sessionNumber === row.session_number));
    const finalized = verification ? verifyMvpMissedSessions({
      programId: verification.programId, courseSlug: track?.slug ?? "", learnerId,
      heldRequiredSessions: schedule.heldRequiredSessions, reviews: verification.reviews, attendance, asOf,
    }).finalizedAttendance : null;
    const attended = finalized?.attended ?? (hasReview ? null : milestone.attendedRequiredSessions);
    const held = finalized?.held ?? (hasReview ? null : milestone.heldRequiredSessions);
    return evaluateMvpActiveLearner(activeRule, {
      eventAttended: attended && attended > 0 ? true : finalized ? false : null,
      attendedRequiredSessions: attended,
      heldRequiredSessions: held,
      attendanceFinalized: finalized !== null,
      requiredWorkOnTime: requiredWorkByLearner.get(learnerId) ?? null,
    });
  });
  return {
    heldRequiredSessions: schedule.heldRequiredSessions,
    activeByLearner: new Map(distinctLearnerIds.map((id, index) => [id, activeEvaluations[index].active])),
    attendanceQualified,
    active: !activeRule || !schedule.heldRequiredSessions?.length ? null : countMvpActiveLearners(activeEvaluations),
    activeUnavailableReason: !activeRule ? "Active requirements are not configured for this offering."
      : !schedule.heldRequiredSessions?.length ? held.unavailableReason ?? "No verified required sessions have been held."
      : activeEvaluations.find((item) => item.unavailableReason)?.unavailableReason ?? null,
    checkIns: evaluateMvpCourseCheckIns(programRowId, track?.slug ?? "", distinctLearnerIds, attendance, schedule.heldRequiredSessions, asOf, verification, additionalSignals),
    startedLearnerIds: schedule.startSessions === null ? null : distinctLearnerIds.filter((_, index) => milestones[index].hasStartEvidence),
    started: schedule.startSessions === null ? null : milestones.filter((milestone) => milestone.hasStartEvidence).length,
    attendanceRate: schedule.heldRequiredSessions === null ? null : calculateMvpPercentage(attended, opportunities),
  };
}
