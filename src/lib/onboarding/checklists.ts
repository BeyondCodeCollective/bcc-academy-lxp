import type { SupabaseClient } from "@supabase/supabase-js";

export type ChecklistItemKind = "survey" | "agreement";

export type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  /** survey_responses.survey_type that marks this item complete. Anything the
   *  learner already completed under this type auto-checks — no double work. */
  surveyType: string;
  kind: ChecklistItemKind;
  /** Where a survey item is completed (the agreement opens an in-page modal). */
  href?: string;
};

export type TrackOnboarding = {
  trackSlug: string;
  /** Cohort label recorded with the signed agreement. */
  cohort: string;
  title: string;
  intro: string;
  items: ChecklistItem[];
};

// Reusable per-track acceptance checklists. Add a track slug here to gate it
// behind a checklist of acceptance materials. Each item's `surveyType` is the
// EXISTING survey_responses.survey_type, so prior completions (intake,
// pre-survey) auto-check on first visit.
const CHECKLISTS: Record<string, TrackOnboarding> = {
  "comptia-security": {
    trackSlug: "comptia-security",
    cohort: "Catalyst Cybersecurity Cohort",
    title: "Complete your acceptance materials",
    intro:
      "Congratulations — you've been accepted into the Catalyst Cybersecurity Cohort. Finish these three steps to lock in your spot. Anything you've already completed is checked off for you.",
    items: [
      {
        id: "intake",
        label: "Learner Intake Form",
        description: "A few quick questions so we know who we're serving.",
        surveyType: "bcc-learner-intake",
        kind: "survey",
        href: "/dashboard/survey/bcc-learner-intake",
      },
      {
        id: "agreement",
        label: "Participation Agreement",
        description: "Review and sign your commitment to the program expectations.",
        surveyType: "comptia-security-agreement",
        kind: "agreement",
      },
      {
        id: "presurvey",
        label: "Pre-Survey",
        description: "Help us understand your background so we can support you.",
        surveyType: "comptia-security-pre",
        kind: "survey",
        href: "/dashboard/survey/comptia-security-pre",
      },
    ],
  },
};

export function getOnboardingChecklist(trackSlug: string): TrackOnboarding | null {
  return CHECKLISTS[trackSlug] ?? null;
}

export type OnboardingStatus = {
  items: { id: string; completed: boolean }[];
  allComplete: boolean;
  agreementSigned: boolean;
};

// Marks each checklist item complete when a matching survey_type has a non-null
// completed_at. Pass any Supabase client with read access to survey_responses.
export async function getOnboardingStatus(
  svc: SupabaseClient,
  studentId: string,
  trackSlug: string,
): Promise<OnboardingStatus | null> {
  const checklist = getOnboardingChecklist(trackSlug);
  if (!checklist) return null;

  const types = checklist.items.map((i) => i.surveyType);
  const { data } = await svc
    .from("survey_responses")
    .select("survey_type, completed_at")
    .eq("student_id", studentId)
    .in("survey_type", types)
    .not("completed_at", "is", null);

  const done = new Set((data ?? []).map((r) => r.survey_type as string));
  const items = checklist.items.map((i) => ({ id: i.id, completed: done.has(i.surveyType) }));
  const agreement = checklist.items.find((i) => i.kind === "agreement");

  return {
    items,
    allComplete: items.every((i) => i.completed),
    agreementSigned: agreement ? done.has(agreement.surveyType) : true,
  };
}
