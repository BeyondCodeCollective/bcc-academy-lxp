import { describe, it, expect } from "vitest";
import { buildWelcome } from "@/lib/onboarding/welcome";

const track = (over: Record<string, unknown> = {}) => ({
  slug: "labs",
  name: "Catalyst Labs",
  instructor: "Jahiarra Mitchell",
  startDate: "2026-10-14",
  weekSummaries: [{ week: 1, date: "2026-10-14", time: "14:00", durationMinutes: 90 }],
  ...over,
});
const now = (iso: string) => new Date(iso);

describe("buildWelcome", () => {
  it("returns nothing when the learner has no courses", () => {
    expect(buildWelcome([], now("2026-10-04T12:00:00Z"))).toBeNull();
  });

  it("names the course, instructor and the first session in Eastern time", () => {
    const w = buildWelcome([track()], now("2026-10-04T12:00:00Z"))!;
    expect(w.course).toBe("Catalyst Labs");
    expect(w.instructor).toBe("Jahiarra Mitchell");
    expect(w.whenLine).toBe("Your first session is Wednesday, October 14 at 2:00 PM ET.");
  });

  it("says 'next' once an earlier session has already happened", () => {
    const t = track({
      weekSummaries: [
        { week: 1, date: "2026-09-30", time: "10:00", durationMinutes: 90 },
        { week: 2, date: "2026-10-14", time: "14:00", durationMinutes: 90 },
      ],
    });
    expect(buildWelcome([t], now("2026-10-04T12:00:00Z"))!.whenLine).toContain("Your next session is");
  });

  it("says so when a session is running right now", () => {
    expect(buildWelcome([track()], now("2026-10-14T18:30:00Z"))!.whenLine).toBe(
      "Your session is happening right now.",
    );
  });

  it("picks the soonest session across several courses and counts the rest", () => {
    const later = track({ slug: "b", name: "Course B", weekSummaries: [{ week: 1, date: "2026-11-02", time: "18:00" }] });
    const w = buildWelcome([later, track()], now("2026-10-04T12:00:00Z"))!;
    expect(w.course).toBe("Catalyst Labs");
    expect(w.alsoEnrolled).toBe(1);
  });

  it("falls back to the start date when no sessions are scheduled", () => {
    const w = buildWelcome([track({ weekSummaries: [] })], now("2026-10-04T12:00:00Z"))!;
    expect(w.whenLine).toBe("Your course starts Wednesday, October 14.");
  });

  it("is honest when dates are not set", () => {
    const w = buildWelcome([track({ weekSummaries: [], startDateTbd: true })], now("2026-10-04T12:00:00Z"))!;
    expect(w.whenLine).toContain("still being set");
  });

  it("gives no timing line for a course that is underway with nothing scheduled", () => {
    const w = buildWelcome([track({ weekSummaries: [], startDate: "2026-09-01" })], now("2026-10-04T12:00:00Z"))!;
    expect(w.whenLine).toBeNull();
  });

  it("omits a blank instructor", () => {
    expect(buildWelcome([track({ instructor: "  " })], now("2026-10-04T12:00:00Z"))!.instructor).toBeNull();
  });
});
