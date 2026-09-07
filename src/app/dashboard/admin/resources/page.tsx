import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel, canManageRoles } from "@/lib/roles";
import { getProgram } from "@/lib/programs/server";
import { fetchResourcesForProgram } from "@/lib/resources";
import { PageHeader } from "@/components/page-header";
import { ResourcesEditor } from "./resources-editor";
import { ManageMenu } from "../manage-menu";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/dashboard");
  }

  const program = await getProgram();
  const resources = await fetchResourcesForProgram(program.slug);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="Resources"
        subtitle={`Manage the resources learners see on the ${program.name} Resources page.`}
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />
      <ResourcesEditor
        programSlug={program.slug}
        programName={program.name}
        courses={program.tracks.map((t) => ({ slug: t.slug, name: t.name }))}
        initial={resources.map((r) => ({
          title: r.title,
          description: r.description ?? "",
          url: r.url ?? "",
          category: r.category ?? "",
          icon: r.icon ?? "",
          trackSlug: r.track_slug ?? "",
        }))}
      />
    </div>
  );
}
