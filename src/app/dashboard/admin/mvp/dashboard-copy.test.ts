import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MvpDashboard } from "./mvp-dashboard";
import { MvpHeader } from "./mvp-components/mvp-header";
import { MvpOverview } from "./mvp-components/mvp-overview";
import type { MvpDashboardData } from "@/lib/mvp/types";
import { buildMvpOverviewSnapshot } from "@/lib/mvp/overview-snapshot";
vi.mock("./overview-actions", () => ({ refreshMvpOverview: vi.fn() }));

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
  it("uses the all-program snapshot for top cards and places refresh beside exports", () => {
    const initialSnapshot = buildMvpOverviewSnapshot({ ...data,
      summary: { ...data.summary, uniqueLearnersStarted: 1234 } });
    const filtered = { ...data, scopeLabel: "Catalyst", summary: { ...data.summary, uniqueLearnersStarted: 7 } };
    const html = renderToStaticMarkup(createElement(MvpOverview, { data: filtered, initialSnapshot }));
    const header = html.slice(0, html.indexOf("</header>"));
    expect(header).toContain("Impact overview");
    expect(header).toContain("Organization overview");
    expect(header).toContain("Refresh now");
    expect(header).toContain("Export CSV");
    expect(header).toContain("PDF mini-report");
    expect(html).toContain("1,234");
    expect(html.match(/Refresh now/g)).toHaveLength(1);
  });
  it("uses the applied program for all headings and the filtered server KPIs even with no course rows", () => {
    const selected: MvpDashboardData = { ...data, scopeLabel: "Catalyst",
      appliedFilters: { ...data.appliedFilters, programId: "catalyst" },
      filterOptions: { ...data.filterOptions, programs: [{ id: "catalyst", name: "Catalyst" }] },
      summary: { ...data.summary, uniqueLearnersStarted: 17, upcomingEnrollments: 3 } };
    const html = renderToStaticMarkup(createElement(MvpDashboard, { data: selected }));
    for (const heading of ["Catalyst KPIs", "Catalyst performance", "Catalyst survey outcomes"]) expect(html).toContain(heading);
    expect(html).toMatch(/<dd[^>]*>17<\/dd>/);
    expect(html).toMatch(/<dd[^>]*>3<\/dd>/);
    expect(html).toContain("PDF mini-report");
    const cleared = renderToStaticMarkup(createElement(MvpDashboard, { data }));
    expect(cleared).toContain("Program KPIs");
    expect(cleared).not.toContain("Catalyst performance");
    expect(cleared).toContain("Program performance");
    expect(cleared).toContain("Program survey outcomes");
  });
  it("keeps mobile filters above performance and below the review cards", () => {
    const html = renderToStaticMarkup(createElement(MvpOverview, { data, initialSnapshot: buildMvpOverviewSnapshot(data) }));
    const sections = ["Unique learners started", "Courses with verified check-in flags", "Requires staff review",
      "Participation &amp; learner outcomes", 'aria-label="Overview filters"', 'aria-label="Program performance"',
      "Who we serve", "Reported learner locations"];
    const positions = sections.map(section => html.indexOf(section));
    positions.forEach(position => expect(position).toBeGreaterThan(-1));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
  it("keeps Survey outcomes in Programs only, while retaining Overview participation", () => {
    const overview = renderToStaticMarkup(createElement(MvpOverview, { data, initialSnapshot: buildMvpOverviewSnapshot(data) }));
    const programs = renderToStaticMarkup(createElement(MvpDashboard, { data }));
    expect(overview).not.toContain('id="mvp-survey-outcomes"');
    expect(overview).toContain("Participation &amp; learner outcomes");
    expect(programs).toContain('id="mvp-survey-outcomes"');
  });
  it("renders the overview with supported labels and unavailable states, not demo claims", () => {
    const html = renderToStaticMarkup(createElement(MvpOverview, { data, initialSnapshot: buildMvpOverviewSnapshot(data) }));
    for (const label of ["Impact overview", "Unavailable", "Requires staff review", "Reported learner locations", "household income", "Export CSV", "PDF mini-report"]) expect(html).toContain(label);
    for (const label of ["1,248", "salary", "Age at first start", "Funder", "Commitment status"]) expect(html).not.toContain(label);
    expect(html).toContain("Demographic summaries unavailable");
    expect(html).toContain("Location summary unavailable");
  });
  it("keeps filters and metric cards without technical notes or the selected-filter box", () => {
    const html = renderToStaticMarkup(createElement(MvpDashboard, { data }));
    for (const text of ["Selected filters", "Showing:", "Internal metric explanation", "Internal unavailable explanation",
      "totals overlap", "Course choices depend", "Uses profile location", "Dates select overlapping",
      "Choose your filters", "Each row represents", "Current eligible learners only"]) {
      expect(html).not.toContain(text);
    }
    expect(html).toContain("Apply Filters");
    expect(html.indexOf('aria-label="Program performance"')).toBeLessThan(html.indexOf('aria-label="Participant activity"'));
    expect(html.indexOf('aria-label="Participant activity"')).toBeLessThan(html.indexOf("Program survey outcomes"));
    expect(html).toContain("lg:grid-cols-[340px_minmax(0,1fr)]");
    const filterCard = html.slice(html.indexOf("<fieldset"), html.indexOf("</fieldset>"));
    expect(filterCard).toContain('text-xl font-semibold text-ink">Filter</h2>');
    expect(filterCard).toContain("Apply Filters");
    expect(filterCard.indexOf("Clear filters")).toBeLessThan(filterCard.indexOf("Apply Filters"));
    expect(html.indexOf("Program KPIs")).toBeLessThan(html.indexOf('aria-label="Dashboard filters"'));
    expect(html.indexOf('aria-label="Dashboard filters"')).toBeLessThan(html.indexOf('aria-label="Program performance"'));
    expect(html).toContain('class="panel w-full min-w-0 p-5 sm:p-6" aria-label="Program performance"');
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
