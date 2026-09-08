"use client";

import { type SurveyQuestion } from "@/components/survey-fields";
import {
  CYBERDECK_SKILL_STATEMENTS,
  CYBERDECK_CONFIDENCE_STATEMENTS,
  CYBERDECK_EXPERIENCE_STATEMENTS,
} from "@/lib/surveys/schemas";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// BUILD YOUR WORLD: Cyberdeck Series — post-program survey.
//
// Given 10 minutes before the last session ends. The first two pages are the
// pre survey's two batteries, same ids and same statements, so the dashboard
// can pair pre→post per person and compute a real lift. Everything after that
// is the part only the end of a program can answer.

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

export const CONSENT_VERSION = "cyberdeck-2026-v1";

const PAGES: Page[] = [
  { kind: "contact" },
  {
    kind: "questions",
    title: "Technical Skills",
    subtitle: "Rate your current ability to do each of the following.",
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
  {
    kind: "questions",
    title: "Program Experience",
    subtitle: "How the series itself went.",
    questions: [
      {
        type: "likert",
        id: "cyberdeck_experience",
        label: "Program Experience",
        scale: LIKERT_1_5,
        scaleAnchors: { low: "1 — Strongly disagree", high: "5 — Strongly agree" },
        statements: CYBERDECK_EXPERIENCE_STATEMENTS,
        required: true,
      },
      {
        type: "radio",
        id: "cyberdeck_overall_rating",
        label: "Overall, how would you rate the Build Your World series?",
        options: ["1 — Poor", "2", "3", "4", "5 — Excellent"],
        required: true,
      },
    ] as SurveyQuestion[],
  },
  {
    kind: "questions",
    title: "In your own words",
    questions: [
      {
        type: "text",
        id: "cyberdeck_new_skill",
        label:
          "What is one thing you can do now that you couldn't do before this series?",
        required: true,
      },
      {
        type: "text",
        id: "cyberdeck_improve",
        label: "What would make this program even better?",
        required: false,
      },
    ] as SurveyQuestion[],
  },
];

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicCyberdeckPost({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      contactSubtitle="Use the same email you used on the first day so we can pair your answers."
      successTitle="Thank you — you built the thing."
      successBody="Your answers are what let us show what this series does. We appreciate you."
    />
  );
}
