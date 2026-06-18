import { cache } from "react";
import { headers, cookies } from "next/headers";
import { getProgramBySlug, getProgramByDomain, isKnownProgramHost, hasTsConfigSlug, getHomeProgramForTrack, getTrackBySlug } from "./index";
import type { ProgramConfig, TrackConfig, OfficeHour } from "./types";
import { createServiceClient } from "@/lib/supabase/server";
import { PREVIEW_COOKIE, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";

/**
 * Get the current program config in a server component or server action.
 *
 * Resolution order (first match wins):
 *  1. `program-override` cookie — set by the super-admin program switcher.
 *  2. `x-program-slug` request header — set by middleware on every request
 *     so server actions (which don't receive the original URL) can read it.
 *  3. `program-slug` cookie — fallback for requests where the header hasn't
 *     propagated yet (e.g. first render on a cold edge node).
 *  4. Domain-based lookup — bccacademy.io → marketing; everything else
 *     (Vercel preview URLs, localhost) → catalyst.
 *
 * Track-level metadata from `track_overrides` is layered on top of the
 * static TS config (null in DB = use config default), so admins can edit
 * track name, instructor, description, dates, weekSummaries, etc. without
 * a code deploy.
 *
 * For client components inside /dashboard: use `useProgram()` from
 * @/lib/programs/context — the layout already provides it via ProgramProvider.
 * For client components outside /dashboard (e.g. public survey pages):
 * use `useProgramSlug()` from @/lib/programs/use-program-slug.
 */
export async function getProgram(): Promise<ProgramConfig> {
  const base = await resolveBaseProgram();
  return applyTrackOverrides(base);
}

/**
 * Resolve a track and the program it should render under. Tries the current
 * (domain/cookie-resolved) program first; if the slug isn't there — which
 * happens whenever a course lives in a different program than the one the host
 * pins you to (e.g. the bccacademy.io apex, or a BGC course while you're in
 * Upskill Bahamas) — it falls back to the track's home program so the course
 * opens instead of bouncing to /dashboard. Returns null only when no program
 * anywhere owns the slug.
 */
export async function resolveTrackProgram(
  slug: string,
): Promise<{ program: ProgramConfig; track: TrackConfig } | null> {
  const current = await getProgram();
  const inCurrent = getTrackBySlug(current, slug);
  if (inCurrent) return { program: current, track: inCurrent };

  const home = getHomeProgramForTrack(slug);
  if (home && home.slug !== current.slug) {
    const withOverrides = await getProgramWithOverrides(home.slug);
    const track = getTrackBySlug(withOverrides, slug);
    if (track) return { program: withOverrides, track };
  }
  return null;
}

/** The legacy synchronous resolution — TS config only, no DB. */
async function resolveBaseProgram(): Promise<ProgramConfig> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";

  if (isKnownProgramHost(host)) {
    return getProgramByDomain(host);
  }

  const c = await cookies();

  const resolveSlug = async (slug: string): Promise<ProgramConfig | null> => {
    if (hasTsConfigSlug(slug)) return getProgramBySlug(slug);
    return fetchDynamicProgram(slug);
  };

  // Preview overlay (super-admin "preview as student"): render the previewed
  // course's program skin. Transient — driven by the preview cookie itself
  // (8h, self-clearing), NOT a sticky program-override — so the context
  // reverts the moment preview ends instead of stranding the admin in the
  // previewed program. Only super-admins can set this cookie, so its presence
  // is sufficient authorization. Highest priority while active.
  const previewSlug = c.get(PREVIEW_COOKIE)?.value;
  if (previewSlug && previewSlug !== LUNCH_LEARN_PREVIEW_SLUG) {
    const home = getHomeProgramForTrack(previewSlug);
    if (home) return home;
    // Builder-created courses live as DB track_overrides under Catalyst with no
    // TS config, so getHomeProgramForTrack can't see them. Render them in the
    // Catalyst shell — getProgram() layers the builder track on via overrides.
    // (Also keeps preview working even if a stale program-override is set.)
    return getProgramBySlug("catalyst");
  }

  const overrideSlug = c.get("program-override")?.value;
  if (overrideSlug) {
    const resolved = await resolveSlug(overrideSlug);
    if (resolved) return resolved;
  }

  const headerSlug = h.get("x-program-slug");
  if (headerSlug) {
    const resolved = await resolveSlug(headerSlug);
    if (resolved) return resolved;
  }

  const cookieSlug = c.get("program-slug")?.value;
  if (cookieSlug) {
    const resolved = await resolveSlug(cookieSlug);
    if (resolved) return resolved;
    // Stale cookie for an unknown slug — fall through to next resolution step.
    // Old behaviour was to silently return catalyst; now we try the header and
    // cookie-slug before domain-fallback, which is more correct.
  }

  return getProgramByDomain(host);
}

/** Row shape returned by Supabase for the track_overrides table. */
type TrackOverrideRow = {
  track_slug: string;
  name: string | null;
  short_name: string | null;
  description: string | null;
  instructor: string | null;
  start_date: string | null;
  total_weeks: number | null;
  sessions_per_week: number | null;
  last_session_day_offset: number | null;
  session_times: string[] | null;
  week_summaries: { week: number; topic: string; icon: string }[] | null;
  default_reflection_prompts: string[] | null;
  submissions_enabled: boolean | null;
  reflections_enabled: boolean | null;
  phase: string | null;
  office_hours: OfficeHour[] | null;
};

// ─── Dynamic Program Resolution ──────────────────────────────────────────────

type DynamicProgramRow = { id: string; slug: string; name: string | null };

function buildTrackFromOverride(row: TrackOverrideRow): TrackConfig {
  const totalWeeks = row.total_weeks ?? 12;
  const sessionsPerWeek = row.sessions_per_week ?? 2;
  const weekSummaries = (row.week_summaries as { week: number; topic: string; icon: string }[] | null) ?? [];

  // Generate a WeekConfig for each week so the admin curriculum editor
  // renders week tabs just like it does for TS-config courses.
  const weeks = Array.from({ length: totalWeeks }, (_, i) => {
    const weekNum = i + 1;
    const summary = weekSummaries.find((s) => s.week === weekNum);
    return {
      week: weekNum,
      title: summary?.topic ?? `Week ${weekNum}`,
      icon: summary?.icon ?? "📅",
      subtitle: "",
      description: "",
      objectives: [] as string[],
      sessions: Array.from({ length: sessionsPerWeek }, (_, j) => ({
        title: `Session ${j + 1}`,
        time: "",
      })),
    };
  });

  return {
    slug: row.track_slug,
    name: row.name ?? row.track_slug,
    shortName: row.short_name ?? row.name ?? row.track_slug,
    description: row.description ?? undefined,
    phase: (row.phase as TrackConfig["phase"] | null) ?? "core",
    type: "weekly",
    totalWeeks,
    sessionsPerWeek,
    startDate: row.start_date ?? new Date().toISOString().slice(0, 10),
    startDateTbd: false,
    instructor: row.instructor ?? "",
    sessionTimes: (row.session_times as string[] | null) ?? [],
    lastSessionDayOffset: row.last_session_day_offset ?? 0,
    weekSummaries,
    weeks,
    defaultReflectionPrompts: (row.default_reflection_prompts as string[] | null) ?? [],
    submissionsEnabled: row.submissions_enabled ?? true,
    reflectionsEnabled: row.reflections_enabled ?? true,
    officeHours: (row.office_hours as OfficeHour[] | null) ?? undefined,
  };
}

function buildProgramFromDB(
  programRow: DynamicProgramRow,
  trackRows: TrackOverrideRow[],
): ProgramConfig {
  const displayName = programRow.name ?? programRow.slug;
  return {
    slug: programRow.slug,
    name: displayName,
    tagline: "",
    domain: "bccacademy.io",
    dnsReady: false,
    logo: "/catalyst/logo.svg",
    colors: {
      primary: "#1D59FF",
      primaryHover: "#4D7CFF",
      accent: "#1D59FF",
      tagline: "#888888",
    },
    defaultCohort: {
      name: "cohort-1",
      displayName: "Cohort 1",
      startDate: "2099-01-01",
      totalWeeks: trackRows[0] ? (trackRows[0].total_weeks ?? 12) : 12,
    },
    tracks: trackRows.map(buildTrackFromOverride),
    requireInviteLink: false,
    coppa: { required: false },
    seo: {
      title: displayName,
      description: "",
      ogTitle: displayName,
      ogDescription: "",
    },
    organization: "Beyond Code Collective",
  };
}

/**
 * Fetch a dynamic (DB-created) program by slug. Returns null when no
 * is_dynamic program with that slug exists. TTL-cached like track_overrides.
 */
export async function fetchDynamicProgram(slug: string): Promise<ProgramConfig | null> {
  try {
    const svc = createServiceClient();
    const { data: programRow } = await svc
      .from("programs")
      .select("id, slug, name")
      .eq("slug", slug)
      .eq("is_dynamic", true)
      .maybeSingle();

    if (!programRow) return null;

    const { data: trackRows } = await svc
      .from("track_overrides")
      .select(
        "track_slug, name, short_name, description, instructor, start_date, total_weeks, sessions_per_week, last_session_day_offset, session_times, week_summaries, default_reflection_prompts, submissions_enabled, reflections_enabled",
      )
      .eq("program_id", programRow.id);

    return buildProgramFromDB(
      programRow as DynamicProgramRow,
      (trackRows ?? []) as TrackOverrideRow[],
    );
  } catch (err) {
    console.warn("[fetchDynamicProgram] failed for slug=%s:", slug, err);
    return null;
  }
}

/**
 * Merge `track_overrides` from DB onto the static program config. Field-by-
 * field null-fallback: any non-null DB value wins; null = use TS default.
 * Same semantics as `resolveSessionContent` (src/lib/session-content.ts:42).
 *
 * Cached per-request via React.cache (layout + page share one roundtrip)
 * AND cross-request via module-level TTL cache (navigation re-renders skip
 * Supabase entirely for up to 60 seconds).
 */
const fetchOverrides = cache(
  async (programSlug: string): Promise<Map<string, TrackOverrideRow>> => {
    try {
      const svc = createServiceClient();
      const { data: programRow } = await svc
        .from("programs")
        .select("id")
        .eq("slug", programSlug)
        .maybeSingle();
      if (!programRow?.id) return new Map();
      const { data } = await svc
        .from("track_overrides")
        .select(
          "track_slug, name, short_name, description, instructor, start_date, total_weeks, sessions_per_week, last_session_day_offset, session_times, week_summaries, default_reflection_prompts, submissions_enabled, reflections_enabled, phase, office_hours",
        )
        .eq("program_id", programRow.id);
      const map = new Map<string, TrackOverrideRow>();
      for (const row of data ?? []) {
        map.set((row as TrackOverrideRow).track_slug, row as TrackOverrideRow);
      }
      return map;
    } catch (err) {
      // Don't take down the app if the table is missing (e.g. migration
      // hasn't been applied yet) — fall back to TS configs untouched.
      console.warn("[getProgram] track_overrides fetch failed:", err);
      return new Map();
    }
  },
);

/** Returns a TS-config program with DB track overrides applied (includes builder-created tracks). */
export async function getProgramWithOverrides(slug: string): Promise<ProgramConfig> {
  const base = getProgramBySlug(slug);
  return applyTrackOverrides(base);
}

async function applyTrackOverrides(program: ProgramConfig): Promise<ProgramConfig> {
  // Dynamic programs have all track data built from DB rows already;
  // there are no TS config defaults to override.
  if (!hasTsConfigSlug(program.slug)) return program;

  // Catalyst is an umbrella that aggregates other programs' tracks, but each
  // track's override lives under its HOME program (e.g. ai-literacy's override
  // is stored under forte, not catalyst). Fetch this program's own overrides
  // plus every aggregated track's home-program overrides, so names/dates
  // reflect the DB on every surface (catalog, admin home, sidebar, preview) —
  // not just the program that owns the override row.
  const homeSlugs = new Set<string>([program.slug]);
  for (const t of program.tracks) {
    const home = getHomeProgramForTrack(t.slug);
    if (home) homeSlugs.add(home.slug);
  }
  const overridesBySlug = new Map(
    await Promise.all(
      [...homeSlugs].map(
        async (slug) => [slug, await fetchOverrides(slug)] as const,
      ),
    ),
  );
  const ownOverrides =
    overridesBySlug.get(program.slug) ?? new Map<string, TrackOverrideRow>();

  // Prefer a track's home-program override; fall back to this program's own
  // override row (covers tracks whose override is stored under the umbrella).
  const overrideForTrack = (slug: string): TrackOverrideRow | undefined => {
    const home = getHomeProgramForTrack(slug);
    const homeMap = home ? overridesBySlug.get(home.slug) : undefined;
    return homeMap?.get(slug) ?? ownOverrides.get(slug);
  };

  const existingSlugs = new Set(program.tracks.map((t) => t.slug));
  // Builder-created courses are stored as track_overrides rows under Catalyst
  // with no corresponding TS config entry. Append them as fully DB-sourced tracks.
  const extraTracks = [...ownOverrides.values()]
    .filter((o) => !existingSlugs.has(o.track_slug))
    .map(buildTrackFromOverride);

  return {
    ...program,
    tracks: [
      ...program.tracks.map((t) => mergeTrack(t, overrideForTrack(t.slug))),
      ...extraTracks,
    ],
  };
}

function mergeTrack(
  config: TrackConfig,
  override: TrackOverrideRow | undefined,
): TrackConfig {
  if (!override) return config;
  return {
    ...config,
    name: override.name ?? config.name,
    shortName: override.short_name ?? config.shortName,
    description: override.description ?? config.description,
    instructor: override.instructor ?? config.instructor,
    startDate: override.start_date ?? config.startDate,
    totalWeeks: override.total_weeks ?? config.totalWeeks,
    sessionsPerWeek: override.sessions_per_week ?? config.sessionsPerWeek,
    lastSessionDayOffset:
      override.last_session_day_offset ?? config.lastSessionDayOffset,
    sessionTimes: override.session_times ?? config.sessionTimes,
    weekSummaries: override.week_summaries ?? config.weekSummaries,
    defaultReflectionPrompts:
      override.default_reflection_prompts ?? config.defaultReflectionPrompts,
    submissionsEnabled:
      override.submissions_enabled ?? config.submissionsEnabled,
    reflectionsEnabled:
      override.reflections_enabled ?? config.reflectionsEnabled,
    phase: (override.phase as TrackConfig["phase"] | null) ?? config.phase,
    officeHours: override.office_hours ?? config.officeHours,
  };
}

// Resolves the current program's database UUID. Cached per request so the
// layout, page, and any action that needs the FK share one roundtrip.
export const getProgramId = cache(async (): Promise<string> => {
  const program = await resolveBaseProgram();
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("programs")
    .select("id")
    .eq("slug", program.slug)
    .single();
  if (error || !data) throw new Error(`Program not found: ${program.slug}`);
  return data.id;
});
