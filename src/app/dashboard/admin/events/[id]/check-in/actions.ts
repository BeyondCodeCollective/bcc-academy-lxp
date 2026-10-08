"use server";

import { revalidatePath } from "next/cache";
import { requireManager } from "@/app/dashboard/admin/actions-shared";
import { getProgramId } from "@/lib/programs/server";

// Door check-in: flips a seated attendee between confirmed and attended and
// records who did it. Scoped to the current program like every admin action.
export async function setAttended(
  attendeeId: string,
  attended: boolean,
): Promise<{ ok: true; checkedInAt: string | null } | { ok: false; error: string }> {
  const { svc, userId } = await requireManager();
  const programId = await getProgramId();
  const { data } = await svc
    .from("event_attendees")
    .select("id, event_id, status, events!inner(program_id)")
    .eq("id", attendeeId)
    .eq("events.program_id", programId)
    .maybeSingle();
  const a = data as unknown as { id: string; event_id: string; status: string } | null;
  if (!a) return { ok: false, error: "Attendee not found." };
  if (a.status !== "confirmed" && a.status !== "attended") {
    return { ok: false, error: "Only confirmed attendees can be checked in." };
  }

  const checkedInAt = attended ? new Date().toISOString() : null;
  const { error } = await svc
    .from("event_attendees")
    .update({
      status: attended ? "attended" : "confirmed",
      checked_in_at: checkedInAt,
      checked_in_by: attended ? userId : null,
    })
    .eq("id", a.id);
  if (error) {
    console.error("[setAttended] update failed:", error);
    return { ok: false, error: "Could not save. Try again." };
  }
  revalidatePath(`/dashboard/admin/events/${a.event_id}`);
  revalidatePath(`/dashboard/admin/events/${a.event_id}/check-in`);
  return { ok: true, checkedInAt };
}
