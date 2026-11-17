import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// #1376: an admin whose program switcher points at BGC joins the Field Ready
// staff cohort from its week page. The browsing program doesn't list that
// track, so the route must fall back to the course's own program to resolve
// the live session, or the attendance write is skipped.

const mocks = vi.hoisted(() => ({
  browsingTracks: [] as { slug: string; weekSummaries: { week: number; date?: string }[] }[],
  resolved: null as null | { track: { slug: string; weekSummaries: { week: number; date?: string }[] } },
  enrolled: true,
  upserts: [] as Record<string, unknown>[],
  afterTasks: [] as (() => Promise<void>)[],
}));

vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => Promise<void>) => mocks.afterTasks.push(fn),
}));
vi.mock("@/lib/programs/server", () => ({
  getProgram: async () => ({ slug: "bgc", tracks: mocks.browsingTracks }),
  resolveTrackProgram: async () => mocks.resolved,
}));
vi.mock("@/lib/auth/active-enrollment", () => ({
  getLearnerAccess: async () => ({ pendingOnly: false }),
}));
vi.mock("@/lib/auth/admins", () => ({ isStaffEmail: () => false }));
vi.mock("@/lib/analytics/log-event", () => ({ logActivityEvent: async () => {} }));
vi.mock("@/lib/zoom-binding", () => ({ isMeetingBoundToLearnerTrack: async () => false }));
vi.mock("@/lib/utils", async (orig) => ({
  ...(await orig<typeof import("@/lib/utils")>()),
  // Pin "today" to unit 2 so the test doesn't depend on the clock.
  resolveCurrentUnit: () => 2,
}));
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => true,
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "admin-1", email: "a@example.org" } } }) },
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => {
          if (table === "students") return { data: { id: "admin-1", first_name: "A", last_name: "B", role: "admin" } };
          if (table === "student_tracks") {
            return { data: mocks.enrolled ? { student_id: "admin-1", program_id: "field-ready-prog" } : null };
          }
          return { data: null };
        },
        upsert: async (row: Record<string, unknown>) => {
          mocks.upserts.push(row);
          return { error: null };
        },
      };
      return q;
    },
  }),
}));

import { POST } from "./route";

const req = () =>
  new NextRequest("http://localhost/api/zoom-signature", {
    method: "POST",
    // No weekNumber from the client: the server must resolve the live unit.
    body: JSON.stringify({ meetingNumber: "88027082586", trackSlug: "field-ready-staff" }),
  });

const fieldReady = {
  slug: "field-ready-staff",
  weekSummaries: [
    { week: 1, date: "2026-11-09" },
    { week: 2, date: "2026-11-16" },
  ],
};

async function joinAndFlush() {
  const res = await POST(req());
  for (const t of mocks.afterTasks) await t();
  return res;
}

describe("POST /api/zoom-signature attendance", () => {
  beforeEach(() => {
    process.env.ZOOM_SDK_KEY = "k";
    process.env.ZOOM_SDK_SECRET = "s";
    mocks.browsingTracks = [];
    mocks.resolved = { track: fieldReady };
    mocks.enrolled = true;
    mocks.upserts = [];
    mocks.afterTasks = [];
  });

  it("records an admin browsing another program who is enrolled in a staff-cohort track", async () => {
    const res = await joinAndFlush();
    expect(res.status).toBe(200);
    expect(mocks.upserts).toEqual([
      expect.objectContaining({
        program_id: "field-ready-prog",
        student_id: "admin-1",
        track: "field-ready-staff",
        week_number: 2,
        session_number: 1,
      }),
    ]);
  });

  it("writes nothing when the track can't be resolved and the client sent no week", async () => {
    mocks.resolved = null;
    await joinAndFlush();
    expect(mocks.upserts).toEqual([]);
  });

  it("writes nothing for an admin who isn't enrolled in the track", async () => {
    mocks.enrolled = false;
    await joinAndFlush();
    expect(mocks.upserts).toEqual([]);
  });
});
