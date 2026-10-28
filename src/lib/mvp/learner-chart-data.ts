// Future authorized loaders must call these BEFORE passing chart data to a
// client. Never send raw small counts and rely on CSS/client suppression.
export type AttendanceChartRow = {
  id: string; label: string; eligible: number;
  present: number; absent: number; unrecorded: number;
};
export type MilestoneChartRow = {
  id: string; label: string; eligible: number;
  submissions: number; reflections: number; markedWatched: number;
};
export type LearnerChartData<T> =
  | { state: "unavailable" | "suppressed" | "empty" }
  | { state: "ready"; rows: T[] };
const valid = (n: number) => Number.isSafeInteger(n) && n >= 0;
const small = (n: number) => n > 0 && n < 5;

// Conservative whole-chart suppression also removes labels, totals, scales,
// and selection targets. It is not a repeated-query disclosure guarantee.
export function protectLearnerAttendance(rows: AttendanceChartRow[]): LearnerChartData<AttendanceChartRow> {
  if (!rows.length) return { state: "empty" };
  if (new Set(rows.map(r => r.id)).size !== rows.length || rows.some(r =>
    ![r.eligible, r.present, r.absent, r.unrecorded].every(valid) ||
    r.present + r.absent + r.unrecorded !== r.eligible)) return { state: "unavailable" };
  if (rows.some(r => [r.eligible, r.present, r.absent, r.unrecorded].some(small))) return { state: "suppressed" };
  return { state: "ready", rows: rows.map(r => ({ ...r })) };
}
export function protectLearnerMilestones(rows: MilestoneChartRow[]): LearnerChartData<MilestoneChartRow> {
  if (!rows.length) return { state: "empty" };
  if (new Set(rows.map(r => r.id)).size !== rows.length || rows.some(r =>
    ![r.eligible, r.submissions, r.reflections, r.markedWatched].every(valid) ||
    [r.submissions, r.reflections, r.markedWatched].some(n => n > r.eligible))) return { state: "unavailable" };
  if (rows.some(r => small(r.eligible) || [r.submissions, r.reflections, r.markedWatched]
    .some(n => small(n) || small(r.eligible - n)))) return { state: "suppressed" };
  return { state: "ready", rows: rows.map(r => ({ ...r })) };
}
