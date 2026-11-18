import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConnectedLearnerDirectory, LearnerRequestState } from "./connected-learner-directory";
import { EMPTY_LEARNER_FILTERS } from "./learner-filters";

describe("Learner request states", () => {
  it("announces loading without a false empty count or actionable retry", () => {
    const html = renderToStaticMarkup(createElement(LearnerRequestState, { state: "loading", onRetry: vi.fn() }));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading learners");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("0 matching");
    expect(html).not.toContain("<table");
  });
  it("announces unavailable results and offers an explicit retry, not an empty directory", () => {
    const html = renderToStaticMarkup(createElement(LearnerRequestState, { state: "error", onRetry: vi.fn() }));
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain("Results and matching counts are unavailable");
    expect(html).toContain("Retry loading learners");
    expect(html).not.toContain("0 matching");
    expect(html).not.toContain("No learners match");
    expect(html).not.toContain("<table");
  });
  it("starts the connected directory in loading, without rendering search text as results", () => {
    const html = renderToStaticMarkup(createElement(ConnectedLearnerDirectory, {
      filters: { ...EMPTY_LEARNER_FILTERS, search: "private-search" },
      searchAction: async () => ({ ok: false as const, message: "PRIVATE error details" }),
    }));
    expect(html).toContain("Loading learners");
    expect(html).not.toContain("private-search");
    expect(html).not.toContain("PRIVATE");
  });
});
