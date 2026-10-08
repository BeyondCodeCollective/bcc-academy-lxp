"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManager } from "@/app/dashboard/admin/actions-shared";
import { getProgramId } from "@/lib/programs/server";
import { EVENT_TIMEZONES } from "@/lib/events";

export type NewEventInput = {
  title: string;
  slug: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM or ""
  timezone: string;
  location: string;
  joinUrl: string;
  capacity: string; // "" = unlimited
  maxAttendees: string;
  waitlistEnabled: boolean;
  status: "draft" | "open";
};

/** Local wall clock in an IANA zone → UTC ISO. Two-pass offset estimate handles DST. */
function zonedToUtc(date: string, time: string, timeZone: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(ms));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - ms;
  };
  let utc = asUtc - offsetAt(asUtc);
  utc = asUtc - offsetAt(utc);
  return new Date(utc).toISOString();
}

export async function createEvent(input: NewEventInput): Promise<{ ok: false; error: string } | never> {
  const { svc } = await requireManager();
  const programId = await getProgramId();

  const title = input.title.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!title) return { ok: false, error: "Enter a title." };
  if (!/^[a-z0-9-]{3,64}$/.test(slug)) return { ok: false, error: "Slug: lowercase letters, numbers, and dashes only." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.startTime)) {
    return { ok: false, error: "Enter a date and start time." };
  }
  if (input.endTime && !/^\d{2}:\d{2}$/.test(input.endTime)) return { ok: false, error: "End time looks wrong." };
  if (!(EVENT_TIMEZONES as readonly string[]).includes(input.timezone)) return { ok: false, error: "Pick a timezone." };
  const capacity = input.capacity.trim() === "" ? null : Number(input.capacity);
  if (capacity != null && (!Number.isInteger(capacity) || capacity < 1)) return { ok: false, error: "Capacity must be a whole number." };
  const maxAttendees = Number(input.maxAttendees);
  if (!Number.isInteger(maxAttendees) || maxAttendees < 1 || maxAttendees > 10) {
    return { ok: false, error: "Attendees per registration must be between 1 and 10." };
  }

  const startsAt = zonedToUtc(input.date, input.startTime, input.timezone);
  const endsAt = input.endTime ? zonedToUtc(input.date, input.endTime, input.timezone) : null;
  if (endsAt && endsAt <= startsAt) return { ok: false, error: "End time must be after the start time." };

  const { data, error } = await svc
    .from("events")
    .insert({
      program_id: programId,
      slug,
      title,
      description: input.description.trim() || null,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: input.timezone,
      location: input.location.trim() || null,
      join_url: input.joinUrl.trim() || null,
      capacity,
      max_attendees_per_registration: maxAttendees,
      waitlist_enabled: input.waitlistEnabled,
      status: input.status,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, error: "An event with that slug already exists in this program." };
    console.error("[createEvent] insert failed:", error);
    return { ok: false, error: "Could not create the event." };
  }

  revalidatePath("/dashboard/admin/events");
  redirect(`/dashboard/admin/events/${data.id}`);
}
