import { expect, it } from "vitest";
import { resolveMvpLifecycle, countMvpUpcomingEnrollments } from "./lifecycle";
import type { MvpScheduleInput } from "./schedule";

// Fixed dates exercise Eastern-day boundaries and distinguish scheduled end
// from verified completion without relying on the machine's current time.
const track: NonNullable<MvpScheduleInput["track"]> = {
  slug: "course", name: "Course", shortName: "Course", totalWeeks: 2,
  sessionsPerWeek: 1, unitLabel: "Session", startDate: "2026-10-01",
  lastSessionDayOffset: 0,
  weekSummaries: [{ week: 1, date: "2026-10-01" }, { week: 2, date: "2026-10-03" }],
};
it("keeps a course upcoming until its Eastern start day", () => {
  expect(resolveMvpLifecycle(track, new Date("2026-10-01T01:00:00Z"), false).status).toBe("starting_soon");
});
it("keeps the final scheduled day active", () => {
  expect(resolveMvpLifecycle(track, new Date("2026-10-03T18:00:00Z"), true).status).toBe("active");
});
it("requires delivery confirmation after the scheduled end", () => {
  const at = new Date("2026-10-04T18:00:00Z");
  expect(resolveMvpLifecycle(track, at, false).status).toBe("unknown");
  expect(resolveMvpLifecycle(track, at, true).status).toBe("completed");
});
it("does not invent an end date for a partial schedule", () => {
  expect(resolveMvpLifecycle({ ...track, weekSummaries: track.weekSummaries!.slice(0, 1) }, new Date("2026-10-02T18:00:00Z"), false).endDate).toBeNull();
});
it("does not treat self-paced or TBD schedules as upcoming", () => {
  const at = new Date("2026-09-01T18:00:00Z");
  expect(resolveMvpLifecycle({ ...track, selfPaced: true }, at, false).status).toBe("unknown");
  expect(resolveMvpLifecycle({ ...track, startDateTbd: true }, at, false).status).toBe("unknown");
});
it("counts future enrollments without counting active courses", () => {
  expect(countMvpUpcomingEnrollments([{ status: "starting_soon", enrolledBeforeStart: 8 }, { status: "active", enrolledBeforeStart: null }])).toBe(8);
});
it("does not publish incomplete upcoming totals", () => {
  expect(countMvpUpcomingEnrollments([{ status: "unknown", enrolledBeforeStart: null }])).toBeNull();
});
