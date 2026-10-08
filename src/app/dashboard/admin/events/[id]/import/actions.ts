"use server";

import { revalidatePath } from "next/cache";
import { requireManager } from "@/app/dashboard/admin/actions-shared";
import { getProgramId } from "@/lib/programs/server";
import { linkEventHistory } from "@/lib/events-bridge";
import { buildImportPlan, type Field, type ImportPreview } from "@/lib/events-import";

// Import a registration export (Hivebrite, or this platform's own roster CSV)
// into an existing event: one registration per parent email, one attendee per
// row. Historical imports never trigger emails: reminder_sent_at and
// survey_sent_at are stamped so the comms cron skips them.

export async function previewImport(eventId: string, csv: string): Promise<{ ok: true; preview: ImportPreview } | { ok: false; error: string }> {
  await requireManager();
  void eventId;
  const plan = buildImportPlan(csv);
  if (!plan.ok) return plan;
  const fams = [...plan.families.values()];
  const attendees = fams.reduce((n, f) => n + f.attendees.length, 0);
  const attended = fams.reduce((n, f) => n + f.attendees.filter((a) => a.attended).length, 0);
  const mapped: Partial<Record<Field, string>> = {};
  for (const [k, i] of Object.entries(plan.map)) mapped[k as Field] = plan.headers[i as number];
  return {
    ok: true,
    preview: { headers: plan.headers, mapped, rows: plan.rowCount, families: plan.families.size, attendees, attended, skipped: plan.skipped },
  };
}

export async function runImport(eventId: string, csv: string): Promise<{ ok: true; families: number; attendees: number } | { ok: false; error: string }> {
  const { svc } = await requireManager();
  const programId = await getProgramId();
  const { data: event } = await svc
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("program_id", programId)
    .maybeSingle<{ id: string }>();
  if (!event) return { ok: false, error: "Event not found." };

  const plan = buildImportPlan(csv);
  if (!plan.ok) return plan;

  // Families already on this event are reused, so re-running an import adds
  // only new attendees instead of duplicating registrations.
  const { data: existing } = await svc
    .from("event_registrations")
    .select("id, parent_email, event_attendees(first_name, last_name)")
    .eq("event_id", event.id);
  type Existing = { id: string; parent_email: string; event_attendees: { first_name: string; last_name: string }[] };
  const byEmail = new Map(((existing ?? []) as unknown as Existing[]).map((r) => [r.parent_email.toLowerCase(), r]));

  const now = new Date().toISOString();
  let familyCount = 0;
  let attendeeCount = 0;
  const regIds: string[] = [];
  for (const fam of plan.families.values()) {
    const email = fam.parent.parent_email as string;
    let regId = byEmail.get(email)?.id;
    const have = new Set((byEmail.get(email)?.event_attendees ?? []).map((a) => `${a.first_name} ${a.last_name}`.toLowerCase()));
    if (!regId) {
      const { data: reg, error } = await svc
        .from("event_registrations")
        .insert({ event_id: event.id, program_id: programId, ...fam.parent, reminder_sent_at: now, survey_sent_at: now })
        .select("id")
        .single<{ id: string }>();
      if (error || !reg) {
        console.error("[runImport] registration insert failed:", error);
        return { ok: false, error: `Import stopped at ${email}: could not save the registration.` };
      }
      regId = reg.id;
      familyCount += 1;
    }
    regIds.push(regId);
    const fresh = fam.attendees.filter((a) => !have.has(`${a.cols.first_name} ${a.cols.last_name}`.toLowerCase()));
    if (fresh.length === 0) continue;
    const { error } = await svc.from("event_attendees").insert(
      fresh.map((a) => ({
        registration_id: regId,
        event_id: event.id,
        status: a.attended ? "attended" : "confirmed",
        checked_in_at: a.attended ? now : null,
        ...a.cols,
      })),
    );
    if (error) {
      console.error("[runImport] attendee insert failed:", error);
      return { ok: false, error: `Import stopped at ${email}: could not save attendees.` };
    }
    attendeeCount += fresh.length;
  }

  for (const id of regIds) await linkEventHistory(id);
  revalidatePath(`/dashboard/admin/events/${event.id}`);
  revalidatePath("/dashboard/admin/events");
  return { ok: true, families: familyCount, attendees: attendeeCount };
}
