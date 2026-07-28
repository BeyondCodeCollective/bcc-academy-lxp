"use client";

import { type SurveyQuestion } from "@/components/survey-fields";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// Public (unauthenticated) Beyond Code Centers pre-survey — Spring 2026.
// Students land here via a shared link without needing to log in.
// Collects demographics, device access, digital literacy, and AI experience.

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

export const CONSENT_VERSION = "pre-survey-spring-2026-v1";

const CONSENT_LEAD =
  "Beyond Code Collective collects this information to understand your background and experience so we can better support you.";

const CONSENT_BULLETS = [
  'You can mark "Prefer not to say" on any item — your choice never affects your participation.',
  "Your answers stay private and are never shared individually.",
];

const CONSENT_FOOTER =
  "Your use of this platform is governed by the BCC Terms of Use and Privacy Policy at wearebcc.org. Full details at /privacy.";

const PAGES: Page[] = [
  // Page 0 — Consent
  {
    kind: "questions",
    title: "Before you start",
    subtitle:
      "Thanks for joining Beyond Code Centers! Before we get started, take a few minutes to tell us about yourself.",
    questions: [
      {
        type: "consent",
        id: "consent_to_participate",
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

  // Page 2 — Demographics
  {
    kind: "questions",
    title: "About You",
    subtitle:
      'We collect this so we can share our learner community\'s impact with funders. You can mark "Prefer not to say" on any item.',
    questions: [
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
    ] as SurveyQuestion[],
  },

  // Page 3 — Device access & digital experience
  {
    kind: "questions",
    title: "Technology & Digital Experience",
    subtitle:
      "Help us understand where you're starting so we can meet you there.",
    questions: [
      {
        type: "multi-select",
        id: "device_access",
        label: "What devices do you have regular access to right now?",
        options: [
          "Smartphone (iPhone, Android, etc.)",
          "Laptop",
          "Desktop computer",
          "Tablet",
          "I don't have regular access to any of these",
        ],
        required: true,
      },
      {
        type: "text",
        id: "computer_access",
        label:
          "Where do you usually go when you need to use a computer or get online?",
        required: true,
      },
      {
        type: "likert",
        id: "digital_experience",
        label: "Digital Experience",
        scale: LIKERT_1_5,
        scaleAnchors: { low: "1 — Strongly Agree", high: "5 — Strongly Disagree" },
        statements: [
          "I feel comfortable using a computer or tablet on my own.",
          "I feel comfortable using technology.",
          "I know how to search for information online and check if it's reliable.",
          "I feel confident sending a professional email.",
          "I understand how to stay safe online (passwords, scams, privacy).",
          "I can use tools like Google Docs, Sheets, or MS Word for school or work.",
          "I feel like technology is something I can learn and control.",
          "I could use technology to help me reach a goal (job, school, or creative).",
          "I'm excited to use new technologies.",
        ],
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 4 — AI experience
  {
    kind: "questions",
    title: "AI Tools",
    subtitle:
      "For each statement below, please rate yourself. Scale: 1 = Strongly Agree · 5 = Strongly Disagree.",
    questions: [
      {
        type: "likert",
        id: "ai_experience",
        label: "AI Tools",
        scale: LIKERT_1_5,
        scaleAnchors: { low: "1 — Strongly Agree", high: "5 — Strongly Disagree" },
        statements: [
          "I'm familiar with everyday AI tools (e.g. ChatGPT, Google Gemini, Snapchat AI).",
          "I'm familiar with coding AI tools (e.g. Codex, Replit, Loveable).",
          "I know what AI tools are and have a basic idea of how they work.",
          "I see learning AI tools as a skill worth developing seriously.",
          "I feel confident I could learn to use AI tools well.",
          "AI feels relevant to my future goals.",
        ],
        required: true,
      },
      {
        type: "text",
        id: "ai_perspective",
        label: "What is your perspective and experience with AI?",
        required: true,
      },
      {
        type: "text",
        id: "anything_else",
        label: "Is there anything else important for us to know?",
        required: false,
      },
    ] as SurveyQuestion[],
  },
];

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicPreSurvey({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      contactSubtitle="So we can connect your responses to your record when the program starts."
      successTitle="You're all set."
      successBody="Thanks for sharing. Your answers help us build Beyond Code Centers around you."
    />
  );
}
