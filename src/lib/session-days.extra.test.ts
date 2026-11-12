import { describe, expect, it } from "vitest";
import { sessionDates } from "./session-days";

const ev = (date: string, type = "class") => ({ date, type, time: "", label: "" }) as never;

describe("sessionDates edges", () => {
  it("returns all nulls without a week date or sessions", () => {
    expect(sessionDates(undefined, 2)).toEqual([null, null]);
    expect(sessionDates("2026-11-09", 0)).toEqual([]);
  });

  it("session 1 is the week date; later ones come from in-window class events only", () => {
    const sched = [ev("2026-11-12"), ev("2026-11-11", "office-hours"), ev("2026-11-16"), ev("2026-11-09")];
    // window is (start, start+7d): the 16th is exactly 7 days out and excluded; the 9th equals start and is excluded.
    expect(sessionDates("2026-11-09", 3, sched)).toEqual(["2026-11-09", "2026-11-12", null]);
  });

  it("sorts events regardless of input order and ignores a time part on the week date", () => {
    expect(sessionDates("2026-11-09T14:00:00Z", 3, [ev("2026-11-13"), ev("2026-11-11")])).toEqual([
      "2026-11-09",
      "2026-11-11",
      "2026-11-13",
    ]);
  });

  it("the window is calendar days, so the DST change inside it does not drop a day", () => {
    // 2026-11-01 fall back falls inside the window starting 2026-10-28.
    expect(sessionDates("2026-10-28", 2, [ev("2026-11-03")])).toEqual(["2026-10-28", "2026-11-03"]);
  });
});
