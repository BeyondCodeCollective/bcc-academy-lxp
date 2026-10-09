"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendEventRegistrationEmail, sendEventWaitlistEmail } from "@/lib/email";
import { seatsTaken } from "@/lib/events-waitlist";
import { linkEventHistory } from "@/lib/events-bridge";
import {
  ATTENDEE_FIELDS,
  ATTENDEE_SELECTS,
  type AttendeeInput,
  type AttendeeSelectField,
} from "@/lib/events";
import { currentProgramIdOrNull, getEventBySlug } from "@/lib/events-server";

// Public (unauthenticated) event registration. One parent/guardian block, up
// to the event's attendee limit. Writes event_registrations + event_attendees
// through the service client; never touches students.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ParentInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityState: string;
  zip: string;
};

export type RegisterResult =
  | { ok: true; waitlisted: boolean; attendees: { name: string; ticketCode: string }[] }
  | { ok: false; error: string };

export async function registerForEvent(input: {
  eventSlug: string;
  parent: ParentInput;
  attendees: AttendeeInput[];
}): Promise<RegisterResult> {
  const parent = {
    firstName: input.parent.firstName.trim(),
    lastName: input.parent.lastName.trim(),
    email: input.parent.email.trim().toLowerCase(),
    phone: input.parent.phone.trim(),
    cityState: input.parent.cityState.trim(),
    zip: input.parent.zip.trim(),
  };
  if (!parent.firstName || !parent.lastName) {
    return { ok: false, error: "Enter the parent or guardian's first and last name." };
  }
  if (!EMAIL_RE.test(parent.email)) return { ok: false, error: "Enter a valid email address." };

  const event = await getEventBySlug(input.eventSlug, await currentProgramIdOrNull());
  if (!event) return { ok: false, error: "This event could not be found." };
  if (event.status !== "open") return { ok: false, error: "Registration for this event is closed." };

  const max = event.max_attendees_per_registration;
  if (input.attendees.length < 1) return { ok: false, error: "Add at least one attendee." };
  if (input.attendees.length > max) {
    return { ok: false, error: `You can register up to ${max} attendees at a time.` };
  }

  const attendees: AttendeeInput[] = [];
  for (const [i, raw] of input.attendees.entries()) {
    const a = Object.fromEntries(
      ATTENDEE_FIELDS.map((f) => [f, String(raw[f] ?? "").trim().slice(0, 200)]),
    ) as AttendeeInput;
    const n = i + 1;
    if (!a.first_name || !a.last_name) {
      return { ok: false, error: `Attendee ${n}: enter a first and last name.` };
    }
    if (!DOB_RE.test(a.date_of_birth) || Number.isNaN(Date.parse(a.date_of_birth))) {
      return { ok: false, error: `Attendee ${n}: enter a date of birth.` };
    }
    for (const field of Object.keys(ATTENDEE_SELECTS) as AttendeeSelectField[]) {
      const allowed: readonly string[] = ATTENDEE_SELECTS[field];
      if (a[field] && !allowed.includes(a[field])) {
        return { ok: false, error: `Attendee ${n}: pick an option from the list.` };
      }
    }
    attendees.push(a);
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
  const rl = rateLimit({ key: ip, scope: "event-register", max: 10, windowMs: 10 * 60_000 });
  if (!rl.ok) return { ok: false, error: "Too many registrations from this network. Try again in a few minutes." };

  // Capacity is per attendee. A family that does not fully fit is waitlisted
  // together rather than split across confirmed and waitlisted.
  let waitlisted = false;
  if (event.capacity != null) {
    const open = event.capacity - (await seatsTaken(event.id));
    if (attendees.length > open) {
      if (!event.waitlist_enabled) {
        return { ok: false, error: open <= 0 ? "This event is full." : `Only ${open} spot${open === 1 ? "" : "s"} left.` };
      }
      waitlisted = true;
    }
  }

  const svc = createServiceClient();
  const { data: reg, error: regError } = await svc
    .from("event_registrations")
    .insert({
      event_id: event.id,
      program_id: event.program_id,
      parent_first_name: parent.firstName,
      parent_last_name: parent.lastName,
      parent_email: parent.email,
      parent_phone: parent.phone || null,
      city_state: parent.cityState || null,
      zip: parent.zip || null,
    })
    .select("id")
    .single<{ id: string }>();
  if (regError || !reg) {
    console.error("[registerForEvent] registration insert failed:", regError);
    return { ok: false, error: "Could not save your registration. Please try again." };
  }

  const { data: saved, error: attError } = await svc
    .from("event_attendees")
    .insert(
      attendees.map((a) => ({
        registration_id: reg.id,
        event_id: event.id,
        status: waitlisted ? "waitlisted" : "confirmed",
        first_name: a.first_name,
        last_name: a.last_name,
        date_of_birth: a.date_of_birth,
        grade: a.grade || null,
        school_name: a.school_name || null,
        school_type: a.school_type || null,
        gender: a.gender || null,
        race_ethnicity: a.race_ethnicity || null,
        tshirt_size: a.tshirt_size || null,
        allergies: a.allergies || null,
        emergency_contact_name: a.emergency_contact_name || null,
        emergency_contact_phone: a.emergency_contact_phone || null,
        experience_level: a.experience_level || null,
        eligibility: a.eligibility || null,
      })),
    )
    .select("first_name, last_name, ticket_code, cancel_token");
  if (attError || !saved) {
    console.error("[registerForEvent] attendee insert failed:", attError);
    await svc.from("event_registrations").delete().eq("id", reg.id);
    return { ok: false, error: "Could not save your attendees. Please try again." };
  }

  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${hdrs.get("host") ?? "bccacademy.io"}`;
  const result = saved.map((a) => ({
    name: `${a.first_name} ${a.last_name}`,
    ticketCode: a.ticket_code as string,
    cancelUrl: `${origin}/events/cancel/${a.cancel_token}`,
  }));

  after(async () => {
    // If this family already has learner accounts, attach the history now.
    try {
      await linkEventHistory(reg.id);
    } catch (e) {
      console.error("[registerForEvent] link pass failed:", e);
    }
    try {
      if (waitlisted) {
        await sendEventWaitlistEmail({
          to: parent.email,
          parentFirstName: parent.firstName,
          programName: event.programName,
          eventTitle: event.title,
          eventStartUtc: event.starts_at,
          eventTimezone: event.timezone,
          attendees: result,
        });
        return;
      }
      await sendEventRegistrationEmail({
        to: parent.email,
        parentFirstName: parent.firstName,
        programName: event.programName,
        eventTitle: event.title,
        eventStartUtc: event.starts_at,
        eventEndUtc: event.ends_at,
        eventTimezone: event.timezone,
        location: event.location,
        joinUrl: event.join_url,
        attendees: result,
        origin,
      });
    } catch (e) {
      console.error("[registerForEvent] confirmation email failed:", e);
    }
  });

  return { ok: true, waitlisted, attendees: result.map(({ name, ticketCode }) => ({ name, ticketCode })) };
}
