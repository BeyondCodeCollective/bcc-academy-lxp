"use client";

import { type SurveyQuestion } from "@/components/survey-fields";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// Public (unauthenticated) version of the BCC Learner Intake.
// Enrolled students still hit the authenticated version via the dashboard gate.
// This is for walk-in attendees who don't have accounts yet.

export const CONSENT_VERSION = "public-intake-v1";

const CONSENT_LEAD =
  "Beyond Code Collective collects this information to demonstrate the impact of our programs to funders. This keeps our programs free and sustainable.";

const CONSENT_BULLETS = [
  'You can mark "Prefer not to say" on any item — your choice never affects your participation.',
  "Your answers stay private and are never shared individually.",
  "To see, change, or delete your answers, email info@beyondcodecollective.org.",
];

const CONSENT_FOOTER =
  "Your use of this platform is governed by the BCC Terms of Use and Privacy Policy at wearebcc.org. Full details at /privacy.";

const PAGES: Page[] = [
  // Page 0 — Consent
  {
    kind: "questions",
    title: "Before you start",
    subtitle: "A quick note on how we use what you share.",
    questions: [
      {
        type: "consent",
        id: "intake_consent",
        label: "Why we ask",
        text: CONSENT_LEAD,
        bullets: CONSENT_BULLETS,
        footer: CONSENT_FOOTER,
        confirmLabel: "Understood — I'm ready to continue.",
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 1 — Contact (name + email)
  { kind: "contact" },

  // Page 2 — Basics
  {
    kind: "questions",
    title: "A few quick basics",
    subtitle: "This helps us know who we're serving.",
    questions: [
      {
        type: "date",
        id: "date_of_birth",
        label: "Date of birth",
        max: new Date().toISOString().split("T")[0],
        required: true,
      },
      {
        type: "text",
        id: "zip_code",
        label: "ZIP code",
        placeholder: "e.g. 40202",
        required: true,
        zip: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 3 — About You
  {
    kind: "questions",
    title: "About You",
    subtitle:
      'We collect this so we can share our learner community\'s impact with funders. You can mark "Prefer not to say" on any item.',
    questions: [
      {
        type: "radio",
        id: "education_level",
        label: "What is the highest level of education you have completed?",
        options: [
          "Some high school (no diploma)",
          "High school diploma or GED",
          "Some college (no degree)",
          "Associate degree",
          "Bachelor's degree",
          "Graduate or professional degree",
          "Prefer not to say",
        ],
        required: true,
      },
      {
        type: "radio",
        id: "gender",
        label: "What is your gender?",
        options: [
          "Man",
          "Woman",
          "Non-binary",
          "Genderqueer / Gender non-conforming",
          "Transgender",
          "Prefer not to say",
          "Other",
        ],
        required: true,
      },
      {
        type: "multi-select",
        id: "race_ethnicity",
        label: "What is your race and/or ethnicity? Select all that apply.",
        options: [
          "American Indian or Alaska Native",
          "Asian",
          "Black or African American",
          "Hispanic or Latino",
          "Middle Eastern or North African",
          "Native Hawaiian or Pacific Islander",
          "White",
          "Prefer not to say",
          "Other",
        ],
        required: true,
      },
      {
        type: "multi-select",
        id: "languages",
        label: "What languages do you speak at home? Select all that apply.",
        options: ["English", "Spanish", "Prefer not to say", "Other"],
        required: true,
      },
      {
        type: "radio",
        id: "first_gen_college",
        label:
          "If you started college today, would you be the first in your immediate family to attend or complete college?",
        options: ["Yes", "No", "Not applicable", "Prefer not to say"],
        required: true,
      },
      {
        type: "multi-select",
        id: "employment_status",
        label: "What is your current employment status? Select all that apply.",
        options: [
          "Employed full-time",
          "Employed part-time",
          "Unemployed",
          "Looking for work",
          "Not currently looking for work",
          "Student",
          "Prefer not to say",
          "Other",
        ],
        required: true,
      },
      {
        type: "radio",
        id: "household_income",
        label: "What best describes your household income range?",
        options: [
          "Under $20,000",
          "$20,000 – $39,999",
          "$40,000 – $59,999",
          "$60,000 – $79,999",
          "$80,000 or more",
          "Prefer not to say",
        ],
        required: true,
      },
      {
        type: "radio",
        id: "disability",
        label: "Do you identify as a person with a disability?",
        options: ["Yes", "No", "Prefer not to say"],
        required: true,
      },
    ] as SurveyQuestion[],
  },
];

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicLearnerIntake({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      contactSubtitle="So we can connect your responses to your record if you join a program."
      successTitle="You're all set."
      successBody="Thanks for sharing. Your information helps us keep this program free and built for people like you."
    />
  );
}
