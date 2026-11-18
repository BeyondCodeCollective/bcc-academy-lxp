import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LearnerWeeklyMilestones } from "@/lib/mvp/learner-activity";
import { LearnerMilestoneHistory } from "./learner-milestone-history";

const none = { at: null, state: "none_recorded" as const };
const week = (weekNumber: number | null): LearnerWeeklyMilestones => ({ weekNumber, submission: none, reflection: none, markedWatched: none });
const render = (weeks: LearnerWeeklyMilestones[]) => renderToStaticMarkup(createElement(LearnerMilestoneHistory, { weeks }));

describe("Weekly milestone evidence", () => {
  it("shows all three timestamps with Eastern daylight and standard time", () => {
    const html = render([{ weekNumber: 1,
      submission: { state: "recorded", at: "2026-07-15T15:30:00Z" },
      reflection: { state: "recorded", at: "2026-12-15T15:30:00Z" },
      markedWatched: { state: "recorded", at: "2026-12-15T12:00:00-05:00" },
    }]);
    for (const label of ["Submission", "Reflection", "Marked-watched"]) expect(html).toContain(`>${label}</dt>`);
    expect(html).toContain('dateTime="2026-07-15T15:30:00.000Z"');
    expect(html).toContain("11:30 AM EDT");
    expect(html).toContain("10:30 AM EST");
    expect(html).toContain('dateTime="2026-12-15T17:00:00.000Z"');
    expect(html).toContain("12:00 PM EST");
    expect(html).toContain("not proof of viewing");
    expect(html).toContain("Missing timestamps alone do not establish overdue work");
  });
  it("keeps missing and unavailable timestamps distinct", () => {
    const html = render([{ ...week(1), reflection: { at: null, state: "unavailable" } }]);
    expect(html.match(/No timestamp recorded/g)).toHaveLength(2);
    expect(html.match(/Timestamp unavailable/g)).toHaveLength(1);
    expect(html).not.toContain("<time");
  });
  it.each([null, "invalid", "2026-07-15T15:30:00"])("does not render invalid or timezone-free recorded value %s", at => {
    const html = render([{ ...week(1), submission: { at, state: "recorded" } }]);
    expect(html).toContain("Timestamp unavailable");
    expect(html).not.toContain("<time");
  });
  it("honors unavailable state even when a timestamp exists", () => {
    const html = render([{ ...week(1), submission: { at: "2026-07-15T15:30:00Z", state: "unavailable" } }]);
    expect(html).toContain("Timestamp unavailable");
    expect(html).not.toContain("<time");
  });
  it("sorts known weeks before unlinked history without mutating evidence", () => {
    const weeks = [week(null), week(3), week(1)];
    const original = structuredClone(weeks);
    const html = render(weeks);
    expect(html.indexOf("Week 1")).toBeLessThan(html.indexOf("Week 3"));
    expect(html.indexOf("Week 3")).toBeLessThan(html.indexOf("Week not linked"));
    expect(html).not.toContain("Week 0");
    expect(weeks).toEqual(original);
  });
  it("shows an empty history without inventing weeks or completion", () => {
    const html = render([]);
    expect(html).toContain("No milestone activity recorded in this scope.");
    expect(html).not.toContain("<time");
    expect(html).not.toContain("<li");
    expect(html).not.toContain("On Track");
  });
});
