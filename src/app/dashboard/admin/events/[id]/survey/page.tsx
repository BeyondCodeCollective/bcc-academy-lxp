import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { requireManager, allowedProgramIdsForActor } from "@/app/dashboard/admin/actions-shared";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../../manage-menu";
import type { SurveyQuestion } from "@/lib/event-survey";
import { SurveyEditor } from "./survey-editor";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function EventSurveyAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const allowedIds = allowedProgramIdsForActor(await requireManager());
  const svc = createServiceClient();
  const { data: event } = await svc
    .from("events")
    .select("id, title, program_id, survey_questions")
    .eq("id", id)
    .maybeSingle<{ id: string; title: string; program_id: string; survey_questions: SurveyQuestion[] | null }>();
  if (!event || (allowedIds !== null && !allowedIds.includes(event.program_id))) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="Parent survey"
        subtitle={event.title}
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />
      <p className="text-sm text-ink-soft">
        Upload a CSV to replace the default four questions for this event. Families get it in the same next-morning
        email. Back to the{" "}
        <Link href={`/dashboard/admin/events/${event.id}`} className="text-ink underline">
          roster
        </Link>
        .
      </p>
      <SurveyEditor eventId={event.id} initial={event.survey_questions} />
    </div>
  );
}
