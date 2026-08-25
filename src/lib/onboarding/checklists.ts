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

/** Per-cohort details of the participation agreement the checklist collects. */
export type AgreementConfig = {
  /** Stamped on the signed row so a re-worded document stays distinguishable. */
  version: string;
  /** Section 1's first bullet — duration and weekly load differ per course. */
  timeCommitment: string;
  /**
   * Also collect the BCC Release of Liability and Media Release as checkbox
   * acknowledgments inside the agreement (see lib/onboarding/releases.ts).
   */
  requireReleases?: boolean;
};

export type TrackOnboarding = {
  trackSlug: string;
  /** Cohort label recorded with the signed agreement. */
  cohort: string;
  title: string;
  intro: string;
  agreement: AgreementConfig;
  /** Eyebrow above the title. Defaults to the acceptance framing. */
  eyebrow?: string;
  /** Closing line under the list. Defaults to the acceptance framing. */
  footnote?: string;
  /** Headline on the all-done screen. Defaults to the acceptance framing. */
  completeTitle?: string;
  items: ChecklistItem[];
  /**
   * Paused: the checklist still EXISTS — admin Agreements reads it to know
   * which survey_type holds each cohort's signatures — but it no longer gates
   * learners. Set back to false to start enforcing it again for the next
   * intake. See getEnforcedOnboardingChecklist.
   */
  paused?: boolean;
};

// Reusable per-track acceptance checklists. Add a track slug here to gate it
// behind a checklist of acceptance materials. Each item's `surveyType` is the
// EXISTING survey_responses.survey_type, so prior completions (intake,
// pre-survey) auto-check on first visit.
const CHECKLISTS: Record<string, TrackOnboarding> = {
  "comptia-security": {
    trackSlug: "comptia-security",
    // Paused 2026-07-09, before the Jul 13 start: all 15 learners had already
    // completed intake, agreement and pre-survey, so the gate only trapped
    // accounts enrolled after the fact. The definition stays so the admin
    // Agreements page can still surface the 15 signatures. Flip to false to
    // enforce it again for the next intake.
    paused: true,
    cohort: "Catalyst Cybersecurity Cohort",
    agreement: {
      version: "cyber-final-v1",
      timeCommitment:
        "The program runs approximately 12 weeks, with an estimated 6–8 hours per week which includes instructor-led technology sessions, coursework, coaching, and community.",
    },
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
  "mass-fall-2026": {
    trackSlug: "mass-fall-2026",
    cohort: "MASS Coaching Cohort — Fall 2026",
    agreement: {
      version: "mass-fall-2026-v1",
      // Eight weeks at 1–2 hours, per the MASS program doc — not the
      // Security+ 12-week/6–8-hour commitment the document was first written for.
      timeCommitment:
        "The program runs approximately 8 weeks, with an estimated 1–2 hours per week which includes instructor-led sessions, coursework, and coaching.",
      // The Media/Risk acknowledgment the team collects on paper, folded into
      // the agreement rather than added as a fourth checklist step.
      requireReleases: true,
    },
    title: "Complete your pre-program materials",
    // These 12 are already enrolled, not awaiting acceptance — the Security+
    // "You're accepted / your acceptance is contingent" framing would be wrong.
    eyebrow: "Welcome to MASS",
    footnote:
      "All three are due by 3pm ET on Friday, August 28. Anything you’ve already done is checked off automatically.",
    completeTitle: "Thank you for completing your pre-program materials.",
    intro:
      "Welcome to the MASS coaching cohort. Finish these three steps before the first session on Saturday, August 29 so we can finalize your enrollment. Anything you’ve already completed is checked off for you.",
    items: [
      {
        id: "intake",
        label: "Learner Intake Form",
        description: "A few quick questions so we know who we’re serving.",
        surveyType: "bcc-learner-intake",
        kind: "survey",
        href: "/dashboard/survey/bcc-learner-intake",
      },
      {
        id: "agreement",
        label: "Participation Agreement",
        description:
          "Review and sign your commitment to the program expectations, including the liability and media releases.",
        surveyType: "mass-fall-2026-agreement",
        kind: "agreement",
      },
      {
        id: "presurvey",
        label: "Pre-Program Survey",
        description:
          "About 10 minutes on mindset and soft skills, so we know where you’re starting from.",
        surveyType: "mass-fall-2026-pre",
        kind: "survey",
        href: "/dashboard/survey/mass-fall-2026-pre",
      },
    ],
  },
};

/**
 * The checklist DEFINITION for a track, paused or not. Use this where you need
 * to know a cohort's agreement survey_type — e.g. admin Agreements — so a
 * paused checklist doesn't erase the signatures already collected under it.
 */
export function getOnboardingChecklist(trackSlug: string): TrackOnboarding | null {
  return CHECKLISTS[trackSlug] ?? null;
}

/**
 * The checklist that should GATE a learner, or null when paused. Use this on
 * every learner-facing surface: the dashboard layout confines a learner to an
 * incomplete checklist, and the track page renders it instead of the course.
 */
export function getEnforcedOnboardingChecklist(trackSlug: string): TrackOnboarding | null {
  const checklist = CHECKLISTS[trackSlug];
  return checklist && !checklist.paused ? checklist : null;
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
