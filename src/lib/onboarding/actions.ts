"use server";

import { revalidatePath } from "next/cache";
import { saveSurveyResponse } from "@/app/dashboard/actions";
import { getOnboardingChecklist } from "@/lib/onboarding/checklists";

// Records the signed participation agreement as a survey_responses row so it
// flows through the same completion + insights pipeline as every other item
// (and so a signed agreement auto-checks the checklist). Reuses
// saveSurveyResponse, which handles auth, program_id, cohort tagging, and the
// unique(student_id, survey_type) upsert.
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
