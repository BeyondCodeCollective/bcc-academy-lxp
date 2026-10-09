import type { MvpExamEvidence, MvpVideoEvidence } from "./check-in-signals";

// Assessment averages use one latest completed mapped attempt per learner.
// Missing/ambiguous/invalid attempts are excluded with explicit coverage counts.
export function calculateMvpAssessment(learnerIds: readonly string[], examId: string | null,
  records: readonly MvpExamEvidence[], asOf: Date) {
  const ids = [...new Set(learnerIds)];
  const now = asOf.getTime();
  if (!Number.isFinite(now)) throw new Error("Invalid metric evaluation time.");
  const scores: number[] = [];
  if (examId) for (const id of ids) {
    const rows = records.filter(row => row.student_id === id && row.exam_id === examId && row.submitted_at !== null);
    if (rows.some(row => !Number.isFinite(Date.parse(row.submitted_at!)))) continue;
    const past = rows.filter(row => Date.parse(row.submitted_at!) <= now)
      .sort((a, b) => Date.parse(b.submitted_at!) - Date.parse(a.submitted_at!));
    const latest = past[0];
    if (!latest || past.filter(row => Date.parse(row.submitted_at!) === Date.parse(latest.submitted_at!)).length !== 1 ||
        !Number.isInteger(latest.score) || !Number.isInteger(latest.total) || latest.total! <= 0 || latest.score! < 0 || latest.score! > latest.total!) continue;
    scores.push(latest.score! / latest.total! * 100);
  }
  return { examId, averagePercent: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    assessedLearners: scores.length, eligibleLearners: ids.length, unavailableLearners: ids.length - scores.length,
    unavailableReason: !examId ? "No assessment is explicitly mapped to this offering." : !scores.length ? "No valid completed mapped assessments." : null };
}

// This is recorded required-video progress, not general course completion.
// A valid mapping and complete read make no watched rows a known zero; malformed
// evidence makes the aggregate unavailable rather than implying no progress.
export function calculateMvpVideoProgress(learnerIds: readonly string[], courseSlug: string,
  requiredWeeks: readonly number[] | null, records: readonly MvpVideoEvidence[], asOf: Date) {
  const ids = new Set(learnerIds);
  const weeks = new Set(requiredWeeks ?? []);
  const now = asOf.getTime();
  if (!Number.isFinite(now)) throw new Error("Invalid metric evaluation time.");
  if (requiredWeeks && (weeks.size !== requiredWeeks.length || requiredWeeks.some(week => !Number.isInteger(week) || week < 1))) throw new Error("Invalid required video mapping.");
  const rows = records.filter(row => ids.has(row.user_id) && row.track_slug === courseSlug && weeks.has(row.week_number));
  const invalid = rows.some(row => row.video_watched_at && (!Number.isFinite(Date.parse(row.video_watched_at)) || Date.parse(row.video_watched_at) > now));
  const pairs = new Set(rows.filter(row => row.video_watched_at && Number.isFinite(Date.parse(row.video_watched_at)) && Date.parse(row.video_watched_at) <= now)
    .map(row => JSON.stringify([row.user_id, row.week_number])));
  const opportunities = ids.size * weeks.size;
  const unavailableReason = !weeks.size ? "No explicit required-video mapping for this offering." : !ids.size ? "No eligible learners." : invalid ? "Recorded video progress contains invalid timestamps." : null;
  return { percent: unavailableReason ? null : pairs.size / opportunities * 100,
    watchedLearnerWeeks: unavailableReason ? null : pairs.size, requiredLearnerWeeks: opportunities,
    eligibleLearners: ids.size, requiredWeeks: [...weeks], unavailableReason };
}
