import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  configured: true,
  user: { id: "u1" } as { id: string } | null,
  authError: null as unknown,
  role: "admin" as string | undefined,
  progress: [] as Record<string, unknown>[],
  subs: [] as Record<string, unknown>[],
  svcCalls: [] as string[],
  fail: false,
}));

vi.mock("@/lib/programs/server", () => ({ getProgramId: async () => "prog-1" }));
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => mocks.configured,
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user }, error: mocks.authError }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: mocks.role ? { role: mocks.role } : null }) }) }),
    }),
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      mocks.svcCalls.push(table);
      return {
        select: () => ({
          eq: async () =>
            mocks.fail
              ? { data: null, error: { message: "x" } }
              : { data: table === "week_progress" ? mocks.progress : mocks.subs, error: null },
        }),
      };
    },
  }),
}));

import { GET } from "./route";
const call = () => GET(new NextRequest("https://bccacademy.io/api/week-progress"));

beforeEach(() => {
  mocks.configured = true;
  mocks.user = { id: "u1" };
  mocks.authError = null;
  mocks.role = "admin";
  mocks.progress = [];
  mocks.subs = [];
  mocks.svcCalls = [];
  mocks.fail = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("/api/week-progress", () => {
  it("returns an empty list when Supabase is not configured", async () => {
    mocks.configured = false;
    expect(await (await call()).json()).toEqual({ records: [] });
  });

  it("401s anonymous callers and 403s students without reading data", async () => {
    mocks.user = null;
    expect((await call()).status).toBe(401);
    mocks.user = { id: "u1" };
    mocks.role = "student";
    expect((await call()).status).toBe(403);
    mocks.role = undefined;
    expect((await call()).status).toBe(403);
    expect(mocks.svcCalls).toEqual([]);
  });

  it("merges watched and submitted rows per student/track/week", async () => {
    mocks.progress = [{ user_id: "s1", track_slug: "t", week_number: 1, video_watched_at: "2026-11-01" }];
    mocks.subs = [
      { student_id: "s1", track_slug: "t", week_number: 1, submitted_at: "2026-11-02" },
      { student_id: "s2", track_slug: "t", week_number: 2, submitted_at: null },
    ];
    const { records } = await (await call()).json();
    expect(records).toEqual(
      expect.arrayContaining([
        { student_id: "s1", track_slug: "t", week_number: 1, video_watched: true, homework_submitted: true },
        { student_id: "s2", track_slug: "t", week_number: 2, video_watched: false, homework_submitted: false },
      ]),
    );
    expect(records).toHaveLength(2);
  });

  it("500s on a query error", async () => {
    mocks.fail = true;
    expect((await call()).status).toBe(500);
  });
});
