import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { filterLearnersByChart } from "./learner-chart-filter";
import { attendanceLabels, parseChartSelection, type ChartSelection } from "./learner-chart-selection";
const states = Object.keys(attendanceLabels) as (keyof typeof attendanceLabels)[];
const population = () => states.flatMap(state => Array.from({ length: 5 }, (_, i) => ({ id: `${state}${i}`, enrollments: [{
  programId: "p1", courseSlug: "a", attendanceSessions: [{ weekNumber: 1, sessionNumber: 1, state }], weeklyMilestones: [],
}] })));
const selection = (measure: keyof typeof attendanceLabels): ChartSelection => ({ kind: "attendance", programId: "p1", courseSlug: "a", weekNumber: 1, sessionNumber: 1, measure });
describe("chart directory filtering", () => {
  it.each(states)("keeps %s distinct and deduplicates chart counts", state => {
    const rows = population();
    rows[0].enrollments.push(rows[0].enrollments[0]);
    const result = filterLearnersByChart(rows, selection(state));
    expect(result.learners.map(row => row.id)).toEqual(Array.from({ length: 5 }, (_, i) => `${state}${i}`));
    expect(result.charts.attendance.state).toBe("ready");
  });
  it("rejects a large cell when its complementary cell is suppressed", () => {
    const rows = population().filter(row => !row.id.startsWith("excused") || row.id === "excused0");
    expect(() => filterLearnersByChart(rows, selection("verified_present"))).toThrow("unavailable");
    expect(filterLearnersByChart(rows, null).charts.attendance).toEqual({ state: "suppressed" });
  });
  it.each([[], "{", "null", "[]", "0", JSON.stringify({ kind: "attendance" }), "x".repeat(1001)])("rejects malformed selectors %j", raw => {
    expect(() => parseChartSelection(raw)).toThrow();
  });
  it("fails closed when attendance evidence becomes unavailable", () => {
    const rows = population().map(row => ({ ...row, enrollments: row.enrollments.map(e => ({ ...e, attendanceSessions: null })) }));
    expect(() => filterLearnersByChart(rows, selection("unrecorded"))).toThrow();
  });
});
