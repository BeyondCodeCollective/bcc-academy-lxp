import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), load: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: mocks.session }));
vi.mock("@/lib/mvp/learner-queries", () => ({ getMvpLearnersData: mocks.load }));
import { searchMvpLearners } from "./learner-actions";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ userId: "staff", student: { role: "super_admin" } });
});
describe("Learners search action", () => {
  it.each([null, "student", "instructor", "admin"])("blocks direct action access for %s", async role => {
    mocks.session.mockResolvedValue(role ? { userId: "actor", student: { role } } : null);
    expect((await searchMvpLearners({})).ok).toBe(false);
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("delegates search, status, scope and pagination to the authorized loader with an explicit response projection", async () => {
    const params = { search: "Ada@example.test", status: "needs_check_in", programId: "p1", courseSlug: "a", page: "2", pageSize: "10", sortBy: "email", sortOrder: "desc" };
    const pagination = { page: 2, pageSize: 10, totalMatching: 11, totalPages: 2, start: 11, end: 11 };
    mocks.load.mockResolvedValue({ pagination, options: { private: "PRIVATE" }, directory: [{ id: "s1", firstName: "Ada", lastName: "Test", email: "Ada@example.test", private: "PRIVATE",
      enrollments: [{ programId: "p1", programName: "One", courseSlug: "a", courseName: "A", cohort: null, attendance: null,
        attendanceUnavailableReason: "Review incomplete.",
        weeklyMilestones: [{ weekNumber: 1, private: "PRIVATE",
          submission: { at: "2026-10-20T15:30:00Z", state: "recorded", text: "PRIVATE" },
          reflection: { at: null, state: "none_recorded", text: "PRIVATE" },
          markedWatched: { at: null, state: "unavailable", fileUrl: "PRIVATE" } }],
        lastActivity: { at: null, state: "none_recorded" }, status: "needs_check_in", checkIn: { private: "PRIVATE" } }] }] });
    const result = await searchMvpLearners(params);
    expect(mocks.load).toHaveBeenCalledWith(params);
    expect(result).toMatchObject({ ok: true, pagination, directory: [{ id: "s1", enrollments: [{ status: "needs_check_in" }] }] });
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(result).toMatchObject({ directory: [{ enrollments: [{ attendanceUnavailableReason: "Review incomplete.",
      weeklyMilestones: [{ weekNumber: 1, submission: { at: "2026-10-20T15:30:00Z", state: "recorded" },
        reflection: { at: null, state: "none_recorded" }, markedWatched: { at: null, state: "unavailable" } }],
    }] }] });
  });
  it("fails safely for preview denial, altered scopes, and database errors", async () => {
    mocks.load.mockRejectedValue(new Error("PRIVATE source failure"));
    const result = await searchMvpLearners({ programId: "unauthorized" });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(result).not.toHaveProperty("directory");
  });
});
