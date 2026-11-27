import { expect, it } from "vitest";
import { buildKpiCoverage } from "./kpi-coverage";

it("deduplicates people and program pairs across evaluable courses independently per metric", () => {
  const starts = [{ programId: "a", startedLearnerIds: ["x", "x"] }, { programId: "a", startedLearnerIds: ["x"] },
    { programId: "b", startedLearnerIds: ["x", "y"] }, { programId: "c", startedLearnerIds: null }];
  const result = buildKpiCoverage(starts, [{ programId: "a", completedLearnerIds: null }], []);
  expect(result.uniqueLearnersStarted).toEqual({ value: 2, evaluated: 3, total: 4 });
  expect(result.programParticipationsStarted.value).toBe(3);
  expect(result.uniqueLearnersCompleted).toEqual({ value: null, evaluated: 0, total: 1 });
  expect(JSON.stringify(result)).not.toContain('"x"');
});
it("preserves known zero, missing evidence, and empty scope separately", () => {
  expect(buildKpiCoverage([], [], []).uniqueLearnersStarted).toEqual({ value: 0, evaluated: 0, total: 0 });
  expect(buildKpiCoverage([], [{ programId: "a", completedLearnerIds: [] }, { programId: "b", completedLearnerIds: null }], []).uniqueLearnersCompleted)
    .toEqual({ value: 0, evaluated: 1, total: 2 });
});
it("counts only supported upcoming enrollments and discloses unknown lifecycle", () => {
  const result = buildKpiCoverage([], [], [{ status: "starting_soon", enrolledBeforeStart: 41 },
    { status: "active", enrolledBeforeStart: null }, { status: "unknown", enrolledBeforeStart: 79 },
    { status: "starting_soon", enrolledBeforeStart: null }]);
  expect(result.upcomingEnrollments).toEqual({ value: 41, evaluated: 2, total: 4 });
});

it("does not double-count existing learners when an unavailable course becomes evaluable", () => {
  const first = { programId: "a", startedLearnerIds: ["x", "y", "x"] };
  const before = [first, { programId: "a", startedLearnerIds: null }, { programId: "b", startedLearnerIds: ["x"] }];
  const after = [first, { programId: "a", startedLearnerIds: ["x", "y", "y"] }, { programId: "b", startedLearnerIds: ["x"] }];
  const build = (starts: typeof before) => buildKpiCoverage(starts,
    starts.map(row => ({ programId: row.programId, completedLearnerIds: row.startedLearnerIds })), []);
  expect(build(before).uniqueLearnersStarted).toEqual({ value: 2, evaluated: 2, total: 3 });
  const result = build(after);
  expect(result.uniqueLearnersStarted).toEqual({ value: 2, evaluated: 3, total: 3 });
  expect(result.uniqueLearnersCompleted.value).toBe(2);
  expect(result.programParticipationsStarted.value).toBe(3);
  expect(result.programParticipationsCompleted.value).toBe(3);
});
