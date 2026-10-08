import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../../manage-menu";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function ImportRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const programId = await getProgramId();
  const svc = createServiceClient();
  const { data: event } = await svc
    .from("events")
    .select("id, title")
    .eq("id", id)
    .eq("program_id", programId)
    .maybeSingle<{ id: string; title: string }>();
  if (!event) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="Import registrations"
        subtitle={event.title}
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />
      <p className="text-sm text-ink-soft">
        Paste a Hivebrite registration export or this platform&apos;s roster CSV. One attendee per row; rows with the
        same email become one family. Imported families get no emails. Back to the{" "}
        <Link href={`/dashboard/admin/events/${event.id}`} className="text-ink underline">
          roster
        </Link>
        .
      </p>
      <ImportForm eventId={event.id} />
    </div>
  );
}
