import { cache } from "react";
import { headers, cookies } from "next/headers";
import { getProgramBySlug, getProgramByDomain, isKnownProgramHost } from "./index";
import type { ProgramConfig, TrackConfig } from "./types";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Get the current program config in a server component or server action.
 *
 * Resolution order (first match wins):
 *  1. Recognized production host (e.g. atg.bccacademy.io) — URL is the
 *     strongest signal and can't be faked by a cookie.
 *  2. `program-override` cookie — set by the super-admin program switcher
 *     in the admin panel; only honored on non-production hosts.
 *  3. `x-program-slug` request header — set by middleware on every request
 *     so server actions (which don't receive the original URL) can read it.
 *  4. `program-slug` cookie — fallback for requests where the header hasn't
 *     propagated yet (e.g. first render on a cold edge node).
 *  5. Domain-based lookup on the raw host — handles unknown subdomains and
 *     local dev (falls back to the default program for the domain).
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

/** The legacy synchronous resolution — TS config only, no DB. */
async function resolveBaseProgram(): Promise<ProgramConfig> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";

  if (isKnownProgramHost(host)) {
    return getProgramByDomain(host);
  }

  const c = await cookies();
  const overrideSlug = c.get("program-override")?.value;
  if (overrideSlug) return getProgramBySlug(overrideSlug);

  const headerSlug = h.get("x-program-slug");
  if (headerSlug) return getProgramBySlug(headerSlug);

  const cookieSlug = c.get("program-slug")?.value;
  if (cookieSlug) return getProgramBySlug(cookieSlug);

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
};

/**
 * Cross-request TTL cache so the dashboard layout skips Supabase on every
 * navigation. track_overrides change infrequently (admins editing track meta),
 * so a 60s TTL eliminates 2 DB round-trips per page click.
 */
const _overrideStore = new Map<string, { data: Map<string, TrackOverrideRow>; ts: number }>();
const _OVERRIDE_TTL = 60_000;

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
    const cached = _overrideStore.get(programSlug);
    if (cached && Date.now() - cached.ts < _OVERRIDE_TTL) {
      return cached.data;
    }
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
          "track_slug, name, short_name, description, instructor, start_date, total_weeks, sessions_per_week, last_session_day_offset, session_times, week_summaries, default_reflection_prompts, submissions_enabled, reflections_enabled",
        )
        .eq("program_id", programRow.id);
      const map = new Map<string, TrackOverrideRow>();
      for (const row of data ?? []) {
        map.set((row as TrackOverrideRow).track_slug, row as TrackOverrideRow);
      }
      _overrideStore.set(programSlug, { data: map, ts: Date.now() });
      return map;
    } catch (err) {
      // Don't take down the app if the table is missing (e.g. migration
      // hasn't been applied yet) — fall back to TS configs untouched.
      console.warn("[getProgram] track_overrides fetch failed:", err);
      return new Map();
    }
  },
);

async function applyTrackOverrides(program: ProgramConfig): Promise<ProgramConfig> {
  const overrides = await fetchOverrides(program.slug);
  if (overrides.size === 0) return program;
  return {
    ...program,
    tracks: program.tracks.map((t) => mergeTrack(t, overrides.get(t.slug))),
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
