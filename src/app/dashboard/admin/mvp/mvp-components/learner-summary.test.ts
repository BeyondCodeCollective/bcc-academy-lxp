import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LearnerSummary } from "./learner-summary";
import { changeLearnerFilters, EMPTY_LEARNER_FILTERS, LearnerFilterBar } from "./learner-filters";

describe("Learner summary cards", () => {
  it.each([0, 12])("renders the full-population check-in count %s", needsCheckIn => {
    const html = renderToStaticMarkup(createElement(LearnerSummary, { needsCheckInSelected: false, onNeedsCheckIn: () => {},
      summary: { totalEnrolled: 100, sessionsHeld: 7, needsCheckIn, sessionsHeldUnavailableReason: null, asOf: "2026-11-05T12:00:00Z" }, state: "ready" }));
    expect(html).toContain(`>${needsCheckIn}</span>`);
    expect(html).not.toContain('aria-label="Count unavailable"');
    expect(html).toContain("Not evaluated is not a flag");
  });
  const summary = { totalEnrolled: 1234, sessionsHeld: 7, sessionsHeldUnavailableReason: null, asOf: "2026-11-05T12:00:00Z" };
  it("renders backend totals and leaves the unconnected check-in count unavailable", () => {
    const html = renderToStaticMarkup(createElement(LearnerSummary, { needsCheckInSelected: false, onNeedsCheckIn: () => {}, summary, state: "ready" }));
    expect(html).toContain(">1,234</p>");
    expect(html).toContain(">7</p>");
    expect(html).toContain("not just this page");
    expect(html.match(/aria-label="Count unavailable"/g)).toHaveLength(1);
  });
  it("distinguishes known zero from unavailable session totals", () => {
    const render = (sessionsHeld: number | null) => renderToStaticMarkup(createElement(LearnerSummary, {
      needsCheckInSelected: false, onNeedsCheckIn: () => {}, state: "ready",
      summary: { ...summary, totalEnrolled: 0, sessionsHeld, sessionsHeldUnavailableReason: sessionsHeld === null ? "Schedule incomplete." : null },
    }));
    expect(render(0).match(/>0<\/p>/g)).toHaveLength(2);
    expect(render(null).match(/>0<\/p>/g)).toHaveLength(1);
    expect(render(null)).toContain("Schedule incomplete.");
    expect(render(null).match(/aria-label="Count unavailable"/g)).toHaveLength(2);
  });
  it.each(["loading", "error"] as const)("hides previous totals during %s", state => {
    const html = renderToStaticMarkup(createElement(LearnerSummary, { needsCheckInSelected: false, onNeedsCheckIn: () => {}, summary, state }));
    expect(html).not.toContain("1,234");
    expect(html).not.toContain(">7</p>");
    expect(html.match(/aria-label="Count unavailable"/g)).toHaveLength(3);
    expect(html).toContain(state === "loading" ? "Updating summary counts" : "Retry loading learners below");
  });
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
  it.each([false, true])("exposes a native toggle button with selected state %s", selected => {
    const onNeedsCheckIn = vi.fn();
    const element = LearnerSummary({ needsCheckInSelected: selected, onNeedsCheckIn });
    const button = element.props.children[0].props.children[2];
    expect(button.type).toBe("button");
    expect(button.props.type).toBe("button");
    expect(button.props["aria-pressed"]).toBe(selected);
    button.props.onClick();
    expect(onNeedsCheckIn).toHaveBeenCalledOnce();
    const html = renderToStaticMarkup(element);
    expect(html).toContain(selected ? "Selected · click to show all statuses" : "Select Needs Check-in status");
  });
  it.each(["all", "on_track", "not_evaluated"] as const)("selects Needs Check-In from %s without changing scope", status => {
    const applied = { ...EMPTY_LEARNER_FILTERS, search: "Ada", programId: "p1", courseSlug: "a", cohortId: "c1", status };
    const flagged = changeLearnerFilters(applied, { type: "toggle_check_in" });
    expect(flagged).toEqual({ ...applied, status: "needs_check_in" });
    expect(changeLearnerFilters(flagged, { type: "toggle_check_in" })).toEqual({ ...applied, status: "all" });
    expect(JSON.stringify(flagged)).not.toBe(JSON.stringify(applied));
  });
});
