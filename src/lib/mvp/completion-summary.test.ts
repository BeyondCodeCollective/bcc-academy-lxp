import { describe, expect, it } from "vitest";
import { calculateMvpCompletionSummary } from "./completion-summary";

// Summary totals must be deduplicated and cannot conceal missing coverage.
describe("completion summaries", () => {
  it("deduplicates learners across courses within a program", () => {
    expect(calculateMvpCompletionSummary([
      { programId: "a", completedLearnerIds: ["one", "one"] },
      { programId: "a", completedLearnerIds: ["one", "two"] },
    ])).toEqual({ uniqueLearnersCompleted: 2, programParticipationsCompleted: 2 });
  });

  it("counts one person separately in each program", () => {
    expect(calculateMvpCompletionSummary([
      { programId: "a", completedLearnerIds: ["one"] },
      { programId: "b", completedLearnerIds: ["one"] },
    ])).toEqual({ uniqueLearnersCompleted: 1, programParticipationsCompleted: 2 });
  });

  it("preserves unknown when only some offerings have completion evidence", () => {
    expect(calculateMvpCompletionSummary([
      { programId: "a", completedLearnerIds: ["one"] },
      { programId: "b", completedLearnerIds: null },
    ])).toEqual({ uniqueLearnersCompleted: null, programParticipationsCompleted: null });
  });

  it("does not mistake unknown coverage for a verified zero", () => {
    expect(calculateMvpCompletionSummary([
      { programId: "a", completedLearnerIds: null },
    ])).toEqual({ uniqueLearnersCompleted: null, programParticipationsCompleted: null });
  });

  it("returns zero for verified empty completion lists", () => {
    expect(calculateMvpCompletionSummary([
      { programId: "a", completedLearnerIds: [] },
    ])).toEqual({ uniqueLearnersCompleted: 0, programParticipationsCompleted: 0 });
  });

  it("returns zero for an empty selected scope", () => {
    expect(calculateMvpCompletionSummary([]))
      .toEqual({ uniqueLearnersCompleted: 0, programParticipationsCompleted: 0 });
  });

  it("counts only the supplied selected scope", () => {
    const offerings = [
      { programId: "a", completedLearnerIds: ["one"] },
      { programId: "b", completedLearnerIds: ["two"] },
    ];
    expect(calculateMvpCompletionSummary(offerings.filter((row) => row.programId === "a")))
      .toEqual({ uniqueLearnersCompleted: 1, programParticipationsCompleted: 1 });
  });
});
