import "server-only";
import { aggregateLearnerAttendance } from "./learner-attendance-aggregates";
import { aggregateLearnerMilestones } from "./learner-milestone-aggregates";
import type { ChartSelection } from "./learner-chart-selection";

type Learner = { id: string; enrollments: (Parameters<typeof aggregateLearnerAttendance>[0][number]["enrollments"][number] & Parameters<typeof aggregateLearnerMilestones>[0][number]["enrollments"][number])[] };
// Always use the complete authorized, base-filtered population, never a page
// or an individual learner. Revalidate suppression on every directory/evidence request.
export function filterLearnersByChart<T extends Learner>(learners: T[], selection: ChartSelection | null) {
  const charts = { attendance: aggregateLearnerAttendance(learners), milestones: aggregateLearnerMilestones(learners) };
  if (!selection) return { learners, charts };
  const s = selection;
  const sameOffering = (e: { programId: string; courseSlug: string }) => e.programId === s.programId && e.courseSlug === s.courseSlug;
  const visible = s.kind === "attendance"
    ? charts.attendance.state === "ready" && charts.attendance.rows.some(r => sameOffering(r) && r.weekNumber === s.weekNumber && r.sessionNumber === s.sessionNumber && r.counts[s.measure] > 0)
    : charts.milestones.state === "ready" && charts.milestones.rows.some(r => sameOffering(r) && r.weekNumber === s.weekNumber && r[s.measure] > 0);
  if (!visible) throw new Error("Chart selection is unavailable. Clear the chart filter.");
  const selected = learners.map(learner => ({ ...learner, enrollments: learner.enrollments.filter(e => {
    if (!sameOffering(e)) return false;
    if (s.kind === "attendance") return e.attendanceSessions?.some(row => row.weekNumber === s.weekNumber && row.sessionNumber === s.sessionNumber && row.state === s.measure);
    const key = s.measure === "submissions" ? "submission" : s.measure === "reflections" ? "reflection" : "markedWatched";
    return e.weeklyMilestones.some(row => row.weekNumber === s.weekNumber && row[key].state === "recorded");
  }) })).filter(learner => learner.enrollments.length > 0) as T[];
  return { learners: selected, charts };
}
