import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { directoryPage, LearnerDirectory, selectDirectoryLearners, type DirectoryLearner, type DirectoryEnrollment } from "./learner-directory";
import { EMPTY_LEARNER_FILTERS as filters } from "./learner-filters";

const enrollment: DirectoryEnrollment = {
  programId: "p1", programName: "Program One", courseSlug: "course-a", courseName: "Course A",
  cohort: { id: "co1", name: "Cohort One" }, attendance: { present: 3, eligibleHeld: 5 },
  lastActivity: { state: "recorded", at: "2026-10-20T15:30:00Z" }, status: "not_evaluated",
};
const learner: DirectoryLearner = { id: "student-1", firstName: "Test", lastName: "Learner", email: "test@example.test", enrollments: [enrollment] };
const second = { ...enrollment, programId: "p2", courseSlug: "course-b", courseName: "Course B", cohort: null, attendance: { present: 1, eligibleHeld: 2 }, status: "needs_check_in" as const };
const render = (learners?: DirectoryLearner[]) => renderToStaticMarkup(createElement(LearnerDirectory, { filters, learners }));

describe("Learner directory", () => {
  it("shows progress separately for each course, never averaging or pooling it", () => {
    const html = render([{ ...learner, enrollments: [
      { ...enrollment, caughtUp: { percent: 50, completedSessions: 1, applicableSessions: 2, unavailableReason: null } },
      { ...second, caughtUp: { percent: 100, completedSessions: 4, applicableSessions: 4, unavailableReason: null } },
    ] }]);
    expect(html).toContain("Course progress");
    expect(html).toContain("50% caught up");
    expect(html).toContain("100% caught up");
    expect(html).toContain("1/2 applicable held sessions fully satisfied");
    expect(html).toContain("4/4 applicable held sessions fully satisfied");
    expect(html).not.toContain("75%");
    expect(html).not.toContain("83.3%");
    expect(html).not.toContain("5/6 applicable");
  });
  it("keeps unavailable progress distinct from known zero and never infers status", () => {
    const html = render([{ ...learner, enrollments: [
      { ...enrollment, caughtUp: { percent: 0, completedSessions: 0, applicableSessions: 2, unavailableReason: null } },
      { ...second, caughtUp: { percent: null, completedSessions: null, applicableSessions: null, unavailableReason: "Requirements are not configured." } },
    ] }]);
    expect(html.match(/0% caught up/g)).toHaveLength(1);
    expect(html).toContain("Requirements are not configured.");
    expect(html).toContain("Not evaluated");
    expect(html).not.toContain("On Track");
    expect(render([learner])).not.toContain("% caught up");
  });
  it.each([NaN, -1, 101, 75])("does not render malformed or inconsistent progress: %s", percent => {
    const html = render([{ ...learner, enrollments: [{ ...enrollment,
      caughtUp: { percent, completedSessions: 1, applicableSessions: 2, unavailableReason: null },
    }] }]);
    expect(html).toContain("Unavailable");
    expect(html).not.toContain("% caught up");
  });
  it("deduplicates learner IDs and enrollment rows without pooling attendance", () => {
    const rows = selectDirectoryLearners([learner, learner, { ...learner, enrollments: [second] }], filters);
    expect(rows).toHaveLength(1);
    expect(rows[0].enrollments).toEqual([enrollment, second]);
    const html = render(rows);
    expect(html.match(/test@example.test/g)).toHaveLength(1);
    expect(html).toContain("3/5 eligible held sessions");
    expect(html).toContain("1/2 eligible held sessions");
    expect(html).not.toContain("4/7");
  });
  it("matches search and all scope filters on the same enrollment", () => {
    const rows = [{ ...learner, enrollments: [enrollment, second] }];
    expect(selectDirectoryLearners(rows, { ...filters, search: " TEST@EXAMPLE " })).toHaveLength(1);
    expect(selectDirectoryLearners(rows, { ...filters, search: "test learner" })).toHaveLength(1);
    expect(selectDirectoryLearners(rows, { ...filters, programId: "p1", status: "needs_check_in" })).toEqual([]);
    expect(selectDirectoryLearners(rows, { ...filters, programId: "p1", courseSlug: "course-a", cohortId: "co1" })[0].enrollments).toEqual([enrollment]);
    expect(selectDirectoryLearners(rows, { ...filters, status: "needs_check_in" })[0].enrollments).toEqual([second]);
    expect(selectDirectoryLearners(rows, { ...filters, search: "not found" })).toEqual([]);
  });
  it("fails closed on inconsistent duplicate facts", () => {
    expect(() => selectDirectoryLearners([learner, { ...learner, email: "different@example.test" }], filters)).toThrow();
    const conflicting = { ...learner, enrollments: [{ ...enrollment, attendance: null }] };
    expect(() => selectDirectoryLearners([learner, conflicting], filters)).toThrow();
    const html = render([learner, conflicting]);
    expect(html).toContain("records are inconsistent");
    expect(html).not.toContain(learner.email);
  });
  it("paginates without losing records and clamps invalid pages", () => {
    const rows = Array.from({ length: 27 }, (_, i) => i);
    expect(directoryPage(rows, 1, 25).rows).toHaveLength(25);
    expect(directoryPage(rows, 2, 25)).toMatchObject({ rows: [25, 26], start: 26, end: 27, page: 2, pages: 2 });
    expect(directoryPage(rows, 999, 25).page).toBe(2);
    expect(directoryPage(rows, NaN, 25).page).toBe(1);
    expect(directoryPage(rows, -1, 0).rows).toHaveLength(25);
    expect(directoryPage([], 2, 10)).toMatchObject({ rows: [], start: 0, end: 0, page: 1 });
  });
  it("renders only the first page with a distinct matching learner count", () => {
    const html = render(Array.from({ length: 26 }, (_, i) => ({ ...learner, id: String(i) })));
    expect(html.match(/scope="row"/g)).toHaveLength(25);
    expect(html).toContain("26 matching learners");
    expect(html).toContain("Showing 1–25 of 26");
    expect(html).toContain("Page 1 of 2");
  });
  it("distinguishes disconnected, empty, and unavailable evidence", () => {
    expect(render()).toContain("not connected yet");
    expect(render()).not.toContain("0 matching learners");
    expect(render([])).toContain("No learners match");
    const html = render([{ ...learner, enrollments: [{ ...enrollment, cohort: null, attendance: null, lastActivity: { state: "unavailable", at: null } }] }]);
    expect(html).toContain("Unavailable");
    expect(html).toContain("Not evaluated");
    expect(html).not.toContain("Cohort One");
    expect(html).not.toContain("On Track");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toMatch(/disabled=""[^>]*aria-label="View evidence/);
  });
  it("shows recorded activity with a date, time and zone, not last login", () => {
    const html = render([learner]);
    expect(html).toContain('dateTime="2026-10-20T15:30:00.000Z"');
    expect(html).toContain("EDT");
    expect(html).not.toContain("Last Login");
    expect(render([{ ...learner, enrollments: [{ ...enrollment, attendance: { present: 0, eligibleHeld: 0 }, lastActivity: { state: "none_recorded", at: null } }] }])).toContain("No eligible held sessions");
  });
});
