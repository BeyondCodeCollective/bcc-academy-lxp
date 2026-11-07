import "server-only";
import type { LearnerWeeklyMilestones } from "./learner-activity";
import { protectLearnerMilestones, type LearnerChartData } from "./learner-chart-data";

export type WeeklyMilestoneAggregate = {
  programId: string; courseSlug: string; weekNumber: number;
  // Matching enrolled learners, not a claim of assignment eligibility/completion.
  total: number; submissions: number; reflections: number; markedWatched: number;
};
type Learner = { id: string; enrollments: {
  programId: string; courseSlug: string; weeklyMilestones: LearnerWeeklyMilestones[];
}[] };

// Input is the complete authorized, status-filtered roster. The activity loader
// has already verified timestamps and fetched every batch; no new reads here.
export function aggregateLearnerMilestones(learners: Learner[]): LearnerChartData<WeeklyMilestoneAggregate> {
  const offerings = new Map<string, Set<string>>();
  const groups = new Map<string, { row: WeeklyMilestoneAggregate; offering: string;
    submissions: Set<string>; reflections: Set<string>; markedWatched: Set<string> }>();
  for (const learner of learners) for (const enrollment of learner.enrollments) {
    const offering = JSON.stringify([enrollment.programId, enrollment.courseSlug]);
    const population = offerings.get(offering) ?? new Set<string>();
    population.add(learner.id); offerings.set(offering, population);
    for (const week of enrollment.weeklyMilestones) {
      // Historical activity without a reliable week must not be silently lost.
      if (week.weekNumber === null || !Number.isSafeInteger(week.weekNumber) || week.weekNumber <= 0 ||
        [week.submission, week.reflection, week.markedWatched].some(mark => mark.state === "unavailable")) return { state: "unavailable" };
      const key = JSON.stringify([enrollment.programId, enrollment.courseSlug, week.weekNumber]);
      let group = groups.get(key);
      if (!group) {
        group = { offering, row: { programId: enrollment.programId, courseSlug: enrollment.courseSlug,
          weekNumber: week.weekNumber, total: 0, submissions: 0, reflections: 0, markedWatched: 0 },
          submissions: new Set(), reflections: new Set(), markedWatched: new Set() };
        groups.set(key, group);
      }
      if (week.submission.state === "recorded") group.submissions.add(learner.id);
      if (week.reflection.state === "recorded") group.reflections.add(learner.id);
      if (week.markedWatched.state === "recorded") group.markedWatched.add(learner.id);
    }
  }
  const rows = [...groups.values()].map(group => ({ ...group.row,
    total: offerings.get(group.offering)!.size, submissions: group.submissions.size,
    reflections: group.reflections.size, markedWatched: group.markedWatched.size,
  })).sort((a, b) => a.programId.localeCompare(b.programId) || a.courseSlug.localeCompare(b.courseSlug) || a.weekNumber - b.weekNumber);
  // Reuse the chart guard: both each activity count AND its non-participating
  // complement must meet the minimum group size (or be zero).
  const protectedData = protectLearnerMilestones(rows.map(row => ({
    id: JSON.stringify([row.programId, row.courseSlug, row.weekNumber]), label: "",
    eligible: row.total, submissions: row.submissions, reflections: row.reflections, markedWatched: row.markedWatched,
  })));
  return protectedData.state === "ready" ? { state: "ready", rows } : protectedData;
}
