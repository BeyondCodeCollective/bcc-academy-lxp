import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { LearnerDirectoryCharts } from "./learner-directory-charts";
it.each(["suppressed", "unavailable", "empty"] as const)("has no selection targets for %s charts", state => {
  const html = renderToStaticMarkup(createElement(LearnerDirectoryCharts, { charts: { attendance: { state }, milestones: { state } }, onSelect: () => {} }));
  expect(html).not.toContain("<button");
});
it("renders six distinct attendance states with keyboard buttons and disables zero counts", () => {
  const html = renderToStaticMarkup(createElement(LearnerDirectoryCharts, { charts: { attendance: { state: "ready", rows: [{ programId: "p1", courseSlug: "a", weekNumber: 1, sessionNumber: 1, total: 10, counts: { verified_present: 5, verified_absent: 0, excused: 5, not_eligible: 0, unrecorded: 0, unresolved: 0 } }] }, milestones: { state: "empty" } }, onSelect: () => {} }));
  for (const label of ["Verified present", "Verified absent", "Excused", "Not eligible", "Unrecorded", "Unresolved"]) expect(html).toContain(label);
  expect(html.match(/<button/g)).toHaveLength(6);
  expect(html.match(/disabled=""/g)).toHaveLength(4);
});

it("defensively suppresses a ready payload containing a small group", () => {
  const html = renderToStaticMarkup(createElement(LearnerDirectoryCharts, { charts: { attendance: { state: "ready", rows: [{ programId: "hidden-program", courseSlug: "hidden-course", weekNumber: 1, sessionNumber: 1, total: 6, counts: { verified_present: 5, verified_absent: 1, excused: 0, not_eligible: 0, unrecorded: 0, unresolved: 0 } }] }, milestones: { state: "empty" } }, onSelect: () => {} }));
  expect(html).toContain("Chart hidden to protect small groups");
  expect(html).not.toContain("hidden-program");
  expect(html).not.toContain("<button");
});
