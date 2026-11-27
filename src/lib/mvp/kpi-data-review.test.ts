import { expect, it } from "vitest";
import type { MvpProgramRow } from "./types";
import { buildKpiDataReview } from "./kpi-data-review";
const row = { id: "p:c", programId: "p", programName: "Program", courseSlug: "c", courseName: "Course", cohortName: null,
  started: 0, completed: 0, status: "completed", enrolledBeforeStart: null } as MvpProgramRow;
it("groups missing metrics once per course and retains specific completion evidence", () => {
  const missing = { ...row, started: null, completed: null, status: "unknown" as const };
  const result = buildKpiDataReview([missing, missing], new Map([[row.id, "The full required course schedule has not been verified."]]));
  expect(result.courseCount).toBe(1); expect(result.courses[0].reasons).toHaveLength(3);
  expect(result.courses[0].reasons[1].message).toContain("full required course schedule");
});
it("does not flag valid zero or require upcoming counts for completed courses", () => {
  expect(buildKpiDataReview([row]).courseCount).toBe(0);
  expect(buildKpiDataReview([{ ...row, status: "starting_soon", enrolledBeforeStart: 0 }]).courseCount).toBe(0);
});
it("flags missing upcoming evidence and removes resolved gaps on recalculation", () => {
  expect(buildKpiDataReview([{ ...row, status: "starting_soon" }]).courses[0].reasons[0].metric).toBe("upcoming");
  expect(buildKpiDataReview([{ ...row, status: "starting_soon", enrolledBeforeStart: 12 }]).courseCount).toBe(0);
});
it("returns only supplied scope and projects out sensitive fields", () => {
  const result = buildKpiDataReview([{ ...row, started: null, learnerId: "private-learner" } as MvpProgramRow]);
  expect(JSON.stringify(result)).not.toContain("private-learner");
  expect(buildKpiDataReview([]).courseCount).toBe(0);
});

it("clears resolved reasons individually and keeps shared courses distinct by program", () => {
  const other = { ...row, id: "other:c", programId: "other", started: null };
  const first = buildKpiDataReview([{ ...row, started: null, completed: null }, other]);
  expect(first.courseCount).toBe(2);
  const partial = buildKpiDataReview([{ ...row, completed: null }, other]);
  expect(partial.courses.find(course => course.id === row.id)?.reasons.map(reason => reason.metric)).toEqual(["completed"]);
  expect(buildKpiDataReview([row, other]).courses.map(course => course.id)).toEqual(["other:c"]);
  expect(buildKpiDataReview([row, { ...other, started: 0 }]).courseCount).toBe(0);
});
