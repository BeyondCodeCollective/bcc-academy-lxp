import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const load = vi.hoisted(() => vi.fn());
vi.mock("../learner-evidence-actions", () => ({ loadMvpLearnerEvidence: load }));
import { ConnectedLearnerEvidence } from "./connected-learner-evidence";
import { EMPTY_LEARNER_FILTERS } from "./learner-filters";

describe("On-demand evidence", () => {
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
