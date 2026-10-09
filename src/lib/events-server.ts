import { createServiceClient } from "@/lib/supabase/server";
import { EVENT_COLUMNS, type EventRow } from "@/lib/events";

export type EventWithProgram = EventRow & { programName: string };

/**
 * Find an event by slug. Prefers the current program, then any program: a
 * BGC registration link shared by email must work on the apex domain, where
 * the browsing context is marketing, not BGC.
 */
export async function getEventBySlug(slug: string, preferredProgramId: string): Promise<EventWithProgram | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("events")
    .select(`${EVENT_COLUMNS}, programs(name)`)
    .eq("slug", slug)
    .order("created_at", { ascending: true })
    .limit(10);
  const rows = (data ?? []) as unknown as (EventRow & { programs: { name: string } | null })[];
  const hit = rows.find((e) => e.program_id === preferredProgramId) ?? rows[0];
  if (!hit) return null;
  const { programs, ...event } = hit;
  return { ...event, programName: programs?.name ?? "BCC Academy" };
}
