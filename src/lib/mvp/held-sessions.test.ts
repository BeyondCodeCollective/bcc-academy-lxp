import { describe, expect, it } from "vitest";
import { resolveMvpHeldSessions, type MvpSessionDelivery } from "./held-sessions";
import { calculateMvpCoursePerformance } from "./course-performance";
import { calculateMvpSessionsRemaining } from "./sessions-remaining";
import { calculateMvpCompletion } from "./completion";
import type { MvpScheduleInput } from "./schedule";

const track: NonNullable<MvpScheduleInput["track"]> = {
  slug: "course", name: "Course", shortName: "Course", startDate: "2026-10-01",
  totalWeeks: 2, sessionsPerWeek: 1, unitLabel: "Session", lastSessionDayOffset: 0,
  weekSummaries: [{ week: 1, date: "2026-10-01" }, { week: 2, date: "2026-10-10" },
    { week: 3, date: "2026-10-02", label: "Optional exam" }],
};
const asOf = new Date("2026-10-08T18:00:00Z");
const completed: MvpSessionDelivery = { week_number: 1, status: "completed", status_2: "upcoming", status_3: "upcoming" };

describe("shared held-session validation", () => {
  it.each([
    ["missing", []],
    ["conflicting", [completed, { ...completed, status: "upcoming" }]],
    ["unknown", [{ ...completed, status: "unknown" }]],
  ] as const)("withholds recorded attendance as well as held counts for %s delivery", (_, rows) => {
    const delivery = [...rows];
    expect(resolveMvpHeldSessions(track, delivery, asOf).heldRequiredSessions).toBeNull();
    const performance = calculateMvpCoursePerformance(track, ["learner"], [], delivery, asOf);
    expect(performance.heldRequiredSessions).toBeNull();
    expect(performance.attendanceRate).toBeNull();
    expect(performance.attendanceQualified).toBeNull();
    expect(calculateMvpSessionsRemaining(track, delivery, asOf).delivered).toBeNull();
  });
  it("deduplicates matching evidence and ignores optional and future delivery conflicts", () => {
    const delivery = [completed, completed, { ...completed, week_number: 2 },
      { ...completed, week_number: 2, status: "upcoming" }, { ...completed, week_number: 3 }];
    const held = resolveMvpHeldSessions(track, delivery, asOf);
    expect(held).toMatchObject({ delivered: 1, total: 2, remaining: 1, unavailableReason: null });
    expect(held.heldRequiredSessions).toHaveLength(1);
    expect(calculateMvpCoursePerformance(track, [], [], delivery, asOf).heldRequiredSessions).toEqual(held.heldRequiredSessions);
  });
  it.each(["upcoming", "in_progress"])("distinguishes known zero held from unavailable for %s", status => {
    const delivery = [{ ...completed, status }];
    expect(resolveMvpHeldSessions(track, delivery, asOf)).toMatchObject({ heldRequiredSessions: [], delivered: 0, remaining: 2, unavailableReason: null });
    const performance = calculateMvpCoursePerformance(track, ["learner"], [], delivery, asOf);
    expect(performance.heldRequiredSessions).toEqual([]);
    expect(performance.attendanceRate).toBeNull(); // No attendance denominator.
  });
  it("does not turn an incomplete dated schedule into a partial attendance rate", () => {
    const incomplete = { ...track, weekSummaries: [{ week: 1, date: "2026-10-01" }] };
    expect(resolveMvpHeldSessions(incomplete, [completed], asOf).delivered).toBeNull();
    expect(calculateMvpCoursePerformance(incomplete, ["learner"], [], [completed], asOf).attendanceRate).toBeNull();
  });
  it("validates every required session within a weekly unit", () => {
    const weekly = { ...track, unitLabel: "Week", sessionsPerWeek: 2 };
    const delivery = [{ ...completed, status_2: "completed" }];
    expect(resolveMvpHeldSessions(weekly, delivery, asOf).delivered).toBe(2);
    expect(resolveMvpHeldSessions(weekly, [{ ...delivery[0], status_2: "" }], asOf).delivered).toBeNull();
  });
  it("uses Eastern calendar boundaries for required dates", () => {
    expect(resolveMvpHeldSessions(track, [], new Date("2026-10-01T03:59:59Z")).delivered).toBe(0);
    expect(resolveMvpHeldSessions(track, [], new Date("2026-10-01T04:00:00Z")).delivered).toBeNull();
  });
  it("does not certify completion from a completed row contradicted by another row", () => {
    const end = new Date("2026-10-12T18:00:00Z");
    const delivery = [completed, { ...completed, week_number: 2 }, { ...completed, status: "upcoming" }];
    expect(calculateMvpCompletion(track, ["learner"], [], delivery, end).completed).toBeNull();
  });
});
