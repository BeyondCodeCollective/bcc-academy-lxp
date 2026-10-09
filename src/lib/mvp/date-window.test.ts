import { describe, expect, it } from "vitest";
import { matchesMvpDateWindow, parseMvpDateWindow } from "./date-window";

describe("MVP offering date selection", () => {
  it("includes an August–October offering in September", () => {
    expect(matchesMvpDateWindow({ startDate: "2026-08-01", endDate: "2026-10-31" },
      parseMvpDateWindow("2026-09-01", "2026-09-30"))).toBe(true);
  });
  it("includes boundary dates and rejects non-overlap", () => {
    const offering = { startDate: "2026-09-30", endDate: "2026-09-30" };
    expect(matchesMvpDateWindow(offering, parseMvpDateWindow(null, "2026-09-30"))).toBe(true);
    expect(matchesMvpDateWindow(offering, parseMvpDateWindow("2026-10-01", null))).toBe(false);
  });
  it("distinguishes unknown schedules from non-matches", () => {
    const offering = { startDate: null, endDate: null };
    expect(matchesMvpDateWindow(offering, parseMvpDateWindow("2026-09-01", null))).toBeNull();
    expect(matchesMvpDateWindow(offering, parseMvpDateWindow(null, null))).toBe(true);
  });
  it.each([["2026-02-30", null], ["invalid", null], ["2026-10-01", "2026-09-01"]])(
    "rejects invalid input %s / %s", (start, end) => {
      expect(() => parseMvpDateWindow(start, end)).toThrow();
    });
});
