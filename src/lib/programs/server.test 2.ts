import { describe, it, expect, vi, beforeEach } from "vitest";

// Drives the real program resolution (priority order, dynamic orgs, override
// merging, hidden courses) against the real TS program configs. Only the
// request APIs (headers/cookies) and the Supabase service client are stubbed.
type Row = Record<string, unknown>;
type Single = { data: unknown; error?: unknown };

const db = {
  overrides: [] as Row[], // track_overrides rows, each with programs: { slug }
  dynamic: [] as Row[], // programs rows where is_dynamic
  ownerOfSlug: null as Row | null, // track_overrides lookup by slug (builder owner)
  programRow: { data: { id: "prog-uuid" } } as Single,
  failOverrides: false,
  failDynamic: false,
};
const hidden = new Set<string>();
const reqHeaders = new Map<string, string>();
const reqCookies = new Map<string, string>();

function builder(table: string) {
  const b: Record<string, unknown> = {};
  const self = () => b;
  for (const m of ["select", "eq", "order", "limit"]) b[m] = self;
  b.maybeSingle = async () =>
    table === "track_overrides" ? { data: db.ownerOfSlug } : { data: null };
  b.single = async () => db.programRow;
  // Awaiting the builder directly = a list read.
  b.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
    try {
      if (table === "track_overrides") {
        if (db.failOverrides) throw new Error("overrides down");
        return resolve({ data: db.overrides });
      }
      if (table === "programs") {
        if (db.failDynamic) throw new Error("programs down");
        return resolve({ data: db.dynamic });
      }
      return resolve({ data: [] });
    } catch (e) {
      return reject(e);
    }
  };
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({ from: (t: string) => builder(t) }),
}));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => reqHeaders.get(k) ?? null }),
  cookies: async () => ({
    get: (k: string) => (reqCookies.has(k) ? { value: reqCookies.get(k) } : undefined),
  }),
}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/programs/hidden", () => ({ getHiddenTrackSlugs: async () => hidden }));

import {
  getProgram,
  getProgramWithOverrides,
  getProgramId,
  listDynamicPrograms,
  fetchDynamicProgram,
  resolveTrackProgram,
  resolveHomeProgramSlug,
} from "@/lib/programs/server";
import { getProgramBySlug } from "@/lib/programs";
import { PREVIEW_COOKIE, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";

const forteTrack = getProgramBySlug("forte").tracks[0];
const bgcTrack = getProgramBySlug("bgc").tracks[0];

const override = (track_slug: string, program: string, extra: Row = {}): Row => ({
  track_slug,
  programs: { slug: program },
  name: null,
  short_name: null,
  description: null,
  instructor: null,
  start_date: null,
  kickoff_time_utc: null,
  companion_of: null,
  cover_image_url: null,
  total_weeks: null,
  unit_label: null,
  sessions_per_week: null,
  last_session_day_offset: null,
  session_times: null,
  week_summaries: null,
  default_reflection_prompts: null,
  submissions_enabled: null,
  reflections_enabled: null,
  sequential_gating: null,
  phase: null,
  office_hours: null,
  self_paced: null,
  ...extra,
});

const demoOrg = (extra: Row = {}) => ({
  id: "demo-id",
  slug: "demo-org",
  name: "Demo Org",
  accent: "#112233",
  logo_url: null,
  ...extra,
});

beforeEach(() => {
  db.overrides = [];
  db.dynamic = [];
  db.ownerOfSlug = null;
  db.programRow = { data: { id: "prog-uuid" } };
  db.failOverrides = false;
  db.failDynamic = false;
  hidden.clear();
  reqHeaders.clear();
  reqCookies.clear();
  reqHeaders.set("host", "localhost:3000");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("getProgram: which program wins", () => {
  it("falls back to the host default (Catalyst) with no signals", async () => {
    expect((await getProgram()).slug).toBe("catalyst");
  });

  it("uses the program-slug cookie", async () => {
    reqCookies.set("program-slug", "atg");
    expect((await getProgram()).slug).toBe("atg");
  });

  it("prefers the x-program-slug header over the cookie", async () => {
    reqCookies.set("program-slug", "atg");
    reqHeaders.set("x-program-slug", "forte");
    expect((await getProgram()).slug).toBe("forte");
  });

  it("prefers the program-override cookie over the header", async () => {
    reqHeaders.set("x-program-slug", "forte");
    reqCookies.set("program-override", "bgc");
    expect((await getProgram()).slug).toBe("bgc");
  });

  it("prefers the preview cookie over everything, using the first course's home program", async () => {
    reqCookies.set("program-override", "bgc");
    reqCookies.set(PREVIEW_COOKIE, `${forteTrack.slug},${bgcTrack.slug}`);
    expect((await getProgram()).slug).toBe("forte");
  });

  it("ignores the Lunch & Learn preview marker", async () => {
    reqCookies.set(PREVIEW_COOKIE, LUNCH_LEARN_PREVIEW_SLUG);
    reqCookies.set("program-override", "bgc");
    expect((await getProgram()).slug).toBe("bgc");
  });

  it("previews a builder course in the program that owns its override row", async () => {
    db.overrides = [override("builder-course", "bgc")];
    db.ownerOfSlug = override("builder-course", "bgc");
    reqCookies.set(PREVIEW_COOKIE, "builder-course");
    expect((await getProgram()).slug).toBe("bgc");
  });

  it("keeps the shell usable on Catalyst when the preview slug is stale", async () => {
    reqCookies.set(PREVIEW_COOKIE, "deleted-course");
    expect((await getProgram()).slug).toBe("catalyst");
  });

  it("skips a stale cookie for an unknown program and falls through to the host default", async () => {
    reqCookies.set("program-slug", "no-such-program");
    expect((await getProgram()).slug).toBe("catalyst");
  });

  it("resolves an admin-created org from the DB", async () => {
    db.dynamic = [demoOrg()];
    reqCookies.set("program-override", "demo-org");
    const p = await getProgram();
    expect(p.slug).toBe("demo-org");
    expect(p.name).toBe("Demo Org");
  });
});

describe("getProgram: hidden courses", () => {
  it("removes hidden tracks from the current program", async () => {
    reqCookies.set("program-override", "forte");
    hidden.add(forteTrack.slug);
    const slugs = (await getProgram()).tracks.map((t) => t.slug);
    expect(slugs).not.toContain(forteTrack.slug);
  });

  it("leaves them in getProgramWithOverrides, which the restore list reads", async () => {
    hidden.add(forteTrack.slug);
    const slugs = (await getProgramWithOverrides("forte")).tracks.map((t) => t.slug);
    expect(slugs).toContain(forteTrack.slug);
  });
});

describe("track overrides", () => {
  it("merges non-null override fields and falls back to config for nulls", async () => {
    db.overrides = [
      override(forteTrack.slug, "forte", { name: "Renamed in DB", total_weeks: 3 }),
    ];
    const t = (await getProgramWithOverrides("forte")).tracks.find((x) => x.slug === forteTrack.slug)!;
    expect(t.name).toBe("Renamed in DB");
    expect(t.totalWeeks).toBe(3);
    expect(t.shortName).toBe(forteTrack.shortName);
    expect(t.startDate).toBe(forteTrack.startDate);
  });

  it("appends builder courses (override rows with no TS config) to their own program", async () => {
    db.overrides = [override("builder-course", "forte", { name: "Built in admin" })];
    const forte = await getProgramWithOverrides("forte");
    expect(forte.tracks.find((t) => t.slug === "builder-course")?.name).toBe("Built in admin");
    const bgc = await getProgramWithOverrides("bgc");
    expect(bgc.tracks.find((t) => t.slug === "builder-course")).toBeUndefined();
  });

  it("falls back to untouched TS configs when the overrides query fails", async () => {
    db.failOverrides = true;
    const p = await getProgramWithOverrides("forte");
    expect(p.tracks.map((t) => t.slug)).toEqual(getProgramBySlug("forte").tracks.map((t) => t.slug));
  });
});

describe("DB-built tracks (dynamic orgs)", () => {
  const trackOf = async (extra: Row) => {
    db.dynamic = [demoOrg()];
    db.overrides = [override("t1", "demo-org", extra)];
    return (await fetchDynamicProgram("demo-org"))!.tracks[0];
  };

  it("applies builder defaults to a bare row", async () => {
    const t = await trackOf({});
    expect(t).toMatchObject({
      slug: "t1",
      name: "t1",
      totalWeeks: 12,
      unitLabel: "Week",
      sessionsPerWeek: 2,
      phase: "core",
      submissionsEnabled: true,
      reflectionsEnabled: true,
    });
    expect(t.weeks).toHaveLength(12);
    expect(t.weeks[0].sessions).toHaveLength(2);
  });

  it("marks an unscheduled course TBD with a far-future date so nothing unlocks", async () => {
    const t = await trackOf({ start_date: null });
    expect(t.startDateTbd).toBe(true);
    expect(t.startDate).toBe("2099-01-01");
    const scheduled = await trackOf({ start_date: "2026-11-02" });
    expect(scheduled.startDateTbd).toBe(false);
    expect(scheduled.startDate).toBe("2026-11-02");
  });

  it("gives Session-modeled courses exactly one session per unit", async () => {
    const t = await trackOf({ unit_label: "Session", sessions_per_week: 2, total_weeks: 4 });
    expect(t.weeks).toHaveLength(4);
    expect(t.weeks.every((w) => w.sessions.length === 1)).toBe(true);
  });

  it("titles weeks from week_summaries and defaults the rest", async () => {
    const t = await trackOf({
      total_weeks: 2,
      week_summaries: [{ week: 2, topic: "Ship it", icon: "🚀" }],
    });
    expect(t.weeks[0].title).toBe("Week 1");
    expect(t.weeks[1]).toMatchObject({ title: "Ship it", icon: "🚀" });
  });

  it("normalizes a Postgres timestamptz kickoff to an ISO instant, and drops garbage", async () => {
    expect((await trackOf({ kickoff_time_utc: "2026-07-13 22:30:00+00" })).kickoffTimeUtc).toBe(
      "2026-07-13T22:30:00.000Z",
    );
    expect((await trackOf({ kickoff_time_utc: "not a date" })).kickoffTimeUtc).toBeUndefined();
  });

  it("uses a valid org accent and falls back to cobalt for a bad one", async () => {
    db.dynamic = [demoOrg({ accent: "#112233" })];
    expect((await fetchDynamicProgram("demo-org"))!.colors.primary).toBe("#112233");
    db.dynamic = [demoOrg({ accent: "red" })];
    expect((await fetchDynamicProgram("demo-org"))!.colors.primary).toBe("#1D59FF");
  });

  it("returns null for an unknown org", async () => {
    expect(await fetchDynamicProgram("nope")).toBeNull();
  });
});

describe("listDynamicPrograms", () => {
  it("lists orgs, falling back to the slug when there is no name", async () => {
    db.dynamic = [demoOrg(), demoOrg({ id: "x", slug: "unnamed", name: null })];
    expect(await listDynamicPrograms()).toEqual([
      { slug: "demo-org", name: "Demo Org" },
      { slug: "unnamed", name: "unnamed" },
    ]);
  });

  it("returns an empty list instead of throwing when the query fails", async () => {
    db.failDynamic = true;
    expect(await listDynamicPrograms()).toEqual([]);
  });
});

describe("resolveTrackProgram", () => {
  it("returns the current program when it owns the track", async () => {
    reqCookies.set("program-override", "forte");
    const r = await resolveTrackProgram(forteTrack.slug);
    expect(r?.program.slug).toBe("forte");
    expect(r?.track.slug).toBe(forteTrack.slug);
  });

  it("falls back to the track's home program rather than bouncing", async () => {
    reqCookies.set("program-override", "forte");
    const r = await resolveTrackProgram(bgcTrack.slug);
    expect(r?.program.slug).toBe("bgc");
  });

  it("opens a builder course through the program that owns its override row", async () => {
    db.overrides = [override("builder-course", "bgc", { name: "Built" })];
    db.ownerOfSlug = override("builder-course", "bgc");
    reqCookies.set("program-override", "forte");
    const r = await resolveTrackProgram("builder-course");
    expect(r?.program.slug).toBe("bgc");
    expect(r?.track.name).toBe("Built");
  });

  it("returns null when no program owns the slug", async () => {
    expect(await resolveTrackProgram("ghost-course")).toBeNull();
  });
});

describe("resolveHomeProgramSlug", () => {
  it("answers from TS config without a DB read", async () => {
    expect(await resolveHomeProgramSlug(forteTrack.slug)).toBe("forte");
  });

  it("falls back to the owning program for a builder course", async () => {
    db.ownerOfSlug = { programs: { slug: "bgc" } };
    expect(await resolveHomeProgramSlug("builder-course")).toBe("bgc");
  });

  it("returns null when nothing owns the slug", async () => {
    expect(await resolveHomeProgramSlug("ghost-course")).toBeNull();
  });
});

describe("getProgramId", () => {
  it("returns the current program's UUID", async () => {
    expect(await getProgramId()).toBe("prog-uuid");
  });

  it("throws, naming the program, when the row is missing", async () => {
    db.programRow = { data: null, error: { message: "no rows" } };
    reqCookies.set("program-override", "forte");
    await expect(getProgramId()).rejects.toThrow("Program not found: forte");
  });
});
