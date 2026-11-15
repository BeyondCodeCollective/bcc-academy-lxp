import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  configured: true,
  user: { id: "u1" } as { id: string } | null,
  authError: null as unknown,
  role: "admin" as string | undefined,
  home: "prog-1" as string | null,
  grants: [] as { programId: string }[],
  instructorTracks: [] as { track_slug: string }[],
  inFilters: [] as [string, string, string[]][],
  progress: [] as Record<string, unknown>[],
  subs: [] as Record<string, unknown>[],
  svcCalls: [] as string[],
  fail: false,
}));

vi.mock("@/lib/programs/server", () => ({ getProgramId: async () => "prog-1" }));
vi.mock("@/lib/auth/program-access", () => ({
  getProgramGrants: async () => mocks.grants,
  allowedProgramIds: (home: string | null, grants: { programId: string }[]) => [
    ...(home ? [home] : []),
    ...grants.map((g) => g.programId),
  ],
}));
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => mocks.configured,
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user }, error: mocks.authError }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: mocks.role ? { role: mocks.role, program_id: mocks.home } : null }),
        }),
      }),
    }),
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      mocks.svcCalls.push(table);
      // Chainable and awaitable, like a PostgREST query builder.
      const result = () =>
        mocks.fail
          ? { data: null, error: { message: "x" } }
          : {
              data:
                table === "week_progress"
                  ? mocks.progress
                  : table === "instructor_tracks"
                    ? mocks.instructorTracks
                    : mocks.subs,
              error: null,
            };
      const q = {
        select: () => q,
        eq: () => q,
        in: (col: string, vals: string[]) => {
          mocks.inFilters.push([table, col, vals]);
          return q;
        },
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve),
      };
      return q;
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
  mocks.home = "prog-1";
  mocks.grants = [];
  mocks.instructorTracks = [];
  mocks.inFilters = [];
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

  it("403s an admin whose home program and grants do not cover the request's program", async () => {
    mocks.home = "prog-2";
    expect((await call()).status).toBe(403);
    expect(mocks.svcCalls).toEqual([]);
    mocks.grants = [{ programId: "prog-1" }];
    expect((await call()).status).toBe(200);
  });

  it("lets a super admin read any program", async () => {
    mocks.role = "super_admin";
    mocks.home = "prog-2";
    expect((await call()).status).toBe(200);
  });

  it("limits an instructor to their assigned tracks, and 403s one with none here", async () => {
    mocks.role = "instructor";
    mocks.home = "prog-2";
    expect((await call()).status).toBe(403);
    mocks.instructorTracks = [{ track_slug: "t" }];
    expect((await call()).status).toBe(200);
    expect(mocks.inFilters).toEqual([
      ["week_progress", "track_slug", ["t"]],
      ["submissions", "track_slug", ["t"]],
    ]);
  });

  it("500s on a query error", async () => {
    mocks.fail = true;
    expect((await call()).status).toBe(500);
  });
});
