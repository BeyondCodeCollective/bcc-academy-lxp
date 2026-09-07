// Resolves the set of program slugs + UUIDs that an analytics view should
// query for. Every program — Catalyst, Beyond the Game (atg), Beyond Code
// Centers, Forte — is standalone and scopes to just itself. (Catalyst used to
// aggregate atg + beyond-code-centers; those are now their own programs.)
//
// Returned `slugs` is for tables keyed by program_slug (invites,
// assessment_results, joined survey responses); `ids` is for tables keyed by
// program_id (students, student_tracks, attendance, submissions, …).

import { createServiceClient } from "@/lib/supabase/server";
import { getEveryProgramConfig } from "@/lib/programs";
import { countedUnits, type TrackLike } from "@/lib/attendance/compute";

export type ProgramScope = { slugs: string[]; ids: string[] };

/**
 * Every track slug the scope's programs own: TS-config tracks plus DB/builder
 * courses from track_overrides. Track slugs are globally unique
 * (student_tracks is UNIQUE(student_id, track_slug)), so slug lists — never
 * the program_id stamps on activity rows — are the safe membership scope.
 * Signups on the apex domain stamp rows with Catalyst's id, which made
 * program_id-filtered analytics read zero on standalone program views.
 */
export async function resolveScopeTrackSlugs(scope: ProgramScope): Promise<string[]> {
  const fromConfig = getEveryProgramConfig()
    .filter((p) => scope.slugs.includes(p.slug))
    .flatMap((p) => p.tracks.map((t) => t.slug));
  const svc = createServiceClient();
  const { data } = await svc
    .from("track_overrides")
    .select("track_slug")
    .in("program_id", scope.ids);
  return Array.from(
    new Set([...fromConfig, ...(data ?? []).map((r) => r.track_slug as string)]),
  );
}

const _cache = new Map<string, { scope: ProgramScope; ts: number }>();

export async function resolveProgramScope(programSlug: string): Promise<ProgramScope> {
  // The apex (bccacademy.io) resolves to the "marketing" pseudo-program, which
  // has NO row in the programs table — scoping analytics to it returns zero ids
  // and renders an empty program view. Map it to Catalyst, the umbrella that
  // owns the apex intake data (same mapping as dashboard/actions.ts and the
  // public-survey action).
  const slugs = [programSlug === "marketing" ? "catalyst" : programSlug];
  const key = slugs.join(",");
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.ts < 60_000) return cached.scope;

  const svc = createServiceClient();
  const { data } = await svc.from("programs").select("id, slug").in("slug", slugs);
  const rows = (data ?? []) as { id: string; slug: string }[];
  const scope: ProgramScope = { slugs, ids: rows.map((r) => r.id) };

  // Only cache non-empty results — an empty result is usually a transient
  // cold-start race, and caching it would pin the page to "0 of everything".
  if (scope.ids.length > 0) _cache.set(key, { scope, ts: Date.now() });
  return scope;
}


/**
 * Course length + units-held-so-far for every track an analytics view might
 * meet, DB-first. Builder-created courses live only in `track_overrides`, so a
 * map built from the TS registry alone was blind to them and every caller
 * defaulted to 8 weeks: Security+ (19 sessions) read 92% "finished" at
 * session 10, Home for the Summer (6 days) could never pass 75%, Endless (3
 * days) read 0 finished (analytics audit, 2026-08-18).
 *
 * `totalUnits` is null when genuinely unknown; callers must report n/a rather
 * than invent a denominator (trust contract rule 5). `heldUnits` is the count
 * of dated, non-extra units whose date has arrived — the fair denominator for
 * "how far along should someone be", never "how long is the course".
 */
export type TrackLength = { name: string; totalUnits: number | null; heldUnits: number; selfPaced: boolean };

export async function resolveTrackLengths(
  slugs?: string[],
  asOf: Date = new Date(),
): Promise<Map<string, TrackLength>> {
  const out = new Map<string, TrackLength>();
  // TS registry first (legacy courses).
  for (const p of getEveryProgramConfig()) {
    for (const t of p.tracks) {
      if (slugs && !slugs.includes(t.slug)) continue;
      let held = 0;
      if (!t.startDateTbd && t.startDate) {
        try { held = countedUnits(t, asOf).length; } catch { /* config gaps */ }
      }
      out.set(t.slug, {
        name: t.shortName || t.name,
        totalUnits: t.totalWeeks ?? null,
        heldUnits: held,
        selfPaced: !!t.selfPaced,
      });
    }
  }
  // track_overrides overlay: authoritative for builder courses AND for legacy
  // courses whose length/dates were edited in the admin.
  const svc = createServiceClient();
  let query = svc
    .from("track_overrides")
    .select("track_slug, name, short_name, total_weeks, start_date, week_summaries, last_session_day_offset");
  if (slugs && slugs.length) query = query.in("track_slug", slugs);
  const { data } = await query;
  for (const r of (data ?? []) as {
    track_slug: string; name: string | null; short_name: string | null; total_weeks: number | null;
    start_date: string | null; week_summaries: { week: number; date?: string; label?: string }[] | null;
    last_session_day_offset: number | null;
  }[]) {
    const prev = out.get(r.track_slug);
    const total = r.total_weeks ?? r.week_summaries?.length ?? prev?.totalUnits ?? null;
    let held = prev?.heldUnits ?? 0;
    if (r.start_date) {
      const like: TrackLike = {
        slug: r.track_slug,
        startDate: r.start_date,
        totalWeeks: total ?? 0,
        weekSummaries: r.week_summaries ?? [],
        lastSessionDayOffset: r.last_session_day_offset ?? 0,
      } as TrackLike;
      try { held = countedUnits(like, asOf).length; } catch { /* keep prev */ }
    }
    out.set(r.track_slug, {
      name: r.short_name ?? r.name ?? prev?.name ?? r.track_slug,
      totalUnits: total,
      heldUnits: held,
      selfPaced: prev?.selfPaced ?? false,
    });
  }
  return out;
}
