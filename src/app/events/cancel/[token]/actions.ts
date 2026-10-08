"use server";

import { createServiceClient } from "@/lib/supabase/server";

// Cancels one attendee's ticket by its cancel token. A POST behind a button,
// never a GET side effect: mail scanners (Outlook Safe Links) prefetch links.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function cancelAttendee(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID_RE.test(token)) return { ok: false, error: "This cancel link is not valid." };
  const svc = createServiceClient();
  const { data: attendee } = await svc
    .from("event_attendees")
    .select("id, registration_id, status")
    .eq("cancel_token", token)
    .maybeSingle<{ id: string; registration_id: string; status: string }>();
  if (!attendee) return { ok: false, error: "This cancel link is not valid." };
  if (attendee.status === "cancelled") return { ok: true };

  const now = new Date().toISOString();
  const { error } = await svc
    .from("event_attendees")
    .update({ status: "cancelled", cancelled_at: now })
    .eq("id", attendee.id);
  if (error) {
    console.error("[cancelAttendee] update failed:", error);
    return { ok: false, error: "Could not cancel this ticket. Please try again." };
  }

  // When the last ticket on a registration is cancelled, the registration is too.
  const { count } = await svc
    .from("event_attendees")
    .select("id", { count: "exact", head: true })
    .eq("registration_id", attendee.registration_id)
    .neq("status", "cancelled");
  if ((count ?? 0) === 0) {
    await svc
      .from("event_registrations")
      .update({ status: "cancelled", cancelled_at: now })
      .eq("id", attendee.registration_id);
  }
  return { ok: true };
}
