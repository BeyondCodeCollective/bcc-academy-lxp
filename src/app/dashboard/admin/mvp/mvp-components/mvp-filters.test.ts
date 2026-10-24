import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MvpFilters } from "./mvp-filters";

// Verify the connected control remains enabled and reflects the applied value.
describe("MVP learner-status control", () => {
  it("renders an enabled active selection with all supported milestones", () => {
    const html = renderToStaticMarkup(createElement(MvpFilters, {
      filters: { programId: null, courseSlug: null, city: null, learnerStatus: "active", startDate: null, endDate: null },
      options: { programs: [], courses: [], cities: [] }, onChange: () => {},
    }));
    const select = html.match(/<select[^>]*id="[^"]*-learner-status"[^>]*>/)?.[0];
    expect(select).toBeDefined();
    expect(select).not.toMatch(/\sdisabled(?:=|\s|>)/);
    expect(html).toContain('value="active" selected=""');
    expect(html).toContain('value="needs_check_in"');
    expect(html).not.toContain('value="inactive"');
  });
});
