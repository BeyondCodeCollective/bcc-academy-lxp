import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LearnerSummary } from "./learner-summary";
import { changeLearnerFilters, EMPTY_LEARNER_FILTERS, LearnerFilterBar } from "./learner-filters";

describe("Learner summary cards", () => {
  it("renders three responsive cards with unavailable counts, not fabricated data", () => {
    const html = renderToStaticMarkup(createElement(LearnerSummary, { needsCheckInSelected: false, onNeedsCheckIn: () => {} }));
    for (const label of ["Total Enrolled", "Sessions Held", "Needs Check-In", "md:grid-cols-3", "not connected yet"]) expect(html).toContain(label);
    expect(html.match(/aria-label="Count unavailable"/g)).toHaveLength(3);
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain("Missed 2");
    expect(html).not.toContain("overdue");
  });
  it("places summary cards below the filter form", () => {
    const html = renderToStaticMarkup(createElement(LearnerFilterBar));
    expect(html.indexOf('aria-label="Learner summary"')).toBeGreaterThan(html.indexOf("</form>"));
  });
  it("toggles only the local status and clears with the other learner filters", () => {
    const scoped = { ...EMPTY_LEARNER_FILTERS, search: "Ada", programId: "p1", courseSlug: "c1", cohortId: "co1" };
    const selected = changeLearnerFilters(scoped, { type: "toggle_check_in" });
    expect(selected).toEqual({ ...scoped, status: "needs_check_in" });
    expect(changeLearnerFilters(selected, { type: "toggle_check_in" })).toEqual(scoped);
    expect(changeLearnerFilters(selected, { type: "clear" })).toEqual(EMPTY_LEARNER_FILTERS);
    expect(scoped.status).toBe("all");
  });
  it("exposes a native button and forwards its click to the owner", () => {
    const onNeedsCheckIn = vi.fn();
    const element = LearnerSummary({ needsCheckInSelected: true, onNeedsCheckIn });
    const button = element.props.children[0].props.children[2];
    expect(button.type).toBe("button");
    expect(button.props.type).toBe("button");
    expect(button.props["aria-pressed"]).toBe(true);
    button.props.onClick();
    expect(onNeedsCheckIn).toHaveBeenCalledOnce();
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Selected · click to show all statuses");
  });
});
