import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({ session: vi.fn(), load: vi.fn(), refresh: vi.fn(), options: vi.fn() }));
vi.mock("@/lib/mvp/learner-queries", () => ({ getMvpLearnerFilterOptions: mocks.options }));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: mocks.session }));
vi.mock("@/lib/mvp/queries", () => ({ getMvpDashboardData: mocks.load }));
vi.mock("./overview-actions", () => ({ refreshMvpOverview: mocks.refresh }));
vi.mock("./learner-actions", () => ({ searchMvpLearners: vi.fn() }));
vi.mock("./mvp-dashboard", () => ({ MvpDashboard: () => null }));
vi.mock("./mvp-components/mvp-overview", () => ({ MvpOverview: () => null }));
vi.mock("./mvp-components/mvp-header", () => ({ MvpHeader: () => null }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("../admin-top-tabs", () => ({ AdminTopTabs: () => null }));
vi.mock("./mvp-components/workspace-layout", () => ({ WorkspaceLayout: ({ navigation, children }: { navigation: ReactNode; children: ReactNode }) => [navigation, children] }));
import Page from "./page";

describe("Learners workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ userId: "admin", student: { role: "super_admin" } });
    mocks.options.mockResolvedValue({ programs: [{ id: "p1", name: "Authorized program" }], courses: [], cohorts: [] });
  });
  it("opens a selected Learners shell without fetching records or carrying other page filters", async () => {
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ view: "learners", programId: "private-program", city: "private-location",
      courseSlug: "private-course", cohortId: "private-cohort", search: "private-search", status: "needs_check_in",
      learnerStatus: "completed", page: "9", sortBy: "email", sortOrder: "desc", startDate: "2020-01-01" }) }));
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("Learner workspace in development");
    expect(html).toContain("Search and filters");
    expect(html).toContain("Authorized program");
    expect(mocks.options).toHaveBeenCalledWith();
    expect(html).toContain("Commitments");
    expect(html).not.toContain("private-program");
    expect(html).not.toContain("private-location");
    for (const value of ["private-course", "private-cohort", "private-search", "2020-01-01"]) expect(html).not.toContain(value);
    expect(html).toContain('value="all" selected=""');
    expect(html).toMatch(/href="\/dashboard\/admin\/mvp"[^>]*>Overview<\/a>/);
    expect(html).toMatch(/href="\/dashboard\/admin\/mvp\?view=programs"[^>]*>Programs<\/a>/);
    expect(html).not.toContain("Export CSV");
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it.each(["overview", "programs"])("enters Learners from filtered %s without forwarding dashboard filters", async view => {
    const appliedFilters = { programId: "p1", courseSlug: "dashboard-course", learnerStatus: "completed", startDate: "2020-01-01", endDate: "2020-12-31" };
    mocks.load.mockResolvedValue({ appliedFilters });
    mocks.refresh.mockResolvedValue({});
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ ...appliedFilters, view }) }));
    expect(html).toMatch(/href="\/dashboard\/admin\/mvp\?view=learners"[^>]*>Learners<\/a>/);
    expect(mocks.options).not.toHaveBeenCalled();
    // Overview/Programs retain their existing shared dashboard navigation.
    expect(html).toContain("programId=p1");
    expect(html).toContain("courseSlug=dashboard-course");
    expect(html).not.toContain("Search learners");
  });
  it("redirects signed-out users", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(Page({ searchParams: Promise.resolve({ view: "learners" }) })).rejects.toThrow("redirect:/login");
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.options).not.toHaveBeenCalled();
  });
  it("keeps the existing role restriction", async () => {
    mocks.session.mockResolvedValue({ userId: "learner", student: { role: "student" } });
    await expect(Page({ searchParams: Promise.resolve({ view: "learners" }) })).rejects.toThrow("redirect:/dashboard");
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.options).not.toHaveBeenCalled();
  });
  it("shows a safe unavailable state when options cannot be authorized or loaded", async () => {
    mocks.options.mockRejectedValue(new Error("PRIVATE database details"));
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ view: "learners" }) }));
    expect(html).toContain("Unable to load authorized learner filters");
    expect(html).not.toContain("PRIVATE");
    expect(html.match(/<select[^>]*\sdisabled=""/g)).toHaveLength(3);
  });
});
