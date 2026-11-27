import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshMvpOverview } from "./overview-actions";
import { getMvpDashboardData } from "@/lib/mvp/queries";

vi.mock("@/lib/mvp/queries", () => ({ getMvpDashboardData: vi.fn() }));

describe("overview snapshot refresh", () => {
  beforeEach(() => { vi.mocked(getMvpDashboardData).mockReset(); });
  it("requests authorized unfiltered data and returns only card aggregates", async () => {
    vi.mocked(getMvpDashboardData).mockResolvedValue({
      scopeLabel: "Your accessible programs", summary: { uniqueLearnersStarted: 0 },
      programs: [{ status: "active" }, { status: "unknown" }],
      staffReview: { coursesWithVerifiedFlags: 1 }, freshness: { fetchedAt: "2026-10-14T12:00:00Z" },
      checkInEvaluations: [{ learnerId: "private" }],
    } as unknown as Awaited<ReturnType<typeof getMvpDashboardData>>);
    const result = await refreshMvpOverview();
    expect(getMvpDashboardData).toHaveBeenLastCalledWith({});
    expect(result).toMatchObject({ portfolio: 2, active: 1, unknown: 1, flaggedCourses: 1 });
    expect(result).not.toHaveProperty("checkInEvaluations");
    expect(result).not.toHaveProperty("programs");
  });
  it("propagates authorization failures instead of returning cached data", async () => {
    vi.mocked(getMvpDashboardData).mockRejectedValue(new Error("MVP access is required."));
    await expect(refreshMvpOverview()).rejects.toThrow("MVP access is required");
  });
});

it("replaces old data flags with freshly recalculated results", async () => {
  vi.mocked(getMvpDashboardData).mockReset();
  const fixture = (count: number) => ({ scopeLabel: "Accessible programs", summary: {}, programs: [],
    freshness: { fetchedAt: "2026-11-27T12:00:00Z" }, kpiDataReview: { courseCount: count, courses: [] },
  }) as unknown as Awaited<ReturnType<typeof getMvpDashboardData>>;
  vi.mocked(getMvpDashboardData).mockResolvedValueOnce(fixture(1)).mockResolvedValueOnce(fixture(0));
  expect((await refreshMvpOverview()).review.kpiDataReview?.courseCount).toBe(1);
  expect((await refreshMvpOverview()).review.kpiDataReview?.courseCount).toBe(0);
});
it("refreshes review using applied filters and rejects a failed scoped load", async () => {
  vi.mocked(getMvpDashboardData).mockReset();
  const filters = { programId: "p", courseSlug: "c", city: null, learnerStatus: "all" as const, startDate: null, endDate: null };
  const fixture = { scopeLabel: "Accessible programs", summary: {}, programs: [], freshness: { fetchedAt: "now" },
    kpiDataReview: { courseCount: 4, courses: [] } } as unknown as Awaited<ReturnType<typeof getMvpDashboardData>>;
  vi.mocked(getMvpDashboardData).mockResolvedValueOnce(fixture).mockResolvedValueOnce({ ...fixture, kpiDataReview: { courseCount: 0, courses: [] } });
  const result = await refreshMvpOverview(filters);
  expect(getMvpDashboardData).toHaveBeenNthCalledWith(1, {});
  expect(getMvpDashboardData).toHaveBeenNthCalledWith(2, { programId: "p", courseSlug: "c", learnerStatus: "all" });
  expect(result.review.kpiDataReview?.courseCount).toBe(0);
  vi.mocked(getMvpDashboardData).mockResolvedValueOnce(fixture).mockRejectedValueOnce(new Error("Scope unavailable"));
  await expect(refreshMvpOverview(filters)).rejects.toThrow("Scope unavailable");
});
