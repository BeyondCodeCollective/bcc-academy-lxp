"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEventRegistrationEmail } from "@/lib/email";
import { EVENT_COLUMNS, type EventRow } from "@/lib/events";

// Confirms an offered waitlist seat by its confirm token. POST behind a
// button, same reason as cancel: link scanners must not confirm a seat.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  status: string;
  offer_expires_at: string | null;
  ticket_code: string;
  cancel_token: string;
  event_registrations: { parent_first_name: string; parent_email: string } | null;
};

export async function confirmSeat(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID_RE.test(token)) return { ok: false, error: "This confirm link is not valid." };
  const svc = createServiceClient();
  const { data } = await svc
    .from("event_attendees")
    .select("id, event_id, first_name, last_name, status, offer_expires_at, ticket_code, cancel_token, event_registrations(parent_first_name, parent_email)")
    .eq("confirm_token", token)
    .maybeSingle();
  const a = data as unknown as Row | null;
  if (!a) return { ok: false, error: "This confirm link is not valid." };
  if (a.status === "confirmed") return { ok: true };
  if (a.status !== "offered" || (a.offer_expires_at && Date.parse(a.offer_expires_at) < Date.now())) {
    return { ok: false, error: "This offer has expired. The seat went to the next family on the waitlist." };
  }

  const { error } = await svc
    .from("event_attendees")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", a.id)
    .eq("status", "offered");
  if (error) {
    console.error("[confirmSeat] update failed:", error);
    return { ok: false, error: "Could not confirm this seat. Please try again." };
  }

  const { data: event } = await svc
    .from("events")
    .select(`${EVENT_COLUMNS}, programs(name)`)
    .eq("id", a.event_id)
    .maybeSingle<EventRow & { programs: { name: string } | null }>();
  const hdrs = await headers();
  const origin = `${hdrs.get("x-forwarded-proto") ?? "https"}://${hdrs.get("host") ?? "bccacademy.io"}`;
  if (event && a.event_registrations) {
    const reg = a.event_registrations;
    after(async () => {
      try {
        await sendEventRegistrationEmail({
          to: reg.parent_email,
          parentFirstName: reg.parent_first_name,
          programName: event.programs?.name ?? "BCC Academy",
          eventTitle: event.title,
          eventStartUtc: event.starts_at,
          eventEndUtc: event.ends_at,
          eventTimezone: event.timezone,
          location: event.location,
          joinUrl: event.join_url,
          attendees: [
            {
              name: `${a.first_name} ${a.last_name}`,
              ticketCode: a.ticket_code,
              cancelUrl: `${origin}/events/cancel/${a.cancel_token}`,
            },
          ],
          origin,
        });
      } catch (e) {
        console.error("[confirmSeat] confirmation email failed:", e);
      }
    });
  }
  return { ok: true };
}
