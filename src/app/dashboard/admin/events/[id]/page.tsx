import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardCheck, Download } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
import { ATTENDEE_STATUS_LABEL, EVENT_COLUMNS, formatEventWhen, type EventRow } from "@/lib/events";
import { PageHeader } from "@/components/page-header";
import { DataTable, buttonClass } from "@/components/ui";
import { ManageMenu } from "../../manage-menu";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

type AttendeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  tshirt_size: string | null;
  allergies: string | null;
  ticket_code: string;
  status: string;
  created_at: string;
  event_registrations: {
    parent_first_name: string;
    parent_last_name: string;
    parent_email: string;
    parent_phone: string | null;
  } | null;
};

// Roster for one event: one row per attendee with the parent's contact
// beside it. The CSV carries every field; the screen carries what staff need
// at the door.
export default async function EventRosterPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: attendees } = await svc
    .from("event_attendees")
    .select(
      "id, first_name, last_name, grade, tshirt_size, allergies, ticket_code, status, created_at, event_registrations(parent_first_name, parent_last_name, parent_email, parent_phone)",
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: true });
  // registration_id is many-to-one, so PostgREST returns one object here, not an array.
  const rows = (attendees ?? []) as unknown as AttendeeRow[];
  const active = rows.filter((r) => ["confirmed", "offered", "attended"].includes(r.status)).length;
  const waiting = rows.filter((r) => r.status === "waitlisted").length;
  const families = new Set(rows.map((r) => r.event_registrations?.parent_email)).size;
  const attended = rows.filter((r) => r.status === "attended").length;

  const { data: surveyRows } = await svc.from("event_survey_responses").select("rating").eq("event_id", event.id);
  const ratings = (surveyRows ?? []).map((r) => r.rating as number);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title={event.title}
        subtitle={`${formatEventWhen(event.starts_at, event.ends_at, event.timezone)} · ${active}${event.capacity ? ` of ${event.capacity}` : ""} seated${waiting ? `, ${waiting} waitlisted` : ""} · ${families} famil${families === 1 ? "y" : "ies"}`}
        noWrap
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/admin/events/${event.id}/check-in`} className={buttonClass("primary", "sm")}>
              <ClipboardCheck size={14} />
              Check in
            </Link>
            <a href={`/api/events/${event.id}/csv`} className={buttonClass("secondary", "sm")}>
              <Download size={14} />
              Export CSV
            </a>
            <ManageMenu isMaster={canManageRoles(ctx.userEmail)} />
          </div>
        }
      />
      <p className="text-sm">
        <Link href="/dashboard/admin/events" className="text-ink-soft hover:text-ink hover:underline">
          All events
        </Link>
        <span className="text-ink-faint"> · </span>
        <span className="text-ink-soft">
          Public link: <span className="font-mono text-xs">/events/{event.slug}/register</span>
        </span>
        {attended > 0 && (
          <>
            <span className="text-ink-faint"> · </span>
            <span className="text-ink-soft">{attended} checked in</span>
          </>
        )}
        {ratings.length > 0 && (
          <>
            <span className="text-ink-faint"> · </span>
            <span className="text-ink-soft">
              Survey: {ratings.length} response{ratings.length === 1 ? "" : "s"}, avg {avgRating} of 5
            </span>
            <span className="text-ink-faint"> · </span>
            <a href={`/api/events/${event.id}/survey-csv`} className="text-ink-soft underline hover:text-ink">
              Export survey
            </a>
          </>
        )}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-rule bg-paper-tint-soft px-4 py-8 text-center text-sm text-ink-soft">
          No one has registered yet.
        </p>
      ) : (
        <DataTable columns={["Attendee", "Parent / guardian", "Grade", "Shirt", "Ticket", "Status"]}>
          {rows.map((r) => {
            const p = r.event_registrations;
            const cancelled = r.status === "cancelled";
            return (
              <tr key={r.id} className={cancelled ? "text-ink-faint line-through" : "text-ink"}>
                <td className="px-4 py-3 align-top">
                  <span className="font-medium">
                    {r.first_name} {r.last_name}
                  </span>
                  {r.allergies && !cancelled && (
                    <div className="text-xs text-ink-soft no-underline">Allergies: {r.allergies}</div>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-sm">
                  {p ? (
                    <>
                      <div>
                        {p.parent_first_name} {p.parent_last_name}
                      </div>
                      <div className="text-xs text-ink-soft">{p.parent_email}</div>
                      {p.parent_phone && <div className="text-xs text-ink-soft">{p.parent_phone}</div>}
                    </>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top text-sm">{r.grade ?? ""}</td>
                <td className="px-4 py-3 align-top text-sm">{r.tshirt_size ?? ""}</td>
                <td className="px-4 py-3 align-top font-mono text-xs tracking-wider">{r.ticket_code}</td>
                <td className="px-4 py-3 align-top text-xs text-ink-soft">
                  {r.status === "confirmed" ? fmt(r.created_at) : ATTENDEE_STATUS_LABEL[r.status] ?? r.status}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
