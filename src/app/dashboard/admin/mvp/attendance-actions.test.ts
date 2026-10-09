import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn(), history: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/mvp/attendance-review-server", () => ({ finalizeMvpAttendanceReview: mocks.save, readMvpAttendanceReviewHistory: mocks.history }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
import { saveMvpAttendanceReviewAction, readMvpAttendanceReviewHistoryAction } from "./attendance-actions";
beforeEach(() => vi.resetAllMocks());

// Actions delegate security to the tested service and return explicit DTOs only.
describe("attendance server actions", () => {
  it("refreshes only after an authorized save and limits the response", async () => {
    mocks.save.mockResolvedValue({ id: "review", revision: 2, recorded_at: "now", secret: "never" });
    expect(await saveMvpAttendanceReviewAction({ outcome: "present" })).toEqual({ id: "review", revision: 2, recordedAt: "now" });
    expect(mocks.save).toHaveBeenCalledWith({ outcome: "present" });
    expect(mocks.refresh).toHaveBeenCalledWith("/dashboard/admin/mvp");
  });
  it("does not refresh or report success when authorization/save fails", async () => {
    mocks.save.mockRejectedValue(new Error("Denied"));
    await expect(saveMvpAttendanceReviewAction({})).rejects.toThrow("Denied");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("reauthorizes history and excludes unexpected database fields", async () => {
    mocks.history.mockResolvedValue([{ id: "review", revision: 1, recorded_by: "staff", secret: "never" }]);
    const result = await readMvpAttendanceReviewHistoryAction({ learnerId: "learner" });
    expect(mocks.history).toHaveBeenCalledWith({ learnerId: "learner" });
    expect(result[0].recordedBy).toBe("staff");
    expect(result[0]).not.toHaveProperty("secret");
  });
});
