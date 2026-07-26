// Plain-language definitions for every analytics metric we surface, so an
// instructor hovering an "(i)" gets the same answer support would give. Keep
// each to one sentence; say how it's computed, not just what it means.

export const METRIC_DEFS = {
  courseEnrollments:
    "Members with an enrollment (a student_tracks row). A current total, so it has no previous-period comparison.",
  lessonsWatched:
    "Distinct lesson videos watched in the window. Compared on when each view happened.",
  completionRate:
    "Members marked complete ÷ members enrolled, capped at 100%. Completion is recorded when you issue a certificate — a course nobody has issued for reads 0%, however far the learners actually got.",
  courseCompletions:
    "Members with a certificate issued for a course they were enrolled in — completion is a decision you make, not something the platform infers from activity. A current total, so it has no previous-period comparison.",
  activeMembers:
    "Distinct members who watched a lesson, attended, submitted, or reflected in the window.",
  atRisk: "Enrolled members with no activity in the last 7 to 20 days.",
  disengaged: "Enrolled members with no activity in more than 21 days.",
  completionDistribution:
    "Enrolled members grouped by how far through their course they've reached.",
  activeStudents:
    "Members with any activity in the window: a lesson watched, session attended, work submitted, or reflection.",
} as const;

export type MetricKey = keyof typeof METRIC_DEFS;
