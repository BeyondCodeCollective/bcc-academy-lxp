import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  sync: vi.fn(),
  tracks: [] as unknown[],
}));

vi.mock("@/lib/zoom-report", () => ({ zoomReportConfigured: mocks.configured }));
vi.mock("@/lib/attendance/zoom-sync", () => ({ syncZoomAttendanceForSession: mocks.sync }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: () => ({ select: async () => ({ data: mocks.tracks, error: null }) }),
  }),
}));

import { GET } from "./zoom-attendance/route";

const call = (auth?: string) =>
  GET(new Request("https://bccacademy.io/api/cron/zoom-attendance", { headers: auth ? { authorization: auth } : {} }));

beforeEach(() => {
  mocks.configured.mockReset().mockReturnValue(false);
  mocks.sync.mockReset();
  mocks.tracks = [];
});
afterEach(() => vi.unstubAllEnvs());

describe("zoom-attendance cron auth", () => {
  it("401s without the bearer or with the wrong one when CRON_SECRET is set", async () => {
    vi.stubEnv("CRON_SECRET", "abc");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect((await call("abc")).status).toBe(401);
    expect(mocks.configured).not.toHaveBeenCalled();
  });

  it("passes with the right bearer", async () => {
    vi.stubEnv("CRON_SECRET", "abc");
    const res = await call("Bearer abc");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, skipped: "zoom-not-configured" });
  });

});
