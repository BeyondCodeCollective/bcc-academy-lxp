import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MvpAttendanceSessionState } from "@/lib/mvp/attendance-verification";
import { LearnerAttendanceHistory } from "./learner-attendance-history";

function render(sessions: MvpAttendanceSessionState[] | null, unavailableReason: string | null = null) {
  return renderToStaticMarkup(createElement(LearnerAttendanceHistory, { sessions, unavailableReason }));
}

describe("Attendance evidence history", () => {
  it.each([
    ["verified_present", "Verified present"], ["verified_absent", "Verified absent"],
    ["excused", "Excused"], ["unrecorded", "Unrecorded"],
    ["unresolved", "Unresolved"], ["not_eligible", "Not eligible"],
  ] as const)("renders %s with its distinct text label", (state, label) => {
    const html = render([{ weekNumber: 2, sessionNumber: 3, state }]);
    expect(html).toContain("Week 2 · Session 3");
    expect(html).toContain(`>${label}</span>`);
    expect(html).toContain('aria-label="Attendance sessions"');
    if (state !== "verified_absent") expect(html).not.toContain(">Verified absent</span>");
    expect(html).not.toContain("<time");
  });
  it("orders by week and session without changing the evidence input", () => {
    const sessions: MvpAttendanceSessionState[] = [
      { weekNumber: 2, sessionNumber: 1, state: "verified_present" },
      { weekNumber: 1, sessionNumber: 2, state: "unrecorded" },
      { weekNumber: 1, sessionNumber: 1, state: "excused" },
    ];
    const original = structuredClone(sessions);
    const html = render(sessions);
    expect(html.indexOf("Week 1 · Session 1")).toBeLessThan(html.indexOf("Week 1 · Session 2"));
    expect(html.indexOf("Week 1 · Session 2")).toBeLessThan(html.indexOf("Week 2 · Session 1"));
    expect(sessions).toEqual(original);
  });
  it("distinguishes unavailable history from a known empty schedule", () => {
    const unavailable = render(null, "Verified course schedule is unavailable.");
    expect(unavailable).toContain("Attendance history unavailable.");
    expect(unavailable).toContain("Verified course schedule is unavailable.");
    expect(unavailable).not.toContain("No verified held required sessions");
    const empty = render([]);
    expect(empty).toContain("No verified held required sessions in this scope.");
    expect(empty).not.toContain("Attendance history unavailable.");
    expect(empty).not.toContain("On Track");
  });
  it("retains session history when the attendance calculation cannot be evaluated", () => {
    const html = render([{ weekNumber: 1, sessionNumber: 1, state: "excused" },
      { weekNumber: 1, sessionNumber: 2, state: "not_eligible" }], "Denominator policy unavailable.");
    expect(html).toContain("Attendance calculation: Not evaluated.");
    expect(html).toContain("Denominator policy unavailable.");
    expect(html).toContain(">Excused</span>");
    expect(html).toContain(">Not eligible</span>");
    expect(html).toContain("approved denominator policy");
    expect(html).not.toContain("Attendance history unavailable.");
  });
});
