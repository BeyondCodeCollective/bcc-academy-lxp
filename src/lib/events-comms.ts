import { createServiceClient } from "@/lib/supabase/server";
import { sendEventReminderEmail, sendEventSurveyEmail } from "@/lib/email";
import { EVENT_COLUMNS, type EventRow } from "@/lib/events";

// Run-day comms (phase 3), driven by the daily /api/cron/events-comms:
//  - reminder the day before, to every family with a seated attendee
//  - survey invite after the event ends, to every family that had a seat
// Each is sent once per registration (reminder_sent_at / survey_sent_at).

type EventWithProgram = EventRow & { programs: { name: string } | null };

type RegRow = {
  id: string;
  parent_first_name: string;
  parent_email: string;
  survey_token: string;
  event_attendees: { first_name: string; last_name: string; status: string; cancel_token: string }[];
};

const SEATED = ["confirmed", "attended"];

/** YYYY-MM-DD of an instant in a zone. */
function localDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

async function familiesFor(eventId: string, unsentColumn: "reminder_sent_at" | "survey_sent_at"): Promise<RegRow[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("event_registrations")
    .select("id, parent_first_name, parent_email, survey_token, event_attendees(first_name, last_name, status, cancel_token)")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .is(unsentColumn, null);
  return ((data ?? []) as unknown as RegRow[])
    .map((r) => ({ ...r, event_attendees: r.event_attendees.filter((a) => SEATED.includes(a.status)) }))
    .filter((r) => r.event_attendees.length > 0);
}

export async function sendDueReminders(origin: string, now = new Date()): Promise<number> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("events")
    .select(`${EVENT_COLUMNS}, programs(name)`)
    .eq("status", "open")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", new Date(now.getTime() + 48 * 3_600_000).toISOString());
  let sent = 0;
  for (const event of (data ?? []) as unknown as EventWithProgram[]) {
    const tomorrow = localDate(new Date(now.getTime() + 24 * 3_600_000), event.timezone);
    if (localDate(new Date(event.starts_at), event.timezone) !== tomorrow) continue;
    for (const reg of await familiesFor(event.id, "reminder_sent_at")) {
      try {
        await sendEventReminderEmail({
          to: reg.parent_email,
          parentFirstName: reg.parent_first_name,
          programName: event.programs?.name ?? "BCC Academy",
          eventTitle: event.title,
          eventStartUtc: event.starts_at,
          eventEndUtc: event.ends_at,
          eventTimezone: event.timezone,
          location: event.location,
          joinUrl: event.join_url,
          attendees: reg.event_attendees.map((a) => ({
            name: `${a.first_name} ${a.last_name}`,
            cancelUrl: `${origin}/events/cancel/${a.cancel_token}`,
          })),
        });
        await svc.from("event_registrations").update({ reminder_sent_at: now.toISOString() }).eq("id", reg.id);
        sent += 1;
      } catch (e) {
        console.error("[sendDueReminders] failed for registration", reg.id, e);
      }
    }
  }
  return sent;
}

export async function sendDueSurveys(origin: string, now = new Date()): Promise<number> {
  const svc = createServiceClient();
  // Events that started in the last 7 days; "ended" is ends_at, or start + 2h.
  const { data } = await svc
    .from("events")
    .select(`${EVENT_COLUMNS}, programs(name)`)
    .eq("status", "open")
    .gte("starts_at", new Date(now.getTime() - 7 * 24 * 3_600_000).toISOString())
    .lte("starts_at", now.toISOString());
  let sent = 0;
  for (const event of (data ?? []) as unknown as EventWithProgram[]) {
    const endedAt = event.ends_at ? Date.parse(event.ends_at) : Date.parse(event.starts_at) + 2 * 3_600_000;
    if (endedAt + 3_600_000 > now.getTime()) continue; // wait an hour after the end
    for (const reg of await familiesFor(event.id, "survey_sent_at")) {
      try {
        await sendEventSurveyEmail({
          to: reg.parent_email,
          parentFirstName: reg.parent_first_name,
          programName: event.programs?.name ?? "BCC Academy",
          eventTitle: event.title,
          surveyUrl: `${origin}/events/survey/${reg.survey_token}`,
        });
        await svc.from("event_registrations").update({ survey_sent_at: now.toISOString() }).eq("id", reg.id);
        sent += 1;
      } catch (e) {
        console.error("[sendDueSurveys] failed for registration", reg.id, e);
      }
    }
  }
  return sent;
}
