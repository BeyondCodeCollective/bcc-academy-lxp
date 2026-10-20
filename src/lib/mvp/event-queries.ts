import "server-only";
import type { createServiceClient } from "@/lib/supabase/server";
import { calculateMvpEvent, eventMatchesWindow, type MvpEventRecord, type MvpEventRegistration, type MvpEventAttendee } from "./event-summary";
import type { MvpFilters } from "./types";

// Internal loader: callers must pass only verified whole-program admin scope.
// Course grants do not authorize unrelated event tickets. No names, guardian
// contacts, tokens, health information, or raw demographic fields are read.
export async function loadMvpEvents(db: ReturnType<typeof createServiceClient>, programIds: string[], filters: MvpFilters, asOf: Date) {
  const rows: ReturnType<typeof calculateMvpEvent>[] = [];
  if (filters.courseSlug || filters.city || filters.learnerStatus !== "all") return { rows, excludedUndated: 0,
    unavailableReason: "Separate events are excluded when course, learner-location, or learner-status filters are applied; these filters describe LXP learner records." };
  if (!programIds.length) return { rows, excludedUndated: 0,
    unavailableReason: "No whole-program admin scope is available for separate events." };
  async function read<T extends { id: string }>(table: string, columns: string, scope: Record<string, string>): Promise<T[]> {
    const result: T[] = [];
    let cursor: string | null = null;
    while (true) {
      let query = db.from(table).select(columns).order("id").limit(500);
      for (const [key, value] of Object.entries(scope)) query = query.eq(key, value);
      if (cursor) query = query.gt("id", cursor);
      const { data, error } = await query;
      if (error || !Array.isArray(data)) throw new Error("Unable to load complete event evidence.");
      if (!data.length) return result;
      const page = data as unknown as T[];
      const next = page[page.length - 1].id;
      if (!next || (cursor && next <= cursor)) throw new Error("Event pagination did not advance.");
      result.push(...page); cursor = next;
    }
  }
  let excludedUndated = 0;
  for (const programId of new Set(programIds)) {
    const events = await read<MvpEventRecord>("events", "id, program_id, title, starts_at, ends_at, timezone, status, capacity", { program_id: programId });
    for (const event of events) {
      if (event.status === "draft") continue;
      const matches = eventMatchesWindow(event, { start: filters.startDate, end: filters.endDate });
      if (matches === null) excludedUndated++;
      if (matches !== true) continue;
      const registrations = await read<MvpEventRegistration>("event_registrations", "id, event_id, program_id, status", { program_id: programId, event_id: event.id });
      const attendees = await read<MvpEventAttendee>("event_attendees", "id, event_id, registration_id, status, checked_in_at", { event_id: event.id });
      rows.push(calculateMvpEvent(event, registrations, attendees, asOf));
    }
  }
  return { rows, excludedUndated, unavailableReason: excludedUndated ? "Some events lack a verified date interval for the selected window." : null };
}
