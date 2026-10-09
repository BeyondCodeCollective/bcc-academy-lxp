import { expect, it } from "vitest";
import { calculateMvpSessionsRemaining } from "./sessions-remaining";
const track = { slug: "course", name: "Course", shortName: "Course", totalWeeks: 2,
  startDate: "2026-10-01", sessionsPerWeek: 1, unitLabel: "Session", lastSessionDayOffset: 0,
  weekSummaries: [{ week: 1, date: "2026-10-01" }, { week: 2, date: "2026-10-10" }] };
const at = new Date("2026-10-08T20:00:00Z");
const completed = { week_number: 1, status: "completed", status_2: "upcoming", status_3: "upcoming" };
it("counts remaining sessions without subtracting future completed flags", () => {
  expect(calculateMvpSessionsRemaining(track, [completed, { ...completed, week_number: 2 }], at)).toMatchObject({ remaining: 1, total: 2, delivered: 1 });
});
it("counts overdue upcoming sessions as remaining", () => {
  expect(calculateMvpSessionsRemaining(track, [{ ...completed, status: "upcoming" }], at).remaining).toBe(2);
});
it("returns unavailable for missing or conflicting past delivery", () => {
  expect(calculateMvpSessionsRemaining(track, [], at).remaining).toBeNull();
  expect(calculateMvpSessionsRemaining(track, [completed, { ...completed, status: "upcoming" }], at).remaining).toBeNull();
});
it("deduplicates matching delivery and excludes labeled extras", () => {
  expect(calculateMvpSessionsRemaining({ ...track, weekSummaries: [...track.weekSummaries, { week: 3, date: "2026-10-11", label: "Exam" }] }, [completed, completed], at).remaining).toBe(1);
});
it("returns zero only when all required sessions are delivered", () => {
  expect(calculateMvpSessionsRemaining(track, [completed, { ...completed, week_number: 2 }], new Date("2026-10-12T20:00:00Z")).remaining).toBe(0);
});
it("handles future, self-paced and incomplete schedules", () => {
  expect(calculateMvpSessionsRemaining(track, [], new Date("2026-09-01T20:00:00Z")).remaining).toBe(2);
  expect(calculateMvpSessionsRemaining({ ...track, selfPaced: true }, [], at).remaining).toBeNull();
  expect(calculateMvpSessionsRemaining({ ...track, weekSummaries: [] }, [], at).remaining).toBeNull();
});
