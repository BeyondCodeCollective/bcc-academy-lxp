import { isSmallMvpCount } from "./privacy";
import type { AttendanceSessionAggregate } from "./learner-attendance-aggregates";
import type { WeeklyMilestoneAggregate } from "./learner-milestone-aggregates";
import type { LearnerChartData } from "./learner-chart-data";

export const attendanceLabels = {
  verified_present: "Verified present", verified_absent: "Verified absent", excused: "Excused",
  not_eligible: "Not eligible", unrecorded: "Unrecorded", unresolved: "Unresolved",
} as const;
export const milestoneLabels = { submissions: "Submissions", reflections: "Reflections", markedWatched: "Marked watched" } as const;
export type ChartSelection = { programId: string; courseSlug: string; weekNumber: number } & (
  { kind: "attendance"; sessionNumber: number; measure: keyof typeof attendanceLabels } |
  { kind: "milestone"; measure: keyof typeof milestoneLabels }
);
export type DirectoryCharts = {
  attendance: LearnerChartData<AttendanceSessionAggregate>;
  milestones: LearnerChartData<WeeklyMilestoneAggregate>;
};
export function parseChartSelection(raw: unknown): ChartSelection | null {
  if (raw === undefined || raw === "") return null;
  if (typeof raw !== "string" || raw.length > 1000) throw new Error("Invalid chart selection.");
  const s = JSON.parse(raw);
  if (!s || Array.isArray(s) || typeof s !== "object" ||
    ![s.programId, s.courseSlug].every(v => typeof v === "string" && v.trim() === v && v.length > 0 && v.length <= 200) ||
    !Number.isSafeInteger(s.weekNumber) || s.weekNumber <= 0) throw new Error("Invalid chart selection.");
  const base = { programId: s.programId as string, courseSlug: s.courseSlug as string, weekNumber: s.weekNumber as number };
  if (s.kind === "attendance" && Object.hasOwn(attendanceLabels, s.measure) && Number.isSafeInteger(s.sessionNumber) && s.sessionNumber > 0)
    return { ...base, kind: s.kind, sessionNumber: s.sessionNumber, measure: s.measure };
  if (s.kind === "milestone" && Object.hasOwn(milestoneLabels, s.measure)) return { ...base, kind: s.kind, measure: s.measure };
  throw new Error("Invalid chart selection.");
}
export function chartSelectionKey(s: ChartSelection) { return JSON.stringify(s); }
export function chartSelectionLabel(s: ChartSelection) {
  return `${s.programId} / ${s.courseSlug} · Week ${s.weekNumber}${s.kind === "attendance" ? ` · Session ${s.sessionNumber} · ${attendanceLabels[s.measure]}` : ` · ${milestoneLabels[s.measure]}`}`;
}

// Explicit aggregate projection, shared by the action and defensive renderer.
export function protectDirectoryCharts(input: DirectoryCharts): DirectoryCharts {
  const protect = <T>(data: LearnerChartData<T>, project: (row: T) => T, cells: (row: T) => number[], key: (row: T) => string): LearnerChartData<T> => {
    if (data.state !== "ready") return { state: data.state };
    if (!data.rows.length) return { state: "empty" };
    if (new Set(data.rows.map(key)).size !== data.rows.length || data.rows.some(row => cells(row).some(n => !Number.isSafeInteger(n) || n < 0))) return { state: "unavailable" };
    if (data.rows.some(row => cells(row).some(isSmallMvpCount))) return { state: "suppressed" };
    return { state: "ready", rows: data.rows.map(project) };
  };
  return {
    attendance: protect(input.attendance, r => ({ programId: r.programId, courseSlug: r.courseSlug, weekNumber: r.weekNumber, sessionNumber: r.sessionNumber, total: r.total,
      counts: { verified_present: r.counts.verified_present, verified_absent: r.counts.verified_absent, excused: r.counts.excused, not_eligible: r.counts.not_eligible, unrecorded: r.counts.unrecorded, unresolved: r.counts.unresolved } }),
      r => { const counts = Object.keys(attendanceLabels).map(k => r.counts[k as keyof typeof attendanceLabels]); return [r.total, ...counts, ...counts.map(n => r.total - n), ...(counts.reduce((a, b) => a + b, 0) === r.total ? [] : [NaN])]; },
      r => JSON.stringify([r.programId, r.courseSlug, r.weekNumber, r.sessionNumber])),
    milestones: protect(input.milestones, r => ({ programId: r.programId, courseSlug: r.courseSlug, weekNumber: r.weekNumber, total: r.total, submissions: r.submissions, reflections: r.reflections, markedWatched: r.markedWatched }),
      r => [r.total, r.submissions, r.reflections, r.markedWatched, r.total - r.submissions, r.total - r.reflections, r.total - r.markedWatched],
      r => JSON.stringify([r.programId, r.courseSlug, r.weekNumber])),
  };
}
