import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents, canManageRoles } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { loadOnboardingChecklist } from "@/lib/onboarding/checklists";
import { ManageMenu } from "../../manage-menu";
import { requireManager, allowedTrackSlugsForActor } from "../../actions-shared";
import { OnboardingEditor, type EditorState } from "./onboarding-editor";

export const dynamic = "force-dynamic";

export default async function OnboardingChecklistEditPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const { track } = await params;
  const actor = await requireManager();
  const allowed = await allowedTrackSlugsForActor(actor, actor.svc);
  if (allowed && !allowed.has(track)) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const [checklist, { data: saved }, { data: enrolledRows }] = await Promise.all([
    loadOnboardingChecklist(svc, track),
    svc.from("onboarding_checklists").select("track_slug").eq("track_slug", track).maybeSingle(),
    svc.from("student_tracks").select("student_id").eq("track_slug", track),
  ]);

  // How many enrolled learners have finished each step.
  const studentIds = [...new Set((enrolledRows ?? []).map((r) => r.student_id as string))];
  const done: Record<string, number> = {};
  if (checklist && studentIds.length > 0) {
    const { data: rows } = await svc
      .from("survey_responses")
      .select("survey_type, student_id")
      .in("survey_type", checklist.items.map((i) => i.surveyType))
      .in("student_id", studentIds)
      .not("completed_at", "is", null);
    for (const it of checklist.items) {
      done[it.id] = (rows ?? []).filter((r) => r.survey_type === it.surveyType).length;
    }
  }

  // A course with no checklist starts from a sensible draft, paused so saving
  // it does not suddenly hold learners who are already enrolled.
  const initial: EditorState = checklist
    ? {
        title: checklist.title,
        intro: checklist.intro,
        eyebrow: checklist.eyebrow ?? "",
        footnote: checklist.footnote ?? "",
        completeTitle: checklist.completeTitle ?? "",
        cohort: checklist.cohort,
        paused: Boolean(checklist.paused),
        timeCommitment: checklist.agreement.timeCommitment,
        requireReleases: Boolean(checklist.agreement.requireReleases),
        items: checklist.items.map((i) => ({
          id: i.id,
          kind: i.kind,
          label: i.label,
          description: i.description,
          surveyType: i.surveyType,
          questions: i.questions ?? [],
        })),
      }
    : {
        title: "Complete your pre-program materials",
        intro: "Finish these steps before your program starts so we can finalize your enrollment.",
        eyebrow: "",
        footnote: "",
        completeTitle: "",
        cohort: track,
        paused: true,
        timeCommitment: "",
        requireReleases: false,
        items: [
          {
            id: "intake",
            kind: "survey",
            label: "Learner Intake Form",
            description: "A few quick questions so we know who we're serving.",
            surveyType: "bcc-learner-intake",
            questions: [],
          },
        ],
      };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="Onboarding checklist"
        subtitle={`${track} · what learners complete before they officially join`}
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />
      <OnboardingEditor
        trackSlug={track}
        initial={initial}
        hasSaved={Boolean(saved)}
        hasBuiltIn={Boolean(checklist) && !saved}
        enrolled={studentIds.length}
        done={done}
      />
    </div>
  );
}
