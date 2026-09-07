"use server";

import { revalidatePath } from "next/cache";
import { saveSurveyResponse } from "@/app/dashboard/actions";
import { getOnboardingChecklist } from "@/lib/onboarding/checklists";
import { RELEASES_VERSION } from "@/lib/onboarding/releases";
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
  // The CATALYST agreement is filed under Catalyst, whoever signs it and
  // wherever they signed it from. It used to be stamped with the signer's
  // browsing program, so two Beyond the Game learners (MASS/Tech+) who opened
  // the shareable /dashboard/agreement link filed a "Catalyst Participation
  // Agreement" under Beyond the Game — a form that program doesn't own, sitting
  // in its Insights with two responses.
  //
  // A response belongs to the program that owns the FORM. Who signed it and
  // which dashboard they were looking at are separate facts, already recorded
  // on the row.
  void programSlug;
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
    "catalyst",
  );
  return { success: true };
}

export async function signParticipationAgreement(
  trackSlug: string,
  fullName: string,
  programSlug: string,
  /** Acknowledgments of the liability and media releases, when the cohort's
   *  agreement collects them (AgreementConfig.requireReleases). Re-checked here
   *  because the client checkbox is a courtesy, not the record. */
  releases?: { liability: boolean; media: boolean },
) {
  const name = fullName.trim();
  if (!name) throw new Error("Please type your full name to sign.");

  const checklist = getOnboardingChecklist(trackSlug);
  const item = checklist?.items.find((i) => i.kind === "agreement");
  if (!checklist || !item) {
    throw new Error("No participation agreement is configured for this course.");
  }

  const needsReleases = !!checklist.agreement.requireReleases;
  if (needsReleases && !(releases?.liability && releases?.media)) {
    throw new Error(
      "Please acknowledge the Release of Liability and the Media and Publicity Release to sign.",
    );
  }

  const agreedAt = new Date().toISOString();
  await saveSurveyResponse(
    item.surveyType,
    {
      full_name: name,
      agreed_at: agreedAt,
      cohort: checklist.cohort,
      version: checklist.agreement.version,
      ...(needsReleases
        ? {
            releases_version: RELEASES_VERSION,
            liability_release_accepted_at: agreedAt,
            media_release_accepted_at: agreedAt,
          }
        : {}),
    },
    programSlug,
  );

  revalidatePath(`/dashboard/track/${trackSlug}`);
  return { success: true };
}
