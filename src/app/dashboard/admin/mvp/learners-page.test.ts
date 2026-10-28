import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({ session: vi.fn(), load: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: mocks.session }));
vi.mock("@/lib/mvp/queries", () => ({ getMvpDashboardData: mocks.load }));
vi.mock("./overview-actions", () => ({ refreshMvpOverview: mocks.refresh }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("../admin-top-tabs", () => ({ AdminTopTabs: () => null }));
vi.mock("./mvp-components/workspace-layout", () => ({ WorkspaceLayout: ({ navigation, children }: { navigation: ReactNode; children: ReactNode }) => [navigation, children] }));
import Page from "./page";

describe("Learners workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ userId: "admin", student: { role: "super_admin" } });
  });
  it("opens a selected Learners shell without fetching records or carrying other page filters", async () => {
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ view: "learners", programId: "private-program", city: "private-location" }) }));
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("Learner workspace in development");
    expect(html).toContain("Search and filters");
    expect(html).toContain("Commitments");
    expect(html).not.toContain("private-program");
    expect(html).not.toContain("private-location");
    expect(html).not.toContain("Export CSV");
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("redirects signed-out users", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(Page({ searchParams: Promise.resolve({ view: "learners" }) })).rejects.toThrow("redirect:/login");
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("keeps the existing role restriction", async () => {
    mocks.session.mockResolvedValue({ userId: "learner", student: { role: "student" } });
    await expect(Page({ searchParams: Promise.resolve({ view: "learners" }) })).rejects.toThrow("redirect:/dashboard");
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
