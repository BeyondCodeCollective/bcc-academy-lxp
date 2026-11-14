import "server-only";
import { evaluateMvpAttention } from "./attention";
import { getMvpOfferingActiveConfig } from "./active-config";
import { buildMvpAdditionalSignals, getMvpSignalPolicy } from "./check-in-signals";
import type { MvpAttendanceSessionState } from "./attendance-verification";
import type { LearnerWeeklyMilestones } from "./learner-activity";
import type { MvpAttentionFlag } from "./types";

export type LearnerFlagSupport =
  | { kind: "verified_absences"; count: number; threshold: number;
      sessions: { weekNumber: number; sessionNumber: number; state: "verified_absent" }[] }
  | { kind: "overdue_required_submissions"; count: number; threshold: number;
      assignments: { assignmentId: string; label: string; weekNumber: number; dueAt: string;
        graceDays: number; graceEndsAt: string; submittedAt: null; state: "none_recorded" }[] }
  | { kind: "required_video_checkpoint"; dueAt: string; minimumPercent: number; recordedPercent: number;
      requiredCount: number; markedCount: number;
      weeks: { weekNumber: number; markedWatchedAt: string | null; state: "recorded" | "none_recorded" }[] };
export type LearnerCheckInFlag = MvpAttentionFlag & {
  learnerId: string; programId: string; courseSlug: string; supportingEvidence: LearnerFlagSupport;
};

type Enrollment = { programId: string; courseSlug: string; attendanceSessions: MvpAttendanceSessionState[] | null;
  weeklyMilestones: LearnerWeeklyMilestones[] };
type Learner = { id: string; enrollments: Enrollment[] };
type CheckInResult = {
  status: "needs_check_in" | "not_evaluated" | "on_track";
  checkIn: { attentionFlags: LearnerCheckInFlag[]; unevaluatedRuleIds: string[];
    evaluatedAt: string; unavailableReason: string | null;
  };
};

// Internal only: inputs are the complete evidence projection from authorized reads.
// The framework's two-absence rule is already approved. Work/video rules require
// exact offering configuration; no live registry entries are fabricated here.
export function evaluateLearnerCheckIns<T extends Learner>(directory: T[], programs: readonly { id: string; slug: string }[], asOf: Date):
  Array<Omit<T, "enrollments"> & { enrollments: Array<Omit<T["enrollments"][number], keyof CheckInResult> & CheckInResult> }> {
  return directory.map(learner => ({ ...(learner as Omit<T, "enrollments">), enrollments: learner.enrollments.map(enrollment => {
    const program = programs.find(row => row.id === enrollment.programId);
    if (!program) throw new Error("Learner check-in scope is unavailable.");
    const config = getMvpOfferingActiveConfig(program.slug, enrollment.courseSlug);
    const policy = getMvpSignalPolicy(program.slug, enrollment.courseSlug);
    const key = JSON.stringify([enrollment.programId, enrollment.courseSlug]);
    const sessions = enrollment.attendanceSessions;
    const absent = sessions?.filter(row => row.state === "verified_absent") ?? [];
    const complete = !!sessions?.length && sessions.every(row => row.state === "verified_present" || row.state === "verified_absent");
    const timestamp = (mark: LearnerWeeklyMilestones["submission"]) => mark.state === "unavailable" ? "invalid" : mark.at;
    const additional = buildMvpAdditionalSignals({ learnerId: learner.id, courseSlug: enrollment.courseSlug, asOf,
      activeConfig: config, policy, exams: [],
      submissions: enrollment.weeklyMilestones.map(row => ({ id: "", student_id: learner.id, track_slug: enrollment.courseSlug,
        week_number: row.weekNumber ?? 0, submitted_at: timestamp(row.submission) })),
      videos: enrollment.weeklyMilestones.map(row => ({ id: "", user_id: learner.id, track_slug: enrollment.courseSlug,
        week_number: row.weekNumber ?? 0, video_watched_at: timestamp(row.markedWatched) })),
    });
    // An unmapped action may satisfy a requirement: never infer missing work from it.
    for (const [field, reason] of [["submission", "missing_required_submission"], ["markedWatched", "behind_expected_progress"]] as const) {
      if (enrollment.weeklyMilestones.some(row => row.weekNumber === null && row[field].state !== "none_recorded") && additional.observations[reason]) {
        additional.observations[reason] = { value: null, evidence: [] };
      }
    }
    const result = evaluateMvpAttention(learner.id, key,
      [{ id: "framework-missed-sessions-v1", reason: "missed_sessions", threshold: 2 }, ...additional.rules],
      { ...additional.observations, missed_sessions: {
        value: absent.length >= 2 || complete ? absent.length : null,
        evidence: absent.map(row => ({ sourceRecordId: JSON.stringify([enrollment.programId, enrollment.courseSlug, learner.id, row.weekNumber, row.sessionNumber]),
          label: `Verified absence: week ${row.weekNumber}, session ${row.sessionNumber}`, href: null })),
      } }, asOf);
    const unevaluatedRuleIds = [...result.unevaluatedRuleIds];
    // Enrich only flags actually produced by the evaluator. Requirement IDs are
    // configuration references, not fabricated submission records. Keep this an
    // explicit projection: private source objects must never be spread here.
    const attentionFlags: LearnerCheckInFlag[] = result.attentionFlags.map(flag => {
      let supportingEvidence: LearnerFlagSupport;
      if (flag.reason === "missed_sessions") {
        supportingEvidence = { kind: "verified_absences", count: absent.length, threshold: 2,
          sessions: absent.map(row => ({ weekNumber: row.weekNumber, sessionNumber: row.sessionNumber, state: "verified_absent" })) };
      } else if (flag.reason === "missing_required_submission" && config?.kind === "cohort") {
        const references = new Set(flag.evidence.map(item => item.sourceRecordId));
        const assignments = (config.requiredAssignments ?? []).filter(assignment =>
          references.has(JSON.stringify([program.slug, enrollment.courseSlug, assignment.id])))
          .map(assignment => ({ assignmentId: assignment.id, label: assignment.label, weekNumber: assignment.weekNumber,
            dueAt: assignment.dueAt, graceDays: config.submissionGraceDays,
            graceEndsAt: new Date(Date.parse(assignment.dueAt) + config.submissionGraceDays * 86400000).toISOString(),
            submittedAt: null, state: "none_recorded" as const }));
        if (!assignments.length || assignments.length !== references.size) throw new Error("Required-work flag evidence is incomplete.");
        supportingEvidence = { kind: "overdue_required_submissions", count: assignments.length, threshold: 1, assignments };
      } else if (flag.reason === "behind_expected_progress" && policy?.progress) {
        const weeks = [...policy.progress.requiredWeeks].sort((a, b) => a - b).map(weekNumber => {
          const mark = enrollment.weeklyMilestones.find(row => row.weekNumber === weekNumber)?.markedWatched;
          return { weekNumber, markedWatchedAt: mark?.at ?? null,
            state: mark?.state === "recorded" ? "recorded" as const : "none_recorded" as const };
        });
        const markedCount = weeks.filter(week => week.state === "recorded").length;
        supportingEvidence = { kind: "required_video_checkpoint", dueAt: policy.progress.dueAt,
          minimumPercent: policy.progress.minimumPercent, recordedPercent: markedCount / weeks.length * 100,
          requiredCount: weeks.length, markedCount, weeks };
      } else {
        // Assessment evidence is not connected. New flag types must explicitly
        // implement their safe evidence projection before being returned.
        throw new Error("Learner flag evidence is unsupported.");
      }
      return { id: flag.id, reason: flag.reason, ruleId: flag.ruleId, detectedAt: flag.detectedAt,
        explanation: flag.explanation, evidence: flag.evidence,
        learnerId: learner.id, programId: enrollment.programId, courseSlug: enrollment.courseSlug, supportingEvidence };
    });
    // A clean attendance subset is not proof that all course expectations are met.
    if (!config || (config.kind === "cohort" && config.requiredAssignments === null)) unevaluatedRuleIds.push("offering-requirements-unconfigured");
    const status: "needs_check_in" | "not_evaluated" | "on_track" = result.attentionFlags.length ? "needs_check_in"
      : unevaluatedRuleIds.length ? "not_evaluated" : "on_track";
    return { ...(enrollment as Omit<T["enrollments"][number], keyof CheckInResult>), status,
      checkIn: { attentionFlags, unevaluatedRuleIds, evaluatedAt: asOf.toISOString(),
        unavailableReason: unevaluatedRuleIds.length ? "Some offering rules or supporting evidence are unavailable." : null } };
  }) }));
}
