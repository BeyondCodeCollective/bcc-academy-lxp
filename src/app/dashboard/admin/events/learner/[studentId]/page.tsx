import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
import { ATTENDEE_STATUS_LABEL, formatEventWhen } from "@/lib/events";
import { eventHistoryForStudent } from "@/lib/events-bridge";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui";
import { ManageMenu } from "../../../manage-menu";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

// A learner's event history: every workshop they were registered for as a
// child on a parent's registration, or that they registered as the parent.
export default async function LearnerEventsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const { studentId } = await params;
  if (!UUID_RE.test(studentId)) notFound();
  const programId = await getProgramId();
  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("id, first_name, last_name, email")
    .eq("id", studentId)
    .eq("program_id", programId)
    .maybeSingle<{ id: string; first_name: string | null; last_name: string | null; email: string | null }>();
  if (!student) notFound();

  const history = await eventHistoryForStudent(student.id);
  const name = `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || student.email || "Learner";
  const attended = history.filter((h) => h.status === "attended").length;
  const eventCount = new Set(history.map((h) => h.eventId)).size;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title={name}
        subtitle={`${eventCount} event${eventCount === 1 ? "" : "s"} on record · ${history.length} ticket${history.length === 1 ? "" : "s"} · ${attended} attended`}
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />
      <p className="text-sm">
        <Link href="/dashboard/admin/events" className="text-ink-soft hover:text-ink hover:underline">
          All events
        </Link>
        {student.email && (
          <>
            <span className="text-ink-faint"> · </span>
            <span className="text-ink-soft">{student.email}</span>
          </>
        )}
      </p>

      {history.length === 0 ? (
        <p className="rounded-lg border border-rule bg-paper-tint-soft px-4 py-8 text-center text-sm text-ink-soft">
          No events on record. Attendees link to learners by parent email plus matching name.
        </p>
      ) : (
        <DataTable columns={["Event", "When", "Attendee", "Status"]}>
          {history.map((h, i) => (
            <tr key={`${h.eventId}-${i}`} className="text-ink">
              <td className="px-4 py-3 align-top">
                <Link href={`/dashboard/admin/events/${h.eventId}`} className="font-medium hover:underline">
                  {h.title}
                </Link>
              </td>
              <td className="px-4 py-3 align-top text-sm text-ink-soft">{formatEventWhen(h.startsAt, null, h.timezone)}</td>
              <td className="px-4 py-3 align-top text-sm">{h.attendeeName}</td>
              <td className="px-4 py-3 align-top text-sm">{ATTENDEE_STATUS_LABEL[h.status] ?? h.status}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
