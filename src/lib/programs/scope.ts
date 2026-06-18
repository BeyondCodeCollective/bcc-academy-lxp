// Resolves the set of program slugs + UUIDs that an analytics view should
// query for. Mirrors the admin page's logic: Catalyst is an umbrella, so its
// learners live under the underlying programs' IDs (atg / beyond-code-centers /
// forte) and must be aggregated; any other program scopes to just itself.
//
// Returned `slugs` is for tables keyed by program_slug (invites,
// assessment_results, joined survey responses); `ids` is for tables keyed by
// program_id (students, student_tracks, attendance, submissions, …).

import { createServiceClient } from "@/lib/supabase/server";

const CATALYST_AGGREGATE = ["catalyst", "atg", "beyond-code-centers", "forte"];

export type ProgramScope = { slugs: string[]; ids: string[] };

const _cache = new Map<string, { scope: ProgramScope; ts: number }>();

export async function resolveProgramScope(programSlug: string): Promise<ProgramScope> {
  const slugs = programSlug === "catalyst" ? CATALYST_AGGREGATE : [programSlug];
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
