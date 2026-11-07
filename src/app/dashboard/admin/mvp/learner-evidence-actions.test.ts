import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), load: vi.fn(), currentAccess: vi.fn() }));
vi.mock("@/lib/mvp/learner-request-access", () => ({ requireCurrentMvpLearnerAccess: mocks.currentAccess }));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: mocks.session }));
vi.mock("@/lib/mvp/learner-queries", () => ({ getMvpLearnerEvidence: mocks.load }));
import { loadMvpLearnerEvidence } from "./learner-evidence-actions";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentAccess.mockResolvedValue(undefined);
  mocks.session.mockResolvedValue({ userId: "staff", student: { role: "super_admin" } });
});
describe("Evidence action", () => {
  it("rechecks current access on reopening or retrying evidence", async () => {
    mocks.load.mockResolvedValue(null);
    expect(await loadMvpLearnerEvidence("s1", {})).toEqual({ state: "unavailable" });
    mocks.currentAccess.mockRejectedValue(new Error("PRIVATE revoked role"));
    expect(await loadMvpLearnerEvidence("s1", {})).toEqual({ state: "error" });
    expect(mocks.currentAccess).toHaveBeenCalledTimes(2);
    expect(mocks.load).toHaveBeenCalledTimes(1);
  });
  it.each(["student", "instructor", "admin"])("rejects direct calls by %s", async role => {
    mocks.session.mockResolvedValue({ userId: "staff", student: { role } });
    expect(await loadMvpLearnerEvidence("s1", {})).toEqual({ state: "error" });
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    mocks.session.mockResolvedValue(null);
    expect(await loadMvpLearnerEvidence("s1", {})).toEqual({ state: "error" });
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("delegates each request to the authorized loader", async () => {
    const evidence = { id: "s1", enrollments: [] };
    mocks.load.mockResolvedValue(evidence);
    expect(await loadMvpLearnerEvidence("s1", { programId: "p1" })).toEqual({ state: "ready", evidence });
    expect(mocks.load).toHaveBeenCalledWith("s1", { programId: "p1" });
    mocks.load.mockResolvedValue(null);
    expect(await loadMvpLearnerEvidence("s1", {})).toEqual({ state: "unavailable" });
    mocks.load.mockRejectedValue(new Error("PRIVATE"));
    expect(await loadMvpLearnerEvidence("s1", {})).toEqual({ state: "error" });
  });
});
