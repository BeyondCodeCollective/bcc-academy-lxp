import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canSwitchPrograms, canManageRoles } from "@/lib/roles";
import { NewCourseTabs } from "./new-course-tabs";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../manage-menu";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { MARKETING_SLUG } from "@/lib/programs/marketing";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string }>;
}) {
  const { program: programSlug } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  const role = ctx.student?.role ?? "";
  if (!canManageStudents(role)) redirect("/dashboard/admin");

  // ?program= arrives from the Organizations screen. Only admin-created orgs
  // (is_dynamic) need threading through: the built-in programs are already in
  // the form's own list.
  let extraProgram: { slug: string; name: string } | undefined;
  if (programSlug && canSwitchPrograms(role)) {
    const { data } = await createServiceClient()
      .from("programs")
      .select("slug, name")
      .eq("slug", programSlug)
      .eq("is_dynamic", true)
      .maybeSingle();
    if (data) extraProgram = { slug: data.slug as string, name: data.name as string };
  }

  // The program the admin is currently standing in (domain/switcher cookie).
  // The forms scope their program picker to it; the marketing shell has no
  // courses, so it passes nothing and the forms fall back to the hub list.
  const current = await getProgram();
  const currentProgram =
    current.slug === MARKETING_SLUG
      ? undefined
      : { slug: current.slug, name: current.name };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-12">
      <div>
        <PageHeader title="New Course" subtitle="Takes about 30 seconds." actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />} />
      </div>
      <NewCourseTabs
        canCreateManually={canSwitchPrograms(role)}
        extraProgram={extraProgram}
        currentProgram={currentProgram}
      />
    </div>
  );
}
