import { describe, expect, it } from "vitest";
import { buildVerifiedOverview } from "./verified-overview";
import { calculateMvpStartSummary } from "./start-summary";
import { calculateMvpCompletionSummary } from "./completion-summary";

describe("verified overview coverage", () => {
  it("shows deduplicated verified observations without changing strict totals", () => {
    const starts = [{ programId: "a", startedLearnerIds: ["x", "x"] }, { programId: "b", startedLearnerIds: ["x", "y"] }, { programId: "c", startedLearnerIds: null }];
    const completions = starts.map(row => ({ programId: row.programId, completedLearnerIds: row.startedLearnerIds }));
    const result = buildVerifiedOverview(starts, completions, []);
    expect(result.uniqueLearnersStarted).toEqual({ value: 2, evaluated: 2, total: 3 });
    expect(result.programParticipationsCompleted).toEqual({ value: 3, evaluated: 2, total: 3 });
    expect(calculateMvpStartSummary(starts).uniqueLearnersStarted).toBeNull();
    expect(calculateMvpCompletionSummary(completions).uniqueLearnersCompleted).toBeNull();
    expect(JSON.stringify(result)).not.toContain('"x"');
  });
  it("keeps entirely unknown values unavailable but preserves verified zero", () => {
    expect(buildVerifiedOverview([{ programId: "a", startedLearnerIds: null }], [], []).uniqueLearnersStarted.value).toBeNull();
    expect(buildVerifiedOverview([], [{ programId: "a", completedLearnerIds: [] }, { programId: "b", completedLearnerIds: null }], []).uniqueLearnersCompleted).toEqual({ value: 0, evaluated: 1, total: 2 });
  });
  it("separates known upcoming enrollments from unknown lifecycle or enrollment data", () => {
    const result = buildVerifiedOverview([], [], [
      { status: "starting_soon", enrolledBeforeStart: 41 },
      { status: "completed", enrolledBeforeStart: null },
      { status: "active", enrolledBeforeStart: null },
      { status: "unknown", enrolledBeforeStart: 78 },
      { status: "starting_soon", enrolledBeforeStart: null },
    ]);
    expect(result.upcomingEnrollments).toEqual({ value: 41, evaluated: 3, total: 5 });
    expect(buildVerifiedOverview([], [], [{ status: "unknown", enrolledBeforeStart: null }]).upcomingEnrollments.value).toBeNull();
  });
  it("uses only supplied scope and handles a verified empty selection", () => {
    expect(buildVerifiedOverview([], [], []).uniqueLearnersStarted).toEqual({ value: 0, evaluated: 0, total: 0 });
    expect(buildVerifiedOverview([{ programId: "a", startedLearnerIds: ["x"] }], [], []).uniqueLearnersStarted.value).toBe(1);
  });
});
