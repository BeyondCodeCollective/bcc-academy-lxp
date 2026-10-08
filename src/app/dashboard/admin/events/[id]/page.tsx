import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
import { EVENT_COLUMNS, formatEventWhen, type EventRow } from "@/lib/events";
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
  const active = rows.filter((r) => r.status !== "cancelled").length;
  const families = new Set(rows.map((r) => r.event_registrations?.parent_email)).size;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title={event.title}
        subtitle={`${formatEventWhen(event.starts_at, event.ends_at, event.timezone)} · ${active} attendee${active === 1 ? "" : "s"} from ${families} famil${families === 1 ? "y" : "ies"}`}
        noWrap
        actions={
          <div className="flex items-center gap-2">
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
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-rule bg-paper-tint-soft px-4 py-8 text-center text-sm text-ink-soft">
          No one has registered yet.
        </p>
      ) : (
        <DataTable columns={["Attendee", "Parent / guardian", "Grade", "Shirt", "Ticket", "Registered"]}>
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
                  {cancelled ? "Cancelled" : fmt(r.created_at)}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
