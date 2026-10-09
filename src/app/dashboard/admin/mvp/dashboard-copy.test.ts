import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MvpDashboard } from "./mvp-dashboard";
import { MvpHeader } from "./mvp-components/mvp-header";
import type { MvpDashboardData } from "@/lib/mvp/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Backend definitions remain available without becoming dashboard body copy.
const data: MvpDashboardData = {
  scopeLabel: "Organization overview", programs: [], commitments: [],
  appliedFilters: { programId: null, courseSlug: null, city: null, learnerStatus: "all", startDate: null, endDate: null },
  filterOptions: { programs: [], courses: [], cities: [] },
  summary: { uniqueLearnersStarted: null, uniqueLearnersCompleted: 0, programParticipationsStarted: null,
    programParticipationsCompleted: 0, upcomingEnrollments: null },
  freshness: { fetchedAt: "2026-10-08T23:00:00Z", sourceUpdatedAt: null, lastValidatedAt: null, lastValidatedBy: null },
  metricDefinitions: [{ key: "uniqueLearnersStarted", label: "Started", denominator: null,
    definition: "Internal metric explanation", unavailableReason: "Internal unavailable explanation" }],
};

describe("simplified MVP dashboard copy", () => {
  it("keeps filters and metric cards without technical notes or the selected-filter box", () => {
    const html = renderToStaticMarkup(createElement(MvpDashboard, { data }));
    for (const text of ["Selected filters", "Showing:", "Internal metric explanation", "Internal unavailable explanation",
      "totals overlap", "Course choices depend", "Uses profile location", "Dates select overlapping",
      "Choose your filters", "Each row represents", "Current eligible learners only"]) {
      expect(html).not.toContain(text);
    }
    expect(html).toContain("Apply filters");
    expect(html).toContain("Unique learners started");
    expect(html).toContain('aria-label="Not available"');
  });
  it("shows Last Refreshed with the timestamp and omits source/validation metadata", () => {
    const html = renderToStaticMarkup(createElement(MvpHeader, { dateRangeLabel: "All available history", freshness: data.freshness }));
    expect(html).toContain("Last Refreshed:");
    expect(html).toContain('dateTime="2026-10-08T23:00:00Z"');
    for (const text of ["Dashboard data fetched", "Source last updated", "Last validated", "Full-offering results"]) expect(html).not.toContain(text);
  });
});
