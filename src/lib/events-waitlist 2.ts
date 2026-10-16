import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEventSeatOfferEmail } from "@/lib/email";
import { EVENT_COLUMNS, type EventRow } from "@/lib/events";

// Capacity and waitlist (phase 2). A seat is held by confirmed, offered, and
// attended attendees. When a seat opens, the oldest waitlisted attendee is
// offered it and has `offer_window_hours` to confirm via their confirm link.

export const SEAT_HOLDING = ["confirmed", "offered", "attended"] as const;

export async function seatsTaken(eventId: string): Promise<number> {
  const svc = createServiceClient();
  const { count } = await svc
    .from("event_attendees")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", [...SEAT_HOLDING]);
  return count ?? 0;
}

type OfferRow = {
  id: string;
  first_name: string;
  last_name: string;
  registration_id: string;
  event_registrations: { parent_first_name: string; parent_email: string } | null;
};

/**
 * Expire stale offers, then fill every open seat from the waitlist in order.
 * One email per family listing the attendees offered. Safe to call often.
 */
export async function promoteWaitlist(eventId: string, origin: string): Promise<number> {
  const svc = createServiceClient();
  const { data: event } = await svc
    .from("events")
    .select(`${EVENT_COLUMNS}, waitlist_enabled, offer_window_hours, programs(name)`)
    .eq("id", eventId)
    .maybeSingle<EventRow & { waitlist_enabled: boolean; offer_window_hours: number; programs: { name: string } | null }>();
  if (!event || !event.waitlist_enabled || event.capacity == null) return 0;

  const now = new Date();
  await svc
    .from("event_attendees")
    .update({ status: "expired" })
    .eq("event_id", eventId)
    .eq("status", "offered")
    .lt("offer_expires_at", now.toISOString());

  const open = event.capacity - (await seatsTaken(eventId));
  if (open <= 0) return 0;

  const { data: queue } = await svc
    .from("event_attendees")
    .select("id, first_name, last_name, registration_id, event_registrations(parent_first_name, parent_email)")
    .eq("event_id", eventId)
    .eq("status", "waitlisted")
    .order("created_at", { ascending: true })
    .limit(open);
  const offers = (queue ?? []) as unknown as OfferRow[];
  if (offers.length === 0) return 0;

  const expiresAt = new Date(now.getTime() + event.offer_window_hours * 3_600_000).toISOString();
  const byFamily = new Map<string, { parentFirstName: string; email: string; attendees: { name: string; confirmUrl: string }[] }>();
  for (const a of offers) {
    const token = randomUUID();
    const { error } = await svc
      .from("event_attendees")
      .update({ status: "offered", offered_at: now.toISOString(), offer_expires_at: expiresAt, confirm_token: token })
      .eq("id", a.id)
      .eq("status", "waitlisted");
    if (error || !a.event_registrations) continue;
    const fam = byFamily.get(a.registration_id) ?? {
      parentFirstName: a.event_registrations.parent_first_name,
      email: a.event_registrations.parent_email,
      attendees: [],
    };
    fam.attendees.push({ name: `${a.first_name} ${a.last_name}`, confirmUrl: `${origin}/events/confirm/${token}` });
    byFamily.set(a.registration_id, fam);
  }

  for (const fam of byFamily.values()) {
    try {
      await sendEventSeatOfferEmail({
        to: fam.email,
        parentFirstName: fam.parentFirstName,
        programName: event.programs?.name ?? "BCC Academy",
        eventTitle: event.title,
        eventStartUtc: event.starts_at,
        eventTimezone: event.timezone,
        expiresAtUtc: expiresAt,
        attendees: fam.attendees,
      });
    } catch (e) {
      console.error("[promoteWaitlist] offer email failed:", e);
    }
  }
  return offers.length;
}
