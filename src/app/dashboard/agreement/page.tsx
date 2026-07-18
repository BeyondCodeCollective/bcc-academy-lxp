import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { getProgram } from "@/lib/programs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { CatalystAgreement } from "@/components/catalyst-agreement";
import { getOnboardingChecklist } from "@/lib/onboarding/checklists";
import { TrackAgreementView } from "./track-agreement-view";

// Standalone participation-agreement signing page. Auth-gated (own check +
// dashboard layout), and exempt from the layout's confinement redirects so a
// shared link always lands here. Records the signature under the learner's
// account via signCatalystAgreement.
//
// A cohort whose track configures its OWN agreement (Security+, etc.) must get
// THAT document — this page used to serve the Catalyst/ATG agreement to every
// visitor, so anyone chased by the agreement-request emails signed the wrong
// one regardless of their cohort. Catalyst/ATG learners, whose tracks have no
// checklist agreement, still fall through to the Catalyst agreement below.
export const dynamic = "force-dynamic";

export default async function AgreementPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");

  const program = await getProgram();
  const svc = createServiceClient();

  // Does an enrolled track configure its own agreement? First match wins —
  // a learner in two agreement-bearing cohorts signs one here and reaches the
  // other from that course's checklist.
  const { data: enrolled } = await svc
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", ctx.userId);

  for (const row of (enrolled ?? []) as { track_slug: string }[]) {
    const checklist = getOnboardingChecklist(row.track_slug);
    const item = checklist?.items.find((i) => i.kind === "agreement");
    if (!checklist || !item) continue;

    const [{ data: signed }, { data: person }] = await Promise.all([
      svc
        .from("survey_responses")
        .select("completed_at")
        .eq("student_id", ctx.userId)
        .eq("survey_type", item.surveyType)
        .maybeSingle(),
      svc.from("students").select("first_name, last_name").eq("id", ctx.userId).maybeSingle(),
    ]);

    // Already signed this cohort's agreement — nothing to do here; the course
    // page shows it ticked off.
    if (signed?.completed_at) redirect(`/dashboard/track/${row.track_slug}`);

    return (
      <TrackAgreementView
        trackSlug={row.track_slug}
        programSlug={program.slug}
        cohort={checklist.cohort}
        defaultName={
          person ? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() : undefined
        }
      />
    );
  }

  const [{ data: existing }, { data: student }] = await Promise.all([
    svc
      .from("survey_responses")
      .select("responses, completed_at")
      .eq("student_id", ctx.userId)
      .eq("survey_type", "catalyst-participation-agreement")
      .maybeSingle(),
    svc.from("students").select("first_name, last_name").eq("id", ctx.userId).maybeSingle(),
  ]);

  const responses = (existing?.responses ?? {}) as Record<string, unknown>;
  const priorName = typeof responses.full_name === "string" ? responses.full_name : undefined;
  const nameFromProfile = student
    ? `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim()
    : "";

  return (
    <CatalystAgreement
      programSlug={program.slug}
      defaultName={priorName ?? nameFromProfile}
      alreadySigned={!!existing?.completed_at}
      signedName={priorName}
      signedAt={existing?.completed_at ?? undefined}
    />
  );
}
