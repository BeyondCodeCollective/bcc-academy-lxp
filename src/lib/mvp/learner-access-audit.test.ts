import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn(), log: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: mocks.client }));
vi.mock("@/app/dashboard/admin/actions-shared", () => ({ logAdminAccess: mocks.log }));
import { auditMvpLearnerView } from "./learner-access-audit";
beforeEach(() => { vi.resetAllMocks(); mocks.client.mockReturnValue({}); });
afterEach(() => { vi.restoreAllMocks(); });
describe("MVP sensitive-view audit", () => {
  it.each(["mvp/learners/directory", "mvp/learners/evidence"] as const)("records only returned program scopes and distinct learner counts for %s", resource => {
    const learners = [
      { id: "PRIVATE learner", email: "PRIVATE email", notes: "PRIVATE note", fileUrl: "PRIVATE link",
        enrollments: [{ programId: "p1" }, { programId: "p1" }, { programId: "p2" }] },
      { id: "PRIVATE second", enrollments: [{ programId: "p1" }] },
    ];
    auditMvpLearnerView("verified-actor", resource, [...learners, learners[0]]);
    expect(mocks.log.mock.calls.map(call => call[1])).toEqual([
      { actorUserId: "verified-actor", programId: "p1", action: "view", resource, rowCount: 2, metadata: { rowUnit: "returned_learners" } },
      { actorUserId: "verified-actor", programId: "p2", action: "view", resource, rowCount: 1, metadata: { rowUnit: "returned_learners" } },
    ]);
    expect(JSON.stringify(mocks.log.mock.calls)).not.toContain("PRIVATE");
  });
  it("does not record identifiable access for empty results", () => {
    auditMvpLearnerView("verified-actor", "mvp/learners/directory", []);
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.log).not.toHaveBeenCalled();
  });
  it.each(["client", "log"] as const)("keeps %s setup failures non-blocking without logging source error content", failing => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks[failing].mockImplementation(() => { throw new Error("PRIVATE failure"); });
    expect(() => auditMvpLearnerView("verified-actor", "mvp/learners/evidence", [
      { id: "PRIVATE learner", enrollments: [{ programId: "p1" }] },
    ])).not.toThrow();
    expect(error).toHaveBeenCalledExactlyOnceWith("MVP learner access audit could not be started.");
  });
});
