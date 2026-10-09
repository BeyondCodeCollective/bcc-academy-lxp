// Inputs are server-only learner IDs from authorized, already-filtered offerings.
// Output contains aggregate counts only. A course completion is not graduation
// from an entire program, and current-roster evidence is not all-time coverage.
export type MvpProgramSummaryInput = {
  programId: string;
  programName: string;
  offeringId: string;
  enrolledLearnerIds: readonly string[];
  startedLearnerIds: readonly string[] | null;
  completedLearnerIds: readonly string[] | null;
};

export type MvpProgramSummary = {
  programId: string;
  programName: string;
  selectedOfferingCount: number;
  uniqueEnrolledLearners: number;
  courseEnrollments: number;
  uniqueLearnersStarted: number | null;
  uniqueLearnersWithCourseCompletion: number | null;
  scope: "selected_accessible_offerings";
  population: "current_eligible_roster";
};

// Null in one offering prevents a partial known subset becoming a full total.
// Deduplicate within a program; a learner can legitimately count in two programs.
export function calculateMvpProgramSummaries(offerings: readonly MvpProgramSummaryInput[]): MvpProgramSummary[] {
  const groups = new Map<string, MvpProgramSummaryInput[]>();
  const seen = new Set<string>();
  for (const offering of offerings) {
    const key = JSON.stringify([offering.programId, offering.offeringId]);
    if (seen.has(key)) throw new Error("Duplicate offering in program summary.");
    seen.add(key);
    const group = groups.get(offering.programId) ?? [];
    group.push(offering);
    groups.set(offering.programId, group);
  }
  return [...groups].map(([programId, rows]) => {
    const count = (field: "startedLearnerIds" | "completedLearnerIds") => rows.some(row => row[field] === null)
      ? null : new Set(rows.flatMap(row => [...row[field]!])).size;
    return { programId, programName: rows[0].programName, selectedOfferingCount: rows.length,
      uniqueEnrolledLearners: new Set(rows.flatMap(row => [...row.enrolledLearnerIds])).size,
      courseEnrollments: rows.reduce((sum, row) => sum + new Set(row.enrolledLearnerIds).size, 0),
      uniqueLearnersStarted: count("startedLearnerIds"),
      uniqueLearnersWithCourseCompletion: count("completedLearnerIds"),
      scope: "selected_accessible_offerings" as const, population: "current_eligible_roster" as const };
  });
}
