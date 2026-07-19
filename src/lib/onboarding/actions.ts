"use server";

import { revalidatePath } from "next/cache";
import { saveSurveyResponse } from "@/app/dashboard/actions";
import { getOnboardingChecklist } from "@/lib/onboarding/checklists";
import { resolveCatalystCohortLabel } from "@/lib/onboarding/cohort-label";
import { createClient } from "@/lib/supabase/server";

// Records the signed participation agreement as a survey_responses row so it
// flows through the same completion + insights pipeline as every other item
// (and so a signed agreement auto-checks the checklist). Reuses
// saveSurveyResponse, which handles auth, program_id, cohort tagging, and the
// unique(student_id, survey_type) upsert.
// Standalone Catalyst Program Participation Agreement — signed from
// /dashboard/agreement, not tied to a track checklist. Records a
// survey_responses row under the learner's account like every other agreement.
//
// The cohort is the signer's enrolled COURSE, resolved server-side: this one
// document is used across most Catalyst projects, and hardcoding "After the
// Game" filed every signer — Home for the Summer included — under that cohort.
export async function signCatalystAgreement(fullName: string, programSlug: string) {
  const name = fullName.trim();
  if (!name) throw new Error("Please type your full name to sign.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated — please sign in again and retry.");

  await saveSurveyResponse(
    "catalyst-participation-agreement",
    {
      full_name: name,
      agreed_at: new Date().toISOString(),
      cohort: await resolveCatalystCohortLabel(user.id),
      version: "catalyst-2026-07",
    },
    programSlug,
  );
  return { success: true };
}

export async function signParticipationAgreement(
  trackSlug: string,
  fullName: string,
  programSlug: string,
) {
  const name = fullName.trim();
  if (!name) throw new Error("Please type your full name to sign.");

  const checklist = getOnboardingChecklist(trackSlug);
  const item = checklist?.items.find((i) => i.kind === "agreement");
  if (!checklist || !item) {
    throw new Error("No participation agreement is configured for this course.");
  }

  await saveSurveyResponse(
    item.surveyType,
    {
      full_name: name,
      agreed_at: new Date().toISOString(),
      cohort: checklist.cohort,
      version: "cyber-final-v1",
    },
    programSlug,
  );

  revalidatePath(`/dashboard/track/${trackSlug}`);
  return { success: true };
}
