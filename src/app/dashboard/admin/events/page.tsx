import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
import { formatEventWhen, type EventRow } from "@/lib/events";
import { PageHeader } from "@/components/page-header";
import { DataTable, buttonClass } from "@/components/ui";
import { ManageMenu } from "../manage-menu";

export const dynamic = "force-dynamic";

// Events for the current program, with live attendee counts. Each row opens
// the roster. Scoped to the current program like every other admin surface.
export default async function AdminEventsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const programId = await getProgramId();
  const svc = createServiceClient();
  const [{ data: events }, { data: attendees }] = await Promise.all([
    svc
      .from("events")
      .select("id, slug, title, starts_at, ends_at, timezone, location, capacity, status")
      .eq("program_id", programId)
      .order("starts_at", { ascending: false })
      .limit(200),
    svc
      .from("event_attendees")
      .select("event_id, status, events!inner(program_id)")
      .eq("events.program_id", programId),
  ]);

  const counts = new Map<string, { seated: number; waiting: number }>();
  for (const a of (attendees ?? []) as { event_id: string; status: string }[]) {
    const c = counts.get(a.event_id) ?? { seated: 0, waiting: 0 };
    if (a.status === "confirmed" || a.status === "offered" || a.status === "attended") c.seated += 1;
    else if (a.status === "waitlisted") c.waiting += 1;
    counts.set(a.event_id, c);
  }
  const rows = (events ?? []) as Pick<
    EventRow,
    "id" | "slug" | "title" | "starts_at" | "ends_at" | "timezone" | "location" | "capacity" | "status"
  >[];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="Events"
        subtitle={`${rows.length} event${rows.length === 1 ? "" : "s"} · attendees registered without accounts`}
        noWrap
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/admin/events/new" className={buttonClass("primary", "sm")}>
              <Plus size={14} />
              New event
            </Link>
            <ManageMenu isMaster={canManageRoles(ctx.userEmail)} />
          </div>
        }
      />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-rule bg-paper-tint-soft px-4 py-8 text-center text-sm text-ink-soft">
          No events yet for this program. Create one and share its public link.
        </p>
      ) : (
        <DataTable columns={["Event", "When", { label: "Attendees", align: "right" }, "Status"]}>
          {rows.map((e) => {
            const c = counts.get(e.id) ?? { seated: 0, waiting: 0 };
            return (
              <tr key={e.id} className="text-ink">
                <td className="px-4 py-3 align-top">
                  <Link href={`/dashboard/admin/events/${e.id}`} className="font-medium text-ink hover:underline">
                    {e.title}
                  </Link>
                  {e.location && <div className="text-xs text-ink-soft">{e.location}</div>}
                </td>
                <td className="px-4 py-3 align-top text-sm text-ink-soft">
                  {formatEventWhen(e.starts_at, e.ends_at, e.timezone)}
                </td>
                <td className="px-4 py-3 align-top text-right tabular-nums">
                  {c.seated}
                  {e.capacity ? <span className="text-ink-soft"> / {e.capacity}</span> : null}
                  {c.waiting > 0 && <div className="text-xs text-ink-soft">{c.waiting} waitlisted</div>}
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="inline-flex items-center rounded-full bg-paper-tint px-2 py-0.5 text-micro font-semibold text-ink-soft">
                    {e.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
