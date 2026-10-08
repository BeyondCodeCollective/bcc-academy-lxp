import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
import { EVENT_COLUMNS, formatEventWhen, type EventRow } from "@/lib/events";
import { CheckInList, type CheckInRow } from "./check-in-list";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  checked_in_at: string | null;
  allergies: string | null;
  event_registrations: { parent_first_name: string; parent_last_name: string; parent_phone: string | null } | null;
};

// Door roster for staff on a phone: seated attendees only, one tap to mark
// attended. Waitlisted and cancelled attendees never appear here.
export default async function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const programId = await getProgramId();
  const svc = createServiceClient();
  const { data: event } = await svc
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .eq("program_id", programId)
    .maybeSingle<EventRow>();
  if (!event) notFound();

  const { data } = await svc
    .from("event_attendees")
    .select(
      "id, first_name, last_name, status, checked_in_at, allergies, event_registrations(parent_first_name, parent_last_name, parent_phone)",
    )
    .eq("event_id", event.id)
    .in("status", ["confirmed", "attended"])
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });
  const rows: CheckInRow[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
    parent: r.event_registrations
      ? `${r.event_registrations.parent_first_name} ${r.event_registrations.parent_last_name}`
      : "",
    phone: r.event_registrations?.parent_phone ?? null,
    allergies: r.allergies,
    checkedInAt: r.checked_in_at,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-6 space-y-4">
      <div>
        <Link href={`/dashboard/admin/events/${event.id}`} className="text-sm text-ink-soft hover:text-ink hover:underline">
          Roster
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">{event.title}</h1>
        <p className="mt-1 text-sm text-ink-soft">{formatEventWhen(event.starts_at, event.ends_at, event.timezone)}</p>
      </div>
      <CheckInList initialRows={rows} />
    </div>
  );
}
