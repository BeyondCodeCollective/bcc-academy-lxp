import type { SurveyConfig } from "@/lib/programs/types";

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

// Programs where the BCC Learner Intake is skipped because a program-specific
// survey already covers the same data.
export const BCC_INTAKE_EXEMPT_PROGRAMS: readonly string[] = ["atg"];

// ─── Authenticated (dashboard) ──────────────────────────────────────────────

export const PLATFORM_AUTH_SURVEYS: Record<string, SurveyConfig> = {
  [BCC_INTAKE_SURVEY_ID]: {
    id: BCC_INTAKE_SURVEY_ID,
    title: "BCC Learner Intake",
    description: "A few quick questions to help us know who we're serving.",
    required: true,
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
    title: "Pre-Survey",
    description:
      "Help us understand your background and experience so we can better support you.",
    required: false,
  },
  "network-plus-post": {
    id: "network-plus-post",
    title: "CompTIA Network+ End-of-Cohort Survey",
    description:
      "End-of-cohort feedback for CompTIA Network+ — Catalyst's first end-to-end pilot run.",
    required: false,
  },
};
