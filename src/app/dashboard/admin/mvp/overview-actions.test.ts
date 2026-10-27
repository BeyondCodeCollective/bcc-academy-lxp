import { describe, expect, it, vi } from "vitest";
import { refreshMvpOverview } from "./overview-actions";
import { getMvpDashboardData } from "@/lib/mvp/queries";

vi.mock("@/lib/mvp/queries", () => ({ getMvpDashboardData: vi.fn() }));

describe("overview snapshot refresh", () => {
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
