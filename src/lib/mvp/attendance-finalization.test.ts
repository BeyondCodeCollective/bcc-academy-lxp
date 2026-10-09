import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseMvpReviewDecision } from "./attendance-finalization";

const mocks = vi.hoisted(() => ({ manager: vi.fn(), scope: vi.fn(), home: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/app/dashboard/admin/actions-shared", () => ({ requireManager: mocks.manager }));
vi.mock("@/lib/programs/scope", () => ({ resolveScopeTrackSlugs: mocks.scope }));
vi.mock("@/lib/programs", () => ({ getHomeProgramForTrack: mocks.home }));
// The actual authorization helpers are pure; suppress their unused DB dependency.
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: vi.fn() }));
import { finalizeMvpAttendanceReview, readMvpAttendanceReviewHistory } from "./attendance-review-server";

const programId = "11111111-1111-1111-1111-111111111111";
const learnerId = "22222222-2222-2222-2222-222222222222";
const decision = { programId, learnerId, courseSlug: "example", weekNumber: 1, sessionNumber: 1,
  expectedRevision: 0, heldAt: "2026-01-01T18:00:00Z", eligibility: "eligible", eligibilityBasis: "Roster snapshot Jan 1",
  outcome: "absent", reason: "Finalized against facilitator's attendance sheet" };
const scope = { programId, learnerId, courseSlug: "example", weekNumber: 1, sessionNumber: 1 };
const responses: Record<string, unknown> = {};
let actor: { role: string; userId: string; programId: string | null; grants: { programId: string; role: string; trackSlug: string | null }[]; svc: { from: typeof mocks.from; rpc: typeof mocks.rpc } };
const conditions: Array<[string, string, unknown]> = [];
beforeEach(() => {
  vi.clearAllMocks();
  conditions.length = 0;
  Object.assign(responses, {
    programs: { data: { slug: "example-program" }, error: null },
    student_tracks: { data: [{ id: "enrollment" }], error: null },
    track_overrides: { data: { start_date: "2026-01-01", total_weeks: 1, sessions_per_week: 1,
      last_session_day_offset: 0, unit_label: "Session", week_summaries: [{ week: 1, date: "2026-01-01" }], self_paced: false }, error: null },
    session_content: { data: [{ status: "completed", status_2: "upcoming", status_3: "upcoming" }], error: null },
    attendance: { data: [], error: null }, mvp_attendance_reviews: { data: [], error: null },
  });
  mocks.from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "gt", "limit", "order", "single", "maybeSingle"]) chain[method] = (key: string, value: unknown) => {
      if (method === "eq" || method === "gt") conditions.push([table, key, value]);
      return chain;
    };
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(responses[table]));
    return chain;
  });
  actor = { role: "admin", userId: "reviewer-from-session", programId, grants: [], svc: { from: mocks.from, rpc: mocks.rpc } };
  mocks.manager.mockImplementation(async () => actor);
  mocks.scope.mockResolvedValue(["example"]);
  mocks.home.mockReturnValue(undefined);
  mocks.rpc.mockResolvedValue({ data: { id: "review", revision: 1, recorded_by: actor.userId }, error: null });
});
describe("attendance staff finalization", () => {
  it("validates evidence, outcome combinations and forbids forged audit fields", () => {
    expect(parseMvpReviewDecision(decision).reason).toBe(decision.reason);
    for (const patch of [{ recorded_by: "forged" }, { reason: " " }, { eligibilityBasis: null },
      { eligibility: "not_eligible", outcome: "absent" }, { expectedRevision: -1 }, { sessionNumber: 4 },
      { heldAt: "bad" }, { eligibility: "unknown", outcome: "present" }]) {
      expect(() => parseMvpReviewDecision({ ...decision, ...patch })).toThrow();
    }
  });
  it("saves with session-derived reviewer and scoped enrollment", async () => {
    await finalizeMvpAttendanceReview(decision);
    expect(mocks.rpc).toHaveBeenCalledWith("finalize_mvp_attendance_review", { p_decision: decision, p_actor: actor.userId });
    expect(conditions).toContainEqual(["student_tracks", "program_id", programId]);
    expect(conditions).toContainEqual(["student_tracks", "student_id", learnerId]);
    expect(conditions).toContainEqual(["attendance", "track", "example"]);
    expect(conditions).not.toContainEqual(["attendance", "program_id", programId]);
  });
  it("passes the reviewed revision for corrections and surfaces stale-save conflicts", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    await expect(finalizeMvpAttendanceReview({ ...decision, expectedRevision: 4, outcome: "unknown", reason: "Reopened after evidence conflict" })).rejects.toThrow("Reload");
    expect(mocks.rpc.mock.calls[0][1].p_decision.expectedRevision).toBe(4);
  });
  it.each(["student", "instructor"])("denies %s even with a mocked manager", async role => {
    actor.role = role;
    await expect(finalizeMvpAttendanceReview(decision)).rejects.toThrow("access");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("denies preview/authentication failure before reads", async () => {
    mocks.manager.mockRejectedValue(new Error("Exit student preview"));
    await expect(finalizeMvpAttendanceReview(decision)).rejects.toThrow("preview");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("does not borrow instructor or another course's admin grant", async () => {
    actor.programId = null;
    actor.grants = [{ programId, role: "instructor", trackSlug: null }, { programId, role: "admin", trackSlug: "other" }];
    await expect(finalizeMvpAttendanceReview(decision)).rejects.toThrow("access");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("accepts a course-specific admin grant and super-admin access", async () => {
    actor.programId = null;
    actor.grants = [{ programId, role: "admin", trackSlug: "example" }];
    await finalizeMvpAttendanceReview(decision);
    actor.grants = []; actor.role = "super_admin";
    await finalizeMvpAttendanceReview(decision);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
  it.each(["student_tracks", "track_overrides", "session_content", "attendance"])("fails closed on %s read failure", async table => {
    responses[table] = { data: null, error: { message: "failed" } };
    await expect(finalizeMvpAttendanceReview(decision)).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects unverified, conflicting or future sessions and positive check-ins", async () => {
    responses.session_content = { data: [{ status: "upcoming" }], error: null };
    await expect(finalizeMvpAttendanceReview(decision)).rejects.toThrow("delivery");
    responses.session_content = { data: [{ status: "completed" }, { status: "completed" }], error: null };
    await expect(finalizeMvpAttendanceReview(decision)).rejects.toThrow("delivery");
    responses.session_content = { data: [{ status: "completed" }], error: null };
    responses.attendance = { data: [{ id: "check-in" }], error: null };
    await expect(finalizeMvpAttendanceReview(decision)).rejects.toThrow("conflicting");
    await expect(finalizeMvpAttendanceReview({ ...decision, heldAt: "2099-01-01T00:00:00Z" })).rejects.toThrow("held");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not claim success when the migration/write is unavailable", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42883" } });
    await expect(finalizeMvpAttendanceReview(decision)).rejects.toThrow("not saved");
  });
  it("authorizes history, fails on missing schema, and never loops on a stale cursor", async () => {
    expect(await readMvpAttendanceReviewHistory(scope)).toEqual([]);
    responses.mvp_attendance_reviews = { data: null, error: { message: "missing table" } };
    await expect(readMvpAttendanceReviewHistory(scope)).rejects.toThrow("history");
    responses.mvp_attendance_reviews = { data: [{ revision: 1 }], error: null };
    await expect(readMvpAttendanceReviewHistory(scope)).rejects.toThrow("pagination");
    actor.programId = null;
    await expect(readMvpAttendanceReviewHistory(scope)).rejects.toThrow("access");
  });
});
