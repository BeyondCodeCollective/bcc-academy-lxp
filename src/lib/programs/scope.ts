// Resolves the set of program slugs + UUIDs that an analytics view should
// query for. Every program — Catalyst, Beyond the Game (atg), Beyond Code
// Centers, Forte — is standalone and scopes to just itself. (Catalyst used to
// aggregate atg + beyond-code-centers; those are now their own programs.)
//
// Returned `slugs` is for tables keyed by program_slug (invites,
// assessment_results, joined survey responses); `ids` is for tables keyed by
// program_id (students, student_tracks, attendance, submissions, …).

import { createServiceClient } from "@/lib/supabase/server";

export type ProgramScope = { slugs: string[]; ids: string[] };

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
