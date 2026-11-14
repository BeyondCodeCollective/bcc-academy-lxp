import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LearnerCharts } from "./learner-charts";
import { protectLearnerAttendance, protectLearnerMilestones } from "@/lib/mvp/learner-chart-data";

describe("Learner chart release and rendering", () => {
  it.each([1, 2, 3, 4])("rejects ready-marked unsafe cells and complements of %i on all display surfaces", n => {
    const html = renderToStaticMarkup(createElement(LearnerCharts, {
      attendance: { state: "ready", rows: [
        { id: "secret-session", label: "PRIVATE session", eligible: 100, present: 100 - n, absent: n, unrecorded: 0 },
        { id: "related-session", label: "RELATED session", eligible: 100, present: 50, absent: 50, unrecorded: 0 },
      ] },
      milestones: { state: "ready", rows: [
        { id: "secret-week", label: "PRIVATE week", eligible: 100, submissions: 100 - n, reflections: 50, markedWatched: 50 },
        { id: "related-week", label: "RELATED week", eligible: 100, submissions: 50, reflections: 50, markedWatched: 50 },
      ] },
    }));
    expect(html.match(/Data withheld for privacy/g)).toHaveLength(2);
    for (const hidden of ["PRIVATE", "RELATED", "secret-", "related-", "<table", "<button", "<title", "title=", "<circle", "<polyline"])
      expect(html).not.toContain(hidden);
  });
  it("projects only approved fields before a safe dataset is serialized", () => {
    const attendance = { id: "s", label: "Session", eligible: 10, present: 5, absent: 5, unrecorded: 0 };
    const milestones = { id: "w", label: "Week", eligible: 10, submissions: 5, reflections: 0, markedWatched: 10 };
    expect(protectLearnerAttendance([{ ...attendance, ...{ rawCount: 1, tooltip: "PRIVATE" } }])).toEqual({ state: "ready", rows: [attendance] });
    expect(protectLearnerMilestones([{ ...milestones, ...{ learnerIds: ["PRIVATE"], rawCount: 1 } }])).toEqual({ state: "ready", rows: [milestones] });
  });
  it("renders both empty frontend panels without sample counts or selections", () => {
    const html = renderToStaticMarkup(createElement(LearnerCharts));
    expect(html).toContain("Attendance by session");
    expect(html).toContain("Weekly milestone activity");
    expect(html.match(/Chart data unavailable/g)).toHaveLength(2);
    expect(html).not.toContain("<button");
    expect(html).toContain("not that a learner was absent");
  });
  it.each([1, 2, 3, 4])("removes all labels and selection targets for small attendance groups of %i", n => {
    const attendance = protectLearnerAttendance([{ id: "private-id", label: "Private course", eligible: 20, present: 20 - n, absent: n, unrecorded: 0 }]);
    expect(attendance).toEqual({ state: "suppressed" });
    const html = renderToStaticMarkup(createElement(LearnerCharts, { attendance }));
    expect(html).toContain("Data withheld for privacy");
    expect(html).not.toContain("Private course");
    expect(html).not.toContain("private-id");
    expect(html).not.toContain("<button");
  });
  it("suppresses small milestone counts and small complements in a large population", () => {
    for (const submissions of [1, 4, 96, 99]) {
      expect(protectLearnerMilestones([{ id: "w1", label: "Private week", eligible: 100, submissions, reflections: 50, markedWatched: 60 }])).toEqual({ state: "suppressed" });
    }
    const html = renderToStaticMarkup(createElement(LearnerCharts, { milestones: { state: "suppressed" } }));
    expect(html).not.toContain("<svg viewBox=\"0 0 480 240\"");
    expect(html).not.toContain("<button");
  });
  it("preserves true zeros and threshold-five counts in safe charts", () => {
    const attendance = protectLearnerAttendance([{ id: "s1", label: "Course A · Session 1", eligible: 10, present: 5, absent: 0, unrecorded: 5 }]);
    const milestones = protectLearnerMilestones([{ id: "w1", label: "Course A · Week 1", eligible: 10, submissions: 5, reflections: 0, markedWatched: 10 }]);
    expect(attendance.state).toBe("ready");
    expect(milestones.state).toBe("ready");
    const html = renderToStaticMarkup(createElement(LearnerCharts, { attendance, milestones }));
    expect(html).toContain("Verified absent");
    expect(html).toContain("Course A · Session 1 · Unrecorded: 5 learners");
    expect(html).toContain("Course A · Week 1 · Submissions: 5");
    expect(html).toContain('scope="col"');
    expect(html).toContain('type="button"');
    expect(html).toContain(">0</button>");
  });
  it("keeps empty data distinct from invalid or incomplete evidence", () => {
    expect(protectLearnerAttendance([])).toEqual({ state: "empty" });
    expect(protectLearnerMilestones([])).toEqual({ state: "empty" });
    expect(protectLearnerAttendance([{ id: "s", label: "Session", eligible: 10, present: 5, absent: 0, unrecorded: 0 }])).toEqual({ state: "unavailable" });
    expect(protectLearnerMilestones([{ id: "w", label: "Week", eligible: 10, submissions: 11, reflections: 0, markedWatched: 0 }])).toEqual({ state: "unavailable" });
    expect(protectLearnerMilestones([{ id: "w", label: "Week", eligible: 10, submissions: NaN, reflections: 0, markedWatched: 0 }])).toEqual({ state: "unavailable" });
  });
});
