import "server-only";
import { evaluateMvpAttention } from "./attention";
import { getMvpOfferingActiveConfig } from "./active-config";
import { buildMvpAdditionalSignals, getMvpSignalPolicy } from "./check-in-signals";
import type { MvpAttendanceSessionState } from "./attendance-verification";
import type { LearnerWeeklyMilestones } from "./learner-activity";

type Enrollment = { programId: string; courseSlug: string; attendanceSessions: MvpAttendanceSessionState[] | null;
  weeklyMilestones: LearnerWeeklyMilestones[] };
type Learner = { id: string; enrollments: Enrollment[] };
type CheckInResult = {
  status: "needs_check_in" | "not_evaluated" | "on_track";
  checkIn: Pick<ReturnType<typeof evaluateMvpAttention>, "attentionFlags" | "unevaluatedRuleIds"> & {
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
    const complete = !!sessions?.length && sessions.every(row => !["unrecorded", "unresolved"].includes(row.state));
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
    // A clean attendance subset is not proof that all course expectations are met.
    if (!config || (config.kind === "cohort" && config.requiredAssignments === null)) unevaluatedRuleIds.push("offering-requirements-unconfigured");
    const status: "needs_check_in" | "not_evaluated" | "on_track" = result.attentionFlags.length ? "needs_check_in"
      : unevaluatedRuleIds.length ? "not_evaluated" : "on_track";
    return { ...(enrollment as Omit<T["enrollments"][number], keyof CheckInResult>), status,
      checkIn: { attentionFlags: result.attentionFlags, unevaluatedRuleIds, evaluatedAt: asOf.toISOString(),
        unavailableReason: unevaluatedRuleIds.length ? "Some offering rules or supporting evidence are unavailable." : null } };
  }) }));
}
