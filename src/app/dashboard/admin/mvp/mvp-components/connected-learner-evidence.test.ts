import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const load = vi.hoisted(() => vi.fn());
vi.mock("../learner-evidence-actions", () => ({ loadMvpLearnerEvidence: load }));
import { ConnectedLearnerEvidence, LearnerEvidenceRequestState } from "./connected-learner-evidence";
import { EMPTY_LEARNER_FILTERS } from "./learner-filters";

describe("On-demand evidence", () => {
  it.each([
    ["programId", "p2"], ["courseSlug", "course-b"], ["cohortId", "cohort-2"],
    ["search", "another learner"], ["status", "needs_check_in"],
  ] as const)("replaces the evidence request state when %s changes", (field, value) => {
    const before = ConnectedLearnerEvidence({ learnerId: "a", filters: EMPTY_LEARNER_FILTERS });
    const after = ConnectedLearnerEvidence({ learnerId: "a", filters: { ...EMPTY_LEARNER_FILTERS, [field]: value } });
    expect(after.key).not.toBe(before.key);
    const html = renderToStaticMarkup(after);
    expect(html).toContain("Loading authorized evidence");
    expect(html).not.toContain("Attendance history");
    expect(html).not.toContain("Weekly milestone timestamps");
    expect(html).not.toContain("Flag explanations");
  });
  it("owns the selection reset without requiring a parent key", () => {
    const a = ConnectedLearnerEvidence({ learnerId: "a", filters: EMPTY_LEARNER_FILTERS });
    const b = ConnectedLearnerEvidence({ learnerId: "b", filters: EMPTY_LEARNER_FILTERS });
    expect(a.key).not.toBe(b.key);
    expect(b.props.learnerId).toBe("b");
    expect(renderToStaticMarkup(b)).toContain("Loading authorized evidence");
  });
  it.each(["loading", "error", "unavailable"] as const)("renders accessible %s state without evidence", state => {
    const html = renderToStaticMarkup(createElement(LearnerEvidenceRequestState, { state, onRetry: vi.fn() }));
    expect(html).toContain(`aria-busy="${state === "loading"}"`);
    expect(html).toContain(`role="${state === "error" ? "alert" : "status"}"`);
    expect(html).not.toContain("Attendance history");
    expect(html).not.toContain("Weekly milestone timestamps");
    if (state === "loading") expect(html).not.toContain("<button");
    else {
      expect(html).toContain("Retry loading evidence");
      expect(html).toContain("same learner and filters");
    }
    if (state === "unavailable") expect(html).toContain("does not establish that there are no records");
    if (state === "error") expect(html).toContain("No previous evidence is being shown");
  });
  it("starts loading without fetching during render or showing cached directory evidence", () => {
    const html = renderToStaticMarkup(createElement(ConnectedLearnerEvidence, {
      learnerId: "s1", filters: EMPTY_LEARNER_FILTERS,
    }));
    expect(html).toContain("Loading authorized evidence");
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("records loaded");
    expect(load).not.toHaveBeenCalled();
  });
});
