import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../manage-menu";
import { ApplicationBuilder } from "./application-builder";

export const dynamic = "force-dynamic";

export default async function NewApplicationPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="New application"
        subtitle="Build the form people fill out to apply. It publishes at /apply/<slug> the moment you create it."
        noWrap
        actions={<ManageMenu />}
      />
      <ApplicationBuilder />
    </div>
  );
}
