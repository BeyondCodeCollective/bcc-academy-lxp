import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../manage-menu";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { requireManager, allowedProgramIdsForActor } from "../../actions-shared";
import { NewEventForm } from "./new-event-form";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const actor = await requireManager();
  const allowedIds = allowedProgramIdsForActor(actor);
  let query = createServiceClient().from("programs").select("slug, name").order("name");
  if (allowedIds !== null) query = query.in("id", allowedIds);
  const { data } = await query;
  const programs = (data ?? []) as { slug: string; name: string }[];
  const current = (await getProgram()).slug;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="New event"
        subtitle="Parents register attendees at /events/<slug>/register. No accounts are created."
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />
      <NewEventForm programs={programs} defaultProgramSlug={programs.some((p) => p.slug === current) ? current : (programs[0]?.slug ?? "")} />
    </div>
  );
}
