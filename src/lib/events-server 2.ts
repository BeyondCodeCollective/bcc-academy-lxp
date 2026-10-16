import { createServiceClient } from "@/lib/supabase/server";
import { EVENT_COLUMNS, type EventRow } from "@/lib/events";

export async function getEventBySlug(programId: string, slug: string): Promise<EventRow | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("program_id", programId)
    .eq("slug", slug)
    .maybeSingle<EventRow>();
  return data ?? null;
}
