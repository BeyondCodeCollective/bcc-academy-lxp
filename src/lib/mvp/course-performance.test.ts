import { describe, expect, it } from "vitest";
import { calculateMvpCoursePerformance, getMvpStartSlots } from "./course-performance";
import type { MvpScheduleInput } from "./schedule";

// A session-based course has a kickoff, two teaching sessions, and an exam.
const track: NonNullable<MvpScheduleInput["track"]> = {
  slug: "course", name: "Course", shortName: "Course", totalWeeks: 2,
  sessionsPerWeek: 2, unitLabel: "Session", startDate: "2026-10-01",
  lastSessionDayOffset: 0,
  weekSummaries: [
    { week: 0, date: "2026-10-01", label: "Kickoff" },
    { week: 1, date: "2026-10-02" },
    { week: 2, date: "2026-10-05" },
    { week: 3, date: "2026-10-06", label: "Exam" },
  ],
};
const asOf = new Date("2026-10-03T18:00:00Z");

describe("course performance integration", () => {
  it("counts 80% of held sessions, excluding future sessions and duplicate evidence", () => {
    const longTrack = { ...track, totalWeeks: 6, weekSummaries: Array.from({ length: 6 }, (_, index) =>
      ({ week: index + 1, date: `2026-10-${String(index + 1).padStart(2, "0")}` })) };
    const records = [1, 2, 3, 4, 4, 6].map((week, index) => ({ id: `r${index}`, student_id: "a", track: "course",
      week_number: week, session_number: 1, checked_in_at: null }));
    const delivery = [1, 2, 3, 4, 5, 6].map((week) => ({ week_number: week, status: "completed", status_2: "upcoming", status_3: "upcoming" }));
    const result = calculateMvpCoursePerformance(longTrack, ["a", "a"], records, delivery,
      new Date("2026-10-05T23:00:00Z"), "p:course", { kind: "cohort", attendanceThreshold: 80, submissionsRequired: false });
    expect(result.attendanceQualified).toBe(1);
    expect(result.active).toBe(1);
  });
  it("keeps required-work eligibility unknown even when attendance qualifies", () => {
    const result = calculateMvpCoursePerformance(track, ["a"], [{ id: "r", student_id: "a", track: "course",
      week_number: 1, session_number: 1, checked_in_at: null }],
      [{ week_number: 1, status: "completed", status_2: "upcoming", status_3: "upcoming" }], asOf, "p:course",
      { kind: "cohort", attendanceThreshold: 80, submissionsRequired: true });
    expect(result.attendanceQualified).toBe(1);
    expect(result.active).toBeNull();
    expect(result.activeUnavailableReason).toContain("submission");
  });
  it("does not infer an active policy from attendance alone", () => {
    const result = calculateMvpCoursePerformance(track, ["a"], [], [], asOf);
    expect(result.attendanceQualified).toBeNull();
    expect(result.active).toBeNull();
    expect(result.activeUnavailableReason).toContain("not configured");
  });
  it("maps kickoff and first teaching session but never the exam", () => {
    expect(getMvpStartSlots(track)?.map((slot) => slot.weekNumber)).toEqual([0, 1]);
  });
  it("requires a precise start mapping for multi-session weekly courses", () => {
    expect(getMvpStartSlots({ ...track, unitLabel: "Week" })).toBeNull();
  });
  it("aggregates attendance over explicitly completed sessions and deduplicated learners", () => {
    const result = calculateMvpCoursePerformance(track, ["a", "b", "a"], [{
      id: "attendance", student_id: "a", track: "course", week_number: 1,
      session_number: 1, checked_in_at: null,
    }], [{ week_number: 1, status: "completed", status_2: "upcoming", status_3: "upcoming" }], asOf);
    expect(result).toMatchObject({ started: 1, attendanceRate: 50, startedLearnerIds: ["a"] });
  });
  it("does not call missing delivery metadata zero attendance", () => {
    expect(calculateMvpCoursePerformance(track, ["a"], [], [], asOf).attendanceRate).toBeNull();
  });
  it("does not infer a completion or attendance rate from future delivery flags", () => {
    const result = calculateMvpCoursePerformance(track, ["a"], [], [
      { week_number: 2, status: "completed", status_2: "upcoming", status_3: "upcoming" },
    ], asOf);
    expect(result.attendanceRate).toBeNull();
  });
});
