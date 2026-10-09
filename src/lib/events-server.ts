import { createServiceClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
import { EVENT_COLUMNS, type EventRow } from "@/lib/events";

export type EventWithProgram = EventRow & { programName: string };

/**
 * Find an event by slug. Prefers the current program, then any program: a
 * BGC registration link shared by email must work on the apex domain, where
 * the browsing context is marketing, not BGC.
 */
/** The current program's id, or null on the marketing apex (which has no programs row). */
export async function currentProgramIdOrNull(): Promise<string | null> {
  try {
    return await getProgramId();
  } catch {
    return null;
  }
}

export async function getEventBySlug(slug: string, preferredProgramId: string | null): Promise<EventWithProgram | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("events")
    .select(`${EVENT_COLUMNS}, programs(name)`)
    .eq("slug", slug)
    .order("created_at", { ascending: true })
    .limit(10);
  const rows = (data ?? []) as unknown as (EventRow & { programs: { name: string } | null })[];
  const hit = (preferredProgramId && rows.find((e) => e.program_id === preferredProgramId)) || rows[0];
  if (!hit) return null;
  const { programs, ...event } = hit;
  return { ...event, programName: programs?.name ?? "BCC Academy" };
}

/** An event by slug for a landing page: the page's program first, then any. */
export async function getEventForLanding(eventSlug: string, programSlug: string | null): Promise<EventWithProgram | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("events")
    .select(`${EVENT_COLUMNS}, programs(name, slug)`)
    .eq("slug", eventSlug)
    .neq("status", "draft")
    .limit(10);
  const rows = (data ?? []) as unknown as (EventRow & { programs: { name: string; slug: string } | null })[];
  const hit = (programSlug && rows.find((e) => e.programs?.slug === programSlug)) || rows[0];
  if (!hit) return null;
  const { programs, ...event } = hit;
  return { ...event, programName: programs?.name ?? "BCC Academy" };
}

/** Events an admin can attach to a landing page (null = every program). */
export async function listEventOptions(programIds: string[] | null): Promise<{ slug: string; title: string; programSlug: string | null }[]> {
  const svc = createServiceClient();
  let q = svc.from("events").select("slug, title, program_id, programs(slug)").order("starts_at", { ascending: false }).limit(200);
  if (programIds) q = q.in("program_id", programIds);
  const { data } = await q;
  return ((data ?? []) as unknown as { slug: string; title: string; programs: { slug: string } | null }[]).map((e) => ({
    slug: e.slug,
    title: e.title,
    programSlug: e.programs?.slug ?? null,
  }));
}
