import { redirect, notFound } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { getApplicationBySlug } from "@/lib/applications";
import { ManageMenu } from "../../../manage-menu";
import { requireManager, allowedProgramIdsForActor } from "../../../actions-shared";
import { ApplicationEditor } from "./application-editor";

export const dynamic = "force-dynamic";

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const { slug } = await params;
  const app = await getApplicationBySlug(slug);
  if (!app) notFound();
  // Same program scoping as the review page: another program's application 404s.
  const allowedIds = allowedProgramIdsForActor(await requireManager());
  if (allowedIds && (!app.programId || !allowedIds.includes(app.programId))) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title={`Edit ${app.title}`}
        subtitle={`Changes go live at /apply/${app.slug} as soon as you save. The link itself never changes.`}
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />
      <ApplicationEditor
        slug={app.slug}
        initial={{
          title: app.title,
          description: app.description ?? "",
          trackSlug: app.trackSlug ?? "",
          notifyEmail: app.notifyEmail ?? "",
          // Stored as end-of-day Eastern; show the Eastern calendar date back.
          closesAt: app.closesAt
            ? new Date(app.closesAt).toLocaleDateString("en-CA", { timeZone: "America/New_York" })
            : "",
        }}
        questions={app.questions}
        hiddenQuestions={app.hiddenQuestions}
      />
    </div>
  );
}
