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

// A row returned by the offer_waitlist_seats database function.
type OfferRow = {
  attendee_id: string;
  registration_id: string;
  first_name: string;
  last_name: string;
  confirm_token: string;
  offer_expires_at: string;
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

  // Expiring stale offers and claiming the open seats is one locked database
  // step, so overlapping runs (the cron and a cancellation) can't offer the
  // same seat twice.
  const { data: claimed } = await svc.rpc("offer_waitlist_seats", { p_event_id: eventId });
  const offers = (claimed ?? []) as OfferRow[];
  if (offers.length === 0) return 0;

  const { data: regs } = await svc
    .from("event_registrations")
    .select("id, parent_first_name, parent_email")
    .in("id", [...new Set(offers.map((o) => o.registration_id))]);
  const regById = new Map((regs ?? []).map((r) => [r.id as string, r]));

  const expiresAt = offers[0].offer_expires_at;
  const byFamily = new Map<string, { parentFirstName: string; email: string; attendees: { name: string; confirmUrl: string }[] }>();
  for (const a of offers) {
    const reg = regById.get(a.registration_id);
    if (!reg) continue;
    const fam = byFamily.get(a.registration_id) ?? {
      parentFirstName: reg.parent_first_name as string,
      email: reg.parent_email as string,
      attendees: [],
    };
    fam.attendees.push({ name: `${a.first_name} ${a.last_name}`, confirmUrl: `${origin}/events/confirm/${a.confirm_token}` });
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
