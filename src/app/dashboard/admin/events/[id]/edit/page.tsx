import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
import { EVENT_COLUMNS, type EventRow } from "@/lib/events";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../../manage-menu";
import { NewEventForm } from "../../new/new-event-form";
import type { NewEventInput } from "../../new/actions";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** UTC instant → local YYYY-MM-DD and HH:MM in the event's zone, for the form. */
function localParts(iso: string, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
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

  const start = localParts(event.starts_at, event.timezone);
  const end = event.ends_at ? localParts(event.ends_at, event.timezone) : null;
  const initial: NewEventInput = {
    title: event.title,
    slug: event.slug,
    description: event.description ?? "",
    date: start.date,
    startTime: start.time,
    endTime: end?.time ?? "",
    timezone: event.timezone,
    location: event.location ?? "",
    joinUrl: event.join_url ?? "",
    capacity: event.capacity == null ? "" : String(event.capacity),
    maxAttendees: String(event.max_attendees_per_registration),
    waitlistEnabled: event.waitlist_enabled,
    status: event.status,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="Edit event"
        subtitle={event.title}
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />
      <NewEventForm eventId={event.id} initial={initial} />
    </div>
  );
}
