"use client";

import { type SurveyQuestion } from "@/components/survey-fields";
import {
  CYBERDECK_SKILL_STATEMENTS,
  CYBERDECK_CONFIDENCE_STATEMENTS,
} from "@/lib/surveys/schemas";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// BUILD YOUR WORLD: Cyberdeck Series — pre-program survey.
//
// Given in-session, 10 minutes into session one, dropped in the Zoom chat. It
// is public rather than authenticated for exactly that reason: a password reset
// mid-workshop costs more than the login buys us.
//
// Statements are imported from the schema, never retyped here. The post survey
// asks the SAME two batteries under the SAME ids; a reworded statement on one
// side would silently break every pre→post delta.

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

export const CONSENT_VERSION = "cyberdeck-2026-v1";

const PAGES: Page[] = [
  { kind: "contact" },
  {
    kind: "questions",
    title: "Technical Skills",
    subtitle:
      "Rate your current ability to do each of the following. There are no right or wrong answers — this is where you're starting from.",
    questions: [
      {
        type: "likert",
        id: "cyberdeck_skills",
        label: "Technical Skills",
        scale: LIKERT_1_5,
        scaleAnchors: { low: "1 — No experience", high: "5 — Very confident" },
        statements: CYBERDECK_SKILL_STATEMENTS,
        required: true,
      },
    ] as SurveyQuestion[],
  },
  {
    kind: "questions",
    title: "Confidence in Hardware",
    subtitle: "Rate your agreement with each statement.",
    questions: [
      {
        type: "likert",
        id: "cyberdeck_confidence",
        label: "Confidence in Hardware",
        scale: LIKERT_1_5,
        scaleAnchors: { low: "1 — Strongly disagree", high: "5 — Strongly agree" },
        statements: CYBERDECK_CONFIDENCE_STATEMENTS,
        required: true,
      },
    ] as SurveyQuestion[],
  },
];

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicCyberdeckPre({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      contactSubtitle="So we can match this to your answers at the end of the series."
      successTitle="You're all set — let's build."
      successBody="That's your starting line. We'll ask the same questions on the last day so you can see how far you moved."
    />
  );
}
