import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { getApplicationBySlug, isAccepting, rowToSubmission } from "@/lib/applications";
import { ManageMenu } from "../../manage-menu";
import { ReviewQueue } from "./review-queue";

export const dynamic = "force-dynamic";

export default async function ApplicationReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const { slug } = await params;
  const app = await getApplicationBySlug(slug);
  if (!app) notFound();

  const svc = createServiceClient();
  const { data } = await svc
    .from("application_submissions")
    .select("*")
    .eq("application_id", app.id)
    .order("created_at", { ascending: false });
  const submissions = ((data as Record<string, unknown>[]) ?? []).map(rowToSubmission);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title={app.title}
        subtitle={`${submissions.length} submission${submissions.length === 1 ? "" : "s"} · ${
          isAccepting(app) ? "accepting applications" : "closed"
        } · /apply/${app.slug}${app.trackSlug ? ` · accepted → allowlisted for ${app.trackSlug}` : " · no course linked — accepting won't allowlist anyone"}`}
        noWrap
        actions={<ManageMenu />}
      />
      <ReviewQueue
        slug={app.slug}
        open={app.open}
        questions={app.questions}
        submissions={submissions}
      />
    </div>
  );
}
