import type { MvpDashboardData } from "./types";

// The top cards contain only authorized aggregate counts, never learner data.
export function buildMvpOverviewSnapshot(data: MvpDashboardData) {
  return {
    scopeLabel: data.scopeLabel,
    summary: data.summary,
    fetchedAt: data.freshness.fetchedAt,
    portfolio: data.programs.length,
    active: data.programs.filter(row => row.status === "active").length,
    upcoming: data.programs.filter(row => row.status === "starting_soon").length,
    unknown: data.programs.filter(row => row.status === "unknown").length,
    flaggedCourses: data.staffReview?.coursesWithVerifiedFlags ?? null,
  };
}
export type MvpOverviewSnapshot = ReturnType<typeof buildMvpOverviewSnapshot>;
