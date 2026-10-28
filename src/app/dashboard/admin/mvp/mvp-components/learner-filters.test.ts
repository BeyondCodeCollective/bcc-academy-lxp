import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { changeLearnerFilters, EMPTY_LEARNER_FILTERS, LearnerFilterBar } from "./learner-filters";

describe("Learners-only filter bar", () => {
  it("renders accessible search and the four requested controls without geography", () => {
    const html = renderToStaticMarkup(createElement(LearnerFilterBar));
    for (const label of ["Search learners", "Program", "Course / Track", "Current cohort", "Status", "On Track", "Needs Check-in", "Not evaluated", "Clear filters", "Apply Filters"]) expect(html).toContain(label);
    expect(html).toContain('type="search"');
    expect(html).toContain("flex flex-wrap gap-4");
    expect(html.split('</form>')[0].match(/<select/g)).toHaveLength(4);
    expect(html.match(/<select[^>]*\sdisabled=""/g)).toHaveLength(3);
    expect(html).toContain("not connected yet");
    for (const field of ["Location", "ZIP", "State", "City"]) expect(html).not.toContain(field);
  });
  it("resets dependent selections but keeps search and status on program change", () => {
    const original = { ...EMPTY_LEARNER_FILTERS, search: "name", programId: "p1", courseSlug: "c1", cohortId: "co1", status: "needs_check_in" as const };
    expect(changeLearnerFilters(original, { type: "change", field: "programId", value: "p2" })).toEqual({ ...original, programId: "p2", courseSlug: "", cohortId: "" });
    expect(original.cohortId).toBe("co1");
    expect(changeLearnerFilters(original, { type: "change", field: "courseSlug", value: "c2" })).toEqual({ ...original, courseSlug: "c2", cohortId: "" });
    expect(changeLearnerFilters(original, { type: "clear" })).toEqual(EMPTY_LEARNER_FILTERS);
  });
  it("rejects unsupported statuses", () => {
    expect(changeLearnerFilters(EMPTY_LEARNER_FILTERS, { type: "change", field: "status", value: "made-up" })).toEqual(EMPTY_LEARNER_FILTERS);
  });
  it("does not populate options from an unrelated course or cohort before selection", () => {
    const html = renderToStaticMarkup(createElement(LearnerFilterBar, { options: {
      programs: [{ id: "p1", name: "Authorized program" }],
      courses: [{ programId: "p1", slug: "c1", name: "Scoped course" }],
      cohorts: [{ programId: "p1", courseSlug: "c1", id: "co1", name: "Scoped cohort" }],
    } }));
    expect(html).toContain("Authorized program");
    expect(html).not.toContain("Scoped course");
    expect(html).not.toContain("Scoped cohort");
  });
});
