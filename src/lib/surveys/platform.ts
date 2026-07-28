import type { SurveyConfig } from "@/lib/programs/types";
import { getEveryProgramConfig } from "@/lib/programs";

// ─── Platform-level surveys ─────────────────────────────────────────────────
//
// These are available across ALL programs — not tied to any single program
// config. Program-specific surveys still live in their program configs
// (atg.ts, forge.ts, catalyst.ts).
//
// Two buckets, matching the two rendering pipelines:
//   • AUTH  → gated behind login, rendered by SurveyWizard at /dashboard/survey/<id>
//   • PUBLIC → no login required, custom components at /survey/<id>

// ─── IDs ─────────────────────────────────────────────────────────────────────

export const BCC_INTAKE_SURVEY_ID = "bcc-learner-intake";
const BCC_WORKSHOP_SURVEY_ID = "bcc-workshop";

/** A learner skips a program survey when EVERY course they're enrolled in opts
 *  out via the survey's skipForTracks. Empty enrollment never skips, so this
 *  can't accidentally suppress the survey for a cohort learner mid-enrollment. */
export function surveySkippedForTracks(
  skipForTracks: string[] | undefined,
  enrolledTrackSlugs: string[],
): boolean {
  if (!skipForTracks?.length || enrolledTrackSlugs.length === 0) return false;
  return enrolledTrackSlugs.every((t) => skipForTracks.includes(t));
}

/**
 * The program that OWNS a survey — the one whose section it belongs in.
 *
 * Responses are filed under the answering student's program stamp, which
 * answers "who replied", not "which program's form is this". For a form that
 * declares its programs, those are different questions with different answers:
 * two Beyond the Game learners signing the Catalyst agreement filed it under
 * Beyond the Game, and it showed up in that program's Insights.
 *
 * Returns null when a survey doesn't claim a program, leaving the old
 * student-stamp behaviour for the platform-wide forms (intake, learn-more)
 * where "who replied" genuinely is the right filing.
 */
export function surveyOwnerProgramSlug(surveyId: string): string | null {
  for (const p of getEveryProgramConfig()) {
    for (const s of p.surveys ?? []) {
      if (s.id === surveyId && s.appliesToPrograms?.length) {
        return s.appliesToPrograms[0];
      }
    }
  }
  return null;
}

/**
 * Allowlist counterpart to surveySkippedForTracks: is this survey meant for a
 * learner in these programs at all?
 *
 * No allowlist = the old opt-out behaviour (applies to everyone, minus skips).
 * An allowlist with no matching home program = not this learner's survey, which
 * is the safe default a denylist can't give you.
 */
export function surveyAppliesToPrograms(
  appliesToPrograms: string[] | undefined,
  enrolledHomeProgramSlugs: Iterable<string>,
): boolean {
  if (!appliesToPrograms?.length) return true;
  const homes = new Set(enrolledHomeProgramSlugs);
  return appliesToPrograms.some((p) => homes.has(p));
}

// The BCC Learner Intake is OPT-IN, toggled per program/track via
// program_features/track_features.survey_enabled (admin Features page) — see
// isSurveyEnabledForLearner in src/lib/surveys/features.ts. Off by default, so
// no program gets the intake survey unless it's explicitly turned on.

// ─── Authenticated (dashboard) ──────────────────────────────────────────────

export const SECURITY_PLUS_APPLICATION_SURVEY_ID = "security-plus-application";
export const HOME_FOR_SUMMER_APPLICATION_SURVEY_ID = "home-for-summer-application";

export const PLATFORM_AUTH_SURVEYS: Record<string, SurveyConfig> = {
  [BCC_INTAKE_SURVEY_ID]: {
    id: BCC_INTAKE_SURVEY_ID,
    title: "BCC Learner Intake",
    description: "A few quick questions to help us know who we're serving.",
    required: true,
  },
  [SECURITY_PLUS_APPLICATION_SURVEY_ID]: {
    id: SECURITY_PLUS_APPLICATION_SURVEY_ID,
    title: "CompTIA Security+ Application",
    description: "Application for the Security+ Catalyst cohort — for Network+ graduates.",
    required: false,
  },
  [HOME_FOR_SUMMER_APPLICATION_SURVEY_ID]: {
    id: HOME_FOR_SUMMER_APPLICATION_SURVEY_ID,
    title: "Home for the Summer Application",
    description:
      "Application for the Home for the Summer intensive — August 10–14, 2026, with NextEra Energy.",
    required: false,
  },
  "comptia-security-pre": {
    id: "comptia-security-pre",
    title: "CompTIA Security+ — Pre-Program Survey",
    description:
      "Your confidence, goals, and what you need from the program — so we can support you from the start. Private; used only to improve the program and report impact.",
    required: false,
  },
};

// ─── Public (no login) ──────────────────────────────────────────────────────

export const BCC_PRE_SURVEY_SPRING_2026_ID = "pre-survey-spring-2026";

export const PLATFORM_PUBLIC_SURVEYS: Record<string, SurveyConfig> = {
  [BCC_INTAKE_SURVEY_ID]: {
    id: BCC_INTAKE_SURVEY_ID,
    title: "BCC Learner Intake",
    description:
      "2–3 min. Help us know who we're serving — and connect your info when you join a program.",
    required: false,
  },
  [BCC_WORKSHOP_SURVEY_ID]: {
    id: BCC_WORKSHOP_SURVEY_ID,
    title: "Workshop Survey",
    description:
      "3–5 min. Before you go, share your thoughts on today's workshop.",
    required: false,
  },
  [BCC_PRE_SURVEY_SPRING_2026_ID]: {
    id: BCC_PRE_SURVEY_SPRING_2026_ID,
    title: "AI Fundamentals — Pre-Program Survey",
    description:
      "Help us understand your background and experience so we can better support you.",
    required: false,
  },
  "security-plus-midpoint": {
    id: "security-plus-midpoint",
    title: "CompTIA Security+ Midpoint Check-In",
    description:
      "3 min. A quick pulse at the halfway mark: what's working, what to adjust, and how the exam is feeling.",
    required: false,
  },
  "network-plus-post": {
    id: "network-plus-post",
    title: "CompTIA Network+ End-of-Cohort Survey",
    description:
      "End-of-cohort feedback for CompTIA Network+ — Catalyst's first end-to-end pilot run.",
    required: false,
  },
  // Collected via /apply/security-plus (custom form, not /survey/<id> — no
  // component is registered there, so that route still 404s). Listed here so
  // the admin Surveys views can resolve its title and surface its responses.
  [SECURITY_PLUS_APPLICATION_SURVEY_ID]: {
    id: SECURITY_PLUS_APPLICATION_SURVEY_ID,
    title: "CompTIA Security+ Application",
    description: "Application for the Security+ Catalyst cohort — for Network+ graduates.",
    required: false,
  },
  // Collected via /apply/home-for-summer (custom form, not /survey/<id>).
  [HOME_FOR_SUMMER_APPLICATION_SURVEY_ID]: {
    id: HOME_FOR_SUMMER_APPLICATION_SURVEY_ID,
    title: "Home for the Summer Application",
    description:
      "Application for the Home for the Summer intensive — August 10–14, 2026, with NextEra Energy.",
    required: false,
  },
};
