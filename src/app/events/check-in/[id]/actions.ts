"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { checkinWindowState, verifyEventCheckinKey } from "@/lib/event-checkin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CheckInPerson = { id: string; label: string; checkedIn: boolean };
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

// Seated attendees on the registrations made with this email. Labels are first
// name plus last initial so a guessed email reveals little.
type Person = { id: string; first_name: string; last_name: string; status: string };
type Seated =
  | { error: string }
  | { error?: undefined; svc: ReturnType<typeof createServiceClient>; people: Person[] };

async function seatedFor(eventId: string, key: string, email: string): Promise<Seated> {
  if (!UUID_RE.test(eventId) || !verifyEventCheckinKey(eventId, key)) {
    return { error: "This check-in link is not valid." };
  }
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) return { error: "Enter the email you registered with." };
  const svc = createServiceClient();
  const { data: event } = await svc
    .from("events")
    .select("starts_at, ends_at")
    .eq("id", eventId)
    .maybeSingle<{ starts_at: string; ends_at: string | null }>();
  if (!event) return { error: "This check-in link is not valid." };
  const state = checkinWindowState(event);
  if (state !== "open") {
    return {
      error: state === "early" ? "Check-in is not open yet." : "Check-in has closed. Please see a team member.",
    };
  }
  const { data: regs } = await svc
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .ilike("parent_email", normalized.replace(/[\\%_]/g, "\\$&"));
  const regIds = (regs ?? []).map((r) => r.id as string);
  if (regIds.length === 0) {
    return { error: "We could not find that email. Please see a team member." };
  }
  const { data: rows } = await svc
    .from("event_attendees")
    .select("id, first_name, last_name, status")
    .eq("event_id", eventId)
    .in("registration_id", regIds)
    .in("status", ["confirmed", "attended"])
    .order("first_name", { ascending: true });
  const people = (rows ?? []) as Person[];
  if (people.length === 0) {
    return { error: "We could not find a seat for that email. Please see a team member." };
  }
  return { svc, people };
}

export async function findSeats(eventId: string, key: string, email: string): Promise<Result<{ people: CheckInPerson[] }>> {
  const r = await seatedFor(eventId, key, email);
  if (r.error !== undefined) return { ok: false, error: r.error };
  return {
    ok: true,
    people: r.people.map((p) => ({
      id: p.id,
      label: `${p.first_name} ${p.last_name.trim().charAt(0)}.`.trim(),
      checkedIn: p.status === "attended",
    })),
  };
}

export async function selfCheckIn(
  eventId: string,
  key: string,
  email: string,
  attendeeIds: string[],
): Promise<Result<{ count: number }>> {
  const r = await seatedFor(eventId, key, email);
  if (r.error !== undefined) return { ok: false, error: r.error };
  const ids = r.people.filter((p) => p.status === "confirmed" && attendeeIds.includes(p.id)).map((p) => p.id);
  if (ids.length === 0) return { ok: true, count: 0 };
  const { error } = await r.svc
    .from("event_attendees")
    .update({ status: "attended", checked_in_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "confirmed");
  if (error) {
    console.error("[selfCheckIn] update failed:", error);
    return { ok: false, error: "Could not check you in. Please see a team member." };
  }
  return { ok: true, count: ids.length };
}
