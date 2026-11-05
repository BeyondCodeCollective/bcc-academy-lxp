import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { aggregateLearnerAttendance } from "./learner-attendance-aggregates";
import type { MvpAttendanceSessionState } from "./attendance-verification";
const states: MvpAttendanceSessionState["state"][] = ["verified_present", "verified_absent", "excused", "unrecorded", "unresolved", "not_eligible"];
const roster = () => states.flatMap(state => Array.from({ length: 5 }, (_, i) => ({
  id: `private-${state}-${i}`, enrollments: [{ programId: "p1", courseSlug: "a",
    attendanceSessions: [{ weekNumber: 1, sessionNumber: 1, state }] as MvpAttendanceSessionState[] | null }],
})));
describe("attendance-by-session aggregates", () => {
  it("keeps all six states distinct and deduplicates learners and enrollments", () => {
    const learners = roster();
    learners[0].enrollments.push(learners[0].enrollments[0]);
    const result = aggregateLearnerAttendance([...learners, ...learners]);
    expect(result).toEqual({ state: "ready", rows: [{ programId: "p1", courseSlug: "a", weekNumber: 1, sessionNumber: 1,
      total: 30, counts: Object.fromEntries(states.map(s => [s, 5])) }] });
    expect(JSON.stringify(result)).not.toContain("private-");
  });
  it("separates programs, courses, weeks and sessions with stable ordering", () => {
    const learners = roster();
    for (const learner of learners) {
      const e = learner.enrollments[0];
      e.attendanceSessions!.push({ weekNumber: 2, sessionNumber: 2, state: "unrecorded" });
      learner.enrollments.push({ ...e, programId: "p2" }, { ...e, courseSlug: "b" });
    }
    const result = aggregateLearnerAttendance(learners);
    expect(result.state).toBe("ready");
    if (result.state === "ready") expect(result.rows).toHaveLength(6);
    expect(aggregateLearnerAttendance([...learners].reverse())).toEqual(result);
  });
  it("withholds the entire chart for small cells, including complementary totals", () => {
    expect(aggregateLearnerAttendance(roster().slice(1))).toEqual({ state: "suppressed" });
    expect(aggregateLearnerAttendance(roster().slice(0, 1))).toEqual({ state: "suppressed" });
    expect(aggregateLearnerAttendance(roster().slice(0, 5)).state).toBe("ready");
  });
  it("distinguishes empty schedules from unavailable or partial evidence", () => {
    expect(aggregateLearnerAttendance([])).toEqual({ state: "empty" });
    const learners = roster();
    learners.forEach(l => { l.enrollments[0].attendanceSessions = []; });
    expect(aggregateLearnerAttendance(learners)).toEqual({ state: "empty" });
    learners[0].enrollments[0].attendanceSessions = null;
    expect(aggregateLearnerAttendance(learners)).toEqual({ state: "unavailable" });
    const partial = roster();
    partial[0].enrollments[0].attendanceSessions = [];
    expect(aggregateLearnerAttendance(partial)).toEqual({ state: "unavailable" });
  });
  it("rejects conflicting duplicate evidence rather than inventing absence", () => {
    const learners = roster();
    learners[0].enrollments[0].attendanceSessions!.push({ weekNumber: 1, sessionNumber: 1, state: "verified_absent" });
    expect(aggregateLearnerAttendance(learners)).toEqual({ state: "unavailable" });
  });
});
