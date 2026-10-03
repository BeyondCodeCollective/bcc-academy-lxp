import { describe, expect, it } from "vitest";
import { calculateMvpStartSummary } from "./start-summary";

// Totals must remain correct when people appear in several courses/programs
// and when only part of the selected scope has usable start evidence.
describe("organization start totals", () => {
  it("counts one person in multiple courses once within each program", () => {
    expect(calculateMvpStartSummary([
      { programId: "a", startedLearnerIds: ["one", "one"] },
      { programId: "a", startedLearnerIds: ["one", "two"] },
      { programId: "b", startedLearnerIds: ["one"] },
    ])).toEqual({ uniqueLearnersStarted: 2, programParticipationsStarted: 3 });
  });
  it("does not publish incomplete totals", () => {
    expect(calculateMvpStartSummary([
      { programId: "a", startedLearnerIds: ["one"] },
      { programId: "b", startedLearnerIds: null },
    ])).toEqual({ uniqueLearnersStarted: null, programParticipationsStarted: null });
  });
  it("returns zero for a known empty selected scope", () => {
    expect(calculateMvpStartSummary([])).toEqual({ uniqueLearnersStarted: 0, programParticipationsStarted: 0 });
  });
  it("does not incorporate records outside its selected input", () => {
    const offerings = [
      { programId: "a", startedLearnerIds: ["one"] },
      { programId: "b", startedLearnerIds: ["two"] },
    ];
    expect(calculateMvpStartSummary(offerings.filter((row) => row.programId === "a")))
      .toEqual({ uniqueLearnersStarted: 1, programParticipationsStarted: 1 });
  });
});
