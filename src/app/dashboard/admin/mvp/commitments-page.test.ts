import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), load: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: mocks.session }));
vi.mock("@/lib/mvp/queries", () => ({ getMvpDashboardData: mocks.load }));
vi.mock("./overview-actions", () => ({ refreshMvpOverview: mocks.refresh }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("../admin-top-tabs", () => ({ AdminTopTabs: () => null }));
import Page from "./page";

describe("Commitments workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ userId: "staff", student: { role: "super_admin" } });
  });
  it.each(["admin", "super_admin"])("opens for %s in the real workspace layout without loading unrelated records", async role => {
    mocks.session.mockResolvedValue({ userId: "staff", student: { role } });
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({
      view: "commitments", programId: "PRIVATE-program", city: "PRIVATE-location",
    }) }));
    expect(html).toContain('aria-label="Resize Impact workspace"');
    const commitmentLink = html.match(/<a\b[^>]*>Commitments<\/a>/)?.[0];
    expect(commitmentLink).toContain('href="/dashboard/admin/mvp?view=commitments"');
    expect(commitmentLink).toContain('aria-current="page"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain(">Commitments</h1>");
    expect(html).toContain("Commitment records are not available here yet.");
    expect(html).not.toContain("PRIVATE");
    expect(html).not.toContain("Search and filters");
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it.each([null, "student", "instructor", "unknown"])("rejects direct page access for %s", async role => {
    mocks.session.mockResolvedValue(role ? { userId: "actor", student: { role } } : null);
    await expect(Page({ searchParams: Promise.resolve({ view: "commitments" }) }))
      .rejects.toThrow(role ? "redirect:/dashboard" : "redirect:/login");
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it.each(["overview", "programs", "learners"])("does not broaden admin access to %s", async view => {
    mocks.session.mockResolvedValue({ userId: "staff", student: { role: "admin" } });
    await expect(Page({ searchParams: Promise.resolve({ view }) })).rejects.toThrow("redirect:/dashboard");
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
