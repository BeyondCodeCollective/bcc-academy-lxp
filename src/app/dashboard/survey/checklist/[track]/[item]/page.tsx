import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { getProgram } from "@/lib/programs/server";
import { loadOnboardingChecklist } from "@/lib/onboarding/checklists";
import { ChecklistForm } from "./checklist-form";

export const dynamic = "force-dynamic";

// A custom form step of a course's onboarding checklist. Lives under
// /dashboard/survey so the dashboard layout treats it like any survey page:
// chrome hidden, and reachable while the learner is held on their checklist.
export default async function ChecklistFormPage({
  params,
}: {
  params: Promise<{ track: string; item: string }>;
}) {
  const { track, item: itemId } = await params;
  const ctx = await getSessionContext();
  if (!ctx?.userId) redirect("/");

  const svc = createServiceClient();
  const { data: enrolled } = await svc
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", ctx.userId)
    .eq("track_slug", track)
    .maybeSingle();
  if (!enrolled) redirect("/dashboard");

  const checklist = await loadOnboardingChecklist(svc, track);
  const item = checklist?.items.find((i) => i.id === itemId && i.kind === "form");
  if (!checklist || !item?.questions?.length) notFound();

  const { data: done } = await svc
    .from("survey_responses")
    .select("completed_at")
    .eq("student_id", ctx.userId)
    .eq("survey_type", item.surveyType)
    .not("completed_at", "is", null)
    .maybeSingle();
  if (done) redirect(`/dashboard/track/${track}`);

  const program = await getProgram();
  return (
    <ChecklistForm
      trackSlug={track}
      itemId={item.id}
      programSlug={program.slug}
      title={item.label}
      description={item.description}
      questions={item.questions}
    />
  );
}
