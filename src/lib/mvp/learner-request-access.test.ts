import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn(), user: vi.fn(), profile: vi.fn(), preview: vi.fn(), eq: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/auth/preview-mode", () => ({ isPreviewingAsStudent: mocks.preview }));
import { requireCurrentMvpLearnerAccess } from "./learner-request-access";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: "actor" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { id: "actor", role: "super_admin" }, error: null });
  mocks.preview.mockResolvedValue(false);
  mocks.eq.mockReturnValue({ single: mocks.profile });
  mocks.client.mockResolvedValue({ auth: { getUser: mocks.user }, from: () => ({ select: () => ({ eq: mocks.eq }) }) });
});
describe("Fresh MVP learner request authorization", () => {
  it("rechecks identity and database role on each invocation", async () => {
    await requireCurrentMvpLearnerAccess();
    mocks.profile.mockResolvedValue({ data: { id: "actor", role: "student" }, error: null });
    await expect(requireCurrentMvpLearnerAccess()).rejects.toThrow();
    expect(mocks.user).toHaveBeenCalledTimes(2);
    expect(mocks.profile).toHaveBeenCalledTimes(2);
    expect(mocks.eq).toHaveBeenCalledWith("id", "actor");
  });
  it.each(["student", "instructor", "admin", null])("denies current role %s", async role => {
    mocks.profile.mockResolvedValue({ data: { id: "actor", role }, error: null });
    await expect(requireCurrentMvpLearnerAccess()).rejects.toThrow();
  });
  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: "actor" } }, error: new Error("auth") },
  ])("denies invalid identity before reading a profile", async result => {
    mocks.user.mockResolvedValue(result);
    await expect(requireCurrentMvpLearnerAccess()).rejects.toThrow();
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it.each([
    { data: null, error: null },
    { data: { id: "other", role: "super_admin" }, error: null },
    { data: { id: "actor", role: "super_admin" }, error: new Error("read failed") },
  ])("fails closed on absent, mismatched, or unreadable profiles", async result => {
    mocks.profile.mockResolvedValue(result);
    await expect(requireCurrentMvpLearnerAccess()).rejects.toThrow();
  });
  it("blocks student preview even for a current super-admin", async () => {
    mocks.preview.mockResolvedValue(true);
    await expect(requireCurrentMvpLearnerAccess()).rejects.toThrow();
  });
});
