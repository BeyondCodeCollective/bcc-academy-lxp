"use client";

import { type SurveyQuestion } from "@/components/survey-fields";
import {
  DIGITAL_EXPERIENCE_STATEMENTS,
  AI_EXPERIENCE_STATEMENTS,
} from "@/lib/surveys/schemas";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// Public (unauthenticated) AI Fundamentals — Program Impact Survey.
//
// The public counterpart of the single-sitting instrument that replaced the
// pre→post pair. Same reason it exists at all: an outcome that needs a second
// sitting months later mostly doesn't arrive (9 of 9 pre, 1 of 9 post). Both
// batteries are asked as dual-likert, so ONE submission carries the shift.
//
// Statements are imported, not retyped — the wizard, the public form, and the
// analytics schema must measure the same statements word for word or the deltas
// silently stop matching up.

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

export const CONSENT_VERSION = "ai-impact-survey-2026-v1";

const PAGES: Page[] = [
  // Page 0 — Contact (name + email to match their record)
  { kind: "contact" },

  {
    kind: "questions",
    title: "About Your Program",
    questions: [
      {
        type: "radio",
        id: "program_variant",
        label: "Which version of the program did you take?",
        options: [
          "AI Fundamentals",
          "AI Fundamentals for Digital Natives",
          "AI Fundamentals for Wisdom Circle Leaders",
        ],
        required: true,
      },
    ] as SurveyQuestion[],
  },

  {
    kind: "questions",
    title: "Digital Experience",
    subtitle:
      "Rate each statement twice — once for how you felt BEFORE the program, and once for RIGHT NOW. There are no right or wrong answers.",
    questions: [
      {
        type: "dual-likert",
        id: "digital_experience_change",
        label: "Digital Experience",
        scale: LIKERT_1_5,
        beforeLabel: "BEFORE the program",
        nowLabel: "RIGHT NOW",
        scaleAnchors: { low: "Strongly Disagree", high: "Strongly Agree" },
        statements: DIGITAL_EXPERIENCE_STATEMENTS,
        required: true,
      },
    ] as SurveyQuestion[],
  },

  {
    kind: "questions",
    title: "AI Tools",
    subtitle: "Same again — where you started, and where you are now.",
    questions: [
      {
        type: "dual-likert",
        id: "ai_experience_change",
        label: "AI Tools",
        scale: LIKERT_1_5,
        beforeLabel: "BEFORE the program",
        nowLabel: "RIGHT NOW",
        scaleAnchors: { low: "Strongly Disagree", high: "Strongly Agree" },
        statements: AI_EXPERIENCE_STATEMENTS,
        required: true,
      },
    ] as SurveyQuestion[],
  },

  {
    kind: "questions",
    title: "In your own words",
    subtitle: "A few final questions about your experience.",
    questions: [
      {
        type: "text",
        id: "post_new_skill",
        label:
          "What is something you can do now that you couldn't do before this program?",
        required: true,
      },
      {
        type: "radio",
        id: "post_taught_others",
        label:
          "Did you have a chance to share or teach what you learned to someone else?",
        options: [
          "Yes — I taught or shared something with someone",
          "I tried, but it was hard to explain",
          "Not yet, but I want to",
          "No",
        ],
        required: true,
      },
      {
        type: "radio",
        id: "post_career_interest",
        label:
          "How do you feel about working in a career that involves technology?",
        options: [
          "More interested than before",
          "I was already interested and still am",
          "About the same",
          "Less interested than before",
        ],
        required: true,
      },
      {
        type: "radio",
        id: "post_recommend",
        label: "Would you recommend this program to someone else?",
        options: ["Yes", "Maybe", "No"],
        required: true,
      },
      {
        type: "text",
        id: "post_more_help",
        label: "Do you want more help with anything?",
        required: false,
      },
    ] as SurveyQuestion[],
  },
];

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicImpactSurvey({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      contactSubtitle="So we can connect your answers to your learner record."
      successTitle="Thank you!"
      successBody="Your answers show how far this cohort came — that's what makes the case for the next one. We appreciate you."
    />
  );
}
