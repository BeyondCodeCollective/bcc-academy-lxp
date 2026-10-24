import { validateMvpActiveConfigs, type MvpOfferingActiveConfig } from "./active-config";

// Only metadata needed for timeliness is loaded; no learner work or files
// are exposed. Null submitted_at denotes a draft, not completed work.
export type MvpSubmissionRecord = {
  id: string;
  student_id: string;
  track_slug: string;
  week_number: number;
  submitted_at: string | null;
};

// UTC deadlines have an inclusive grace boundary (14 × 24 hours by default).
// Work not yet due is not required yet. Missing work within grace is pending,
// not inactive. Call only with the complete, successfully loaded record set.
export function evaluateMvpRequiredWork(
  config: MvpOfferingActiveConfig,
  learnerId: string,
  records: readonly MvpSubmissionRecord[] | null,
  asOf: Date,
): boolean | null {
  validateMvpActiveConfigs([config]);
  const now = asOf.getTime();
  if (!Number.isFinite(now)) throw new Error("Invalid submission evaluation date.");
  if (config.kind === "single_event") return true;
  if (config.requiredAssignments === null) return null;
  let pending = false;
  for (const assignment of config.requiredAssignments) {
    const due = Date.parse(assignment.dueAt);
    if (now < due) continue;
    if (records === null) { pending = true; continue; }
    const cutoff = due + config.submissionGraceDays * 86_400_000;
    const matching = records.filter((record) => record.student_id === learnerId &&
      record.track_slug === config.courseSlug && record.week_number === assignment.weekNumber);
    const times = matching.filter((record) => record.submitted_at !== null).map((record) => Date.parse(record.submitted_at!));
    if (times.some((time) => Number.isFinite(time) && time <= cutoff && time <= now)) continue;
    if (times.some((time) => !Number.isFinite(time) || time > now)) { pending = true; continue; }
    if (now <= cutoff) { pending = true; continue; }
    return false;
  }
  return pending ? null : true;
}
