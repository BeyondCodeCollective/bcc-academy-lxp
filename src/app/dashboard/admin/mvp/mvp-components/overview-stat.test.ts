import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { OverviewStat } from "./overview-stat";
const render = (value: number | null, observed: number | null, evaluated: number, total: number) =>
  renderToStaticMarkup(createElement(OverviewStat, { label: "Learners started", value, coverage: { value: observed, evaluated, total } }));
it("labels partial counts with evaluated and unevaluated coverage", () => {
  const html = render(null, 12, 2, 3);
  expect(html).toContain(">12</dd>"); expect(html).toContain("Partial total");
  expect(html).toContain("Evaluated 2 of 3 courses."); expect(html).toContain("1 not yet evaluated.");
});
it("distinguishes a supported zero from entirely unavailable results", () => {
  expect(render(null, 0, 1, 2)).toContain(">0</dd>");
  const html = render(null, null, 0, 2);
  expect(html).toContain(">Unavailable</dd>"); expect(html).toContain("Evaluated 0 of 2 courses.");
  expect(html).not.toContain("Partial total");
});
it("shows complete counts and coverage without partial labels", () => {
  const html = render(12, 12, 3, 3);
  expect(html).toContain(">12</dd>"); expect(html).toContain("Evaluated 3 of 3 courses.");
  expect(html).not.toContain("Partial total");
  expect(render(0, 0, 0, 0)).toContain("No courses in this scope.");
});
