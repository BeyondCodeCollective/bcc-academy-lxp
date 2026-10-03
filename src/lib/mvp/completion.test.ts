import { describe, expect, it } from "vitest";
import { calculateMvpCompletion } from "./completion";
import type { MvpScheduleInput } from "./schedule";
import type { MvpAttendanceRecord } from "./milestones";

// A five-session course makes the approved 80% boundary explicit.
const track: NonNullable<MvpScheduleInput["track"]> = {
  slug: "course", name: "Course", shortName: "Course", unitLabel: "Session",
  startDate: "2026-09-01", totalWeeks: 5, sessionsPerWeek: 2,
  lastSessionDayOffset: 0,
  weekSummaries: Array.from({ length: 5 }, (_, i) => ({ week: i + 1, date: `2026-09-0${i + 1}` })),
};
const delivery = track.weekSummaries!.map((unit) => ({
  week_number: unit.week, status: "completed", status_2: "upcoming", status_3: "upcoming",
}));
const asOf = new Date("2026-09-06T18:00:00Z");
function records(count: number): MvpAttendanceRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `record-${i}`, student_id: "a", track: "course", week_number: i + 1,
    session_number: 1, checked_in_at: null,
  }));
}
describe("attendance-based course completion", () => {
  it("accepts exactly 80% and uses the current roster as the rate denominator", () => {
    const result = calculateMvpCompletion(track, ["a", "b", "a"], records(4), delivery, asOf);
    expect(result.completedLearnerIds).toEqual(["a"]);
    expect(result.completionRate).toBe(50);
  });
  it("does not count optional or duplicate records toward the threshold", () => {
    const result = calculateMvpCompletion(track, ["a"], [...records(3), ...records(3), { ...records(1)[0], week_number: 99 }], delivery, asOf);
    expect(result.completed).toBe(0);
  });
  it("does not graduate learners midway through delivery", () => {
    expect(calculateMvpCompletion(track, ["a"], records(5), delivery.slice(0, 4), asOf).completed).toBeNull();
  });
  it("does not use future completion flags", () => {
    expect(calculateMvpCompletion(track, ["a"], records(5), delivery, new Date("2026-09-03T18:00:00Z")).completed).toBeNull();
  });
  it("requires the full schedule", () => {
    expect(calculateMvpCompletion({ ...track, weekSummaries: track.weekSummaries!.slice(0, 4) }, ["a"], records(4), delivery, asOf).completed).toBeNull();
  });
  it("keeps an empty roster rate unavailable", () => {
    expect(calculateMvpCompletion(track, [], [], delivery, asOf).completionRate).toBeNull();
  });
});
