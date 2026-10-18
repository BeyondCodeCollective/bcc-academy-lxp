import type { MvpAttentionObservation, MvpAttentionRule } from "./attention";
import { validateMvpActiveConfigs, type MvpOfferingActiveConfig } from "./active-config";
import type { MvpSubmissionRecord } from "./required-work";

// Program owners must explicitly map a course to a source and cutoff. No
// score cutoff or expected self-paced deadline is inferred from login activity.
export type MvpSignalPolicy = {
  programSlug: string; courseSlug: string;
  assessment?: { examId: string; minimumPercent: number };
  progress?: { source: "required_videos"; dueAt: string; requiredWeeks: number[]; minimumPercent: number };
};
export const MVP_SIGNAL_POLICIES: readonly MvpSignalPolicy[] = [];
export function getMvpSignalPolicy(programSlug: string, courseSlug: string, policies = MVP_SIGNAL_POLICIES) {
  const keys = new Set<string>();
  for (const policy of policies) {
    const key = JSON.stringify([policy.programSlug, policy.courseSlug]);
    if (!policy.programSlug.trim() || !policy.courseSlug.trim() || keys.has(key)) throw new Error("Invalid or duplicate check-in policy.");
    keys.add(key);
    for (const rule of [policy.assessment, policy.progress]) {
      if (rule && (!Number.isFinite(rule.minimumPercent) || rule.minimumPercent <= 0 || rule.minimumPercent > 100)) throw new Error("Invalid check-in percentage.");
    }
    if (policy.assessment && !policy.assessment.examId.trim()) throw new Error("Assessment mapping is required.");
    if (policy.progress && (policy.progress.source !== "required_videos" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(policy.progress.dueAt) ||
        !Number.isFinite(Date.parse(policy.progress.dueAt)) ||
        new Date(policy.progress.dueAt).toISOString() !== policy.progress.dueAt.replace("Z", ".000Z") ||
        !policy.progress.requiredWeeks.length || new Set(policy.progress.requiredWeeks).size !== policy.progress.requiredWeeks.length ||
        policy.progress.requiredWeeks.some(week => !Number.isInteger(week) || week < 1))) throw new Error("Invalid expected-progress mapping.");
  }
  return policies.find(policy => policy.programSlug === programSlug && policy.courseSlug === courseSlug) ?? null;
}

export type MvpExamEvidence = { id: string; student_id: string; exam_id: string; submitted_at: string | null; score: number | null; total: number | null };
export type MvpVideoEvidence = { id: string; user_id: string; track_slug: string; week_number: number; video_watched_at: string | null };
export type MvpAdditionalSignals = {
  rules: MvpAttentionRule[];
  observations: Partial<Record<MvpAttentionRule["reason"], MvpAttentionObservation>>;
};

// Missing work means still missing after grace, not merely submitted late.
// The requirement's configured ID is evidence of the expected work; no fake
// submission record is fabricated when a submission does not exist.
export function buildMvpAdditionalSignals(input: {
  learnerId: string; courseSlug: string; asOf: Date; activeConfig: MvpOfferingActiveConfig | null;
  submissions: readonly MvpSubmissionRecord[]; policy: MvpSignalPolicy | null;
  exams: readonly MvpExamEvidence[]; videos: readonly MvpVideoEvidence[];
}): MvpAdditionalSignals {
  const { learnerId, courseSlug, activeConfig: config, policy } = input;
  const now = input.asOf.getTime();
  if (!Number.isFinite(now)) throw new Error("Invalid check-in evaluation time.");
  const rules: MvpAttentionRule[] = [];
  const observations: MvpAdditionalSignals["observations"] = {};
  if (config?.kind === "cohort" && config.requiredAssignments !== null) {
    validateMvpActiveConfigs([config]);
    rules.push({ id: "framework-required-work-v1", reason: "missing_required_submission", threshold: 1 });
    const evidence: MvpAttentionObservation["evidence"] = [];
    let unknown = false;
    for (const assignment of config.requiredAssignments) {
      if (now <= Date.parse(assignment.dueAt) + config.submissionGraceDays * 86400000) continue;
      const records = input.submissions.filter(row => row.student_id === learnerId && row.track_slug === courseSlug && row.week_number === assignment.weekNumber);
      if (records.some(row => row.submitted_at && Number.isFinite(Date.parse(row.submitted_at)) && Date.parse(row.submitted_at) <= now)) continue;
      if (records.some(row => row.submitted_at && (!Number.isFinite(Date.parse(row.submitted_at)) || Date.parse(row.submitted_at) > now))) { unknown = true; continue; }
      evidence.push({ sourceRecordId: JSON.stringify([config.programSlug, courseSlug, assignment.id]),
        label: `Required work: ${assignment.label}; due ${assignment.dueAt}; ${config.submissionGraceDays}-day grace elapsed`, href: null });
    }
    observations.missing_required_submission = { value: evidence.length ? evidence.length : unknown ? null : 0, evidence };
  }
  if (policy?.assessment) {
    const spec = policy.assessment;
    rules.push({ id: "framework-assessment-v1", reason: "low_assessment", threshold: spec.minimumPercent });
    const rows = input.exams.filter(row => row.student_id === learnerId && row.exam_id === spec.examId && row.submitted_at !== null);
    const invalidTime = rows.some(row => !Number.isFinite(Date.parse(row.submitted_at!)));
    const past = rows.filter(row => Date.parse(row.submitted_at!) <= now).sort((a, b) => Date.parse(b.submitted_at!) - Date.parse(a.submitted_at!));
    const latest = past[0];
    const ambiguous = latest && past.filter(row => row.submitted_at === latest.submitted_at).length !== 1;
    const valid = latest && !invalidTime && !ambiguous && Number.isInteger(latest.score) && Number.isInteger(latest.total) && latest.total! > 0 && latest.score! >= 0 && latest.score! <= latest.total!;
    observations.low_assessment = { value: valid ? latest.score! / latest.total! * 100 : null,
      evidence: valid ? [{ sourceRecordId: latest.id, label: `Latest completed assessment: ${spec.examId}`, href: null }] : [] };
  }
  if (policy?.progress && now > Date.parse(policy.progress.dueAt)) {
    const spec = policy.progress;
    rules.push({ id: "framework-progress-v1", reason: "behind_expected_progress", threshold: spec.minimumPercent });
    const rows = input.videos.filter(row => row.user_id === learnerId && row.track_slug === courseSlug && spec.requiredWeeks.includes(row.week_number));
    const invalid = rows.some(row => row.video_watched_at && (!Number.isFinite(Date.parse(row.video_watched_at)) || Date.parse(row.video_watched_at) > now));
    const watched = new Set(rows.filter(row => row.video_watched_at && Date.parse(row.video_watched_at) <= now).map(row => row.week_number));
    observations.behind_expected_progress = { value: invalid ? null : watched.size / spec.requiredWeeks.length * 100,
      evidence: [{ sourceRecordId: JSON.stringify([policy.programSlug, courseSlug, "required-videos", spec.dueAt]),
        label: `Configured required videos: ${watched.size}/${spec.requiredWeeks.length} recorded watched; checkpoint ${spec.dueAt}`, href: null }] };
  }
  return { rules, observations };
}
