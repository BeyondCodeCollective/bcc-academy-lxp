import { describe, expect, it } from "vitest";
import { calculateMvpProgramSummaries, type MvpProgramSummaryInput } from "./program-summary";

const row: MvpProgramSummaryInput = { programId: "p1", programName: "One", offeringId: "a",
  enrolledLearnerIds: ["u1", "u2"], startedLearnerIds: ["u1"], completedLearnerIds: ["u1"] };

describe("selected program totals", () => {
  it("deduplicates people across courses, but retains course enrollment counts", () => {
    const [result] = calculateMvpProgramSummaries([row, { ...row, offeringId: "b", enrolledLearnerIds: ["u1", "u1"] }]);
    expect(result).toMatchObject({ selectedOfferingCount: 2, uniqueEnrolledLearners: 2,
      courseEnrollments: 3, uniqueLearnersStarted: 1, uniqueLearnersWithCourseCompletion: 1 });
    expect(result).not.toHaveProperty("enrolledLearnerIds");
  });
  it("keeps shared learners separate across programs", () => {
    expect(calculateMvpProgramSummaries([row, { ...row, programId: "p2" }]).map(r => r.uniqueLearnersStarted)).toEqual([1, 1]);
  });
  it("preserves unknown rather than reporting a partial count", () => {
    expect(calculateMvpProgramSummaries([row, { ...row, offeringId: "b", startedLearnerIds: null,
      completedLearnerIds: null }])[0]).toMatchObject({ uniqueLearnersStarted: null, uniqueLearnersWithCourseCompletion: null });
  });
  it("preserves verified zero and an empty selected scope", () => {
    expect(calculateMvpProgramSummaries([])).toEqual([]);
    expect(calculateMvpProgramSummaries([{ ...row, enrolledLearnerIds: [], startedLearnerIds: [], completedLearnerIds: [] }])[0])
      .toMatchObject({ uniqueEnrolledLearners: 0, uniqueLearnersStarted: 0, uniqueLearnersWithCourseCompletion: 0 });
  });
  it("rejects duplicate offerings rather than double counting", () => {
    expect(() => calculateMvpProgramSummaries([row, row])).toThrow("Duplicate offering");
  });
});
