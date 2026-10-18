import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgramParticipants } from "./mvp-components/program-participants";
import type { MvpDashboardData } from "@/lib/mvp/types";

const participant: NonNullable<MvpDashboardData["participants"]>[number] = {
  learnerId: "learner", programId: "program", programName: "Program", programRowId: "program:course",
  courseSlug: "course", courseName: "Course", name: "Example Learner", email: "learner@example.test", active: true,
  caughtUp: { percent: 50, completedSessions: 1, applicableSessions: 2, unavailableReason: null },
  lastActivity: { at: "2026-10-16T18:30:00.000Z", status: "recorded" },
};
function render(rows: MvpDashboardData["participants"], selected = true, loading = false) {
  return renderToStaticMarkup(createElement(ProgramParticipants, { participants: rows, programSelected: selected, loading }));
}
describe("program participant card", () => {
  it("renders three columns with contacts, learner progress and timezone-labelled activity", () => {
    const html = render([participant]);
    for (const text of ["Example Learner", "learner@example.test", "Course", "Active", "50%", "2:30 PM EDT"]) expect(html).toContain(text);
    expect(html.match(/scope="col"/g)).toHaveLength(3);
    expect(html).toContain("Learner Progress");
    expect(html).not.toContain("Active status");
    expect(html).toContain('dateTime="2026-10-16T18:30:00.000Z"');
  });
  it("keeps real zero separate from unavailable and does not round up to 100", () => {
    expect(render([{ ...participant, caughtUp: { percent: 0, completedSessions: 0, applicableSessions: 2, unavailableReason: null } }])).toContain('>0%</span>');
    expect(render([{ ...participant, caughtUp: { percent: 99.99, completedSessions: 9999, applicableSessions: 10000, unavailableReason: null } }])).toContain("99.9%");
    const html = render([{ ...participant, active: null,
      caughtUp: { percent: null, completedSessions: null, applicableSessions: null, unavailableReason: "Requirements not configured" },
      lastActivity: { at: null, status: "none_recorded" } }]);
    expect(html).not.toContain('role="progressbar"');
    expect(html).toContain("Requirements not configured");
    expect(html).toContain("No recorded activity");
  });
  it("distinguishes program selection, empty roster and unavailable data", () => {
    expect(render(undefined, false)).toContain("Choose a program");
    expect(render([])).toContain("No participants match");
    expect(render([]).match(/scope="col"/g)).toHaveLength(3);
    expect(render(undefined)).toContain("Participant details are unavailable");
    expect(render([participant], false)).not.toContain(participant.email!);
  });
  it("announces loading and keeps separate rows for separate courses", () => {
    const html = render([participant, { ...participant, programRowId: "program:second", courseSlug: "second", courseName: "Second course" }], true, true);
    expect(html).toContain("Updating participants");
    expect(html).toContain("Second course");
    expect(html.match(/learner@example.test/g)).toHaveLength(2);
  });
});
