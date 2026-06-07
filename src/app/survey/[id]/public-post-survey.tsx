"use client";

import { type SurveyQuestion } from "@/components/survey-fields";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// Public (unauthenticated) Beyond Code Centers post-survey — Spring 2026.
// Collects end-of-program reflection + the same digital_experience and
// ai_experience Likert blocks as the pre-survey so the dashboard can compute
// true pre→post confidence deltas.

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

export const CONSENT_VERSION = "post-survey-spring-2026-v1";

const PAGES: Page[] = [
  // Page 0 — Contact (name + email to match their record)
  { kind: "contact" },

  // Page 1 — Program variant
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

  // Page 2 — Digital experience (mirrors pre-survey for delta comparison)
  {
    kind: "questions",
    title: "Digital Experience",
    subtitle:
      "Rate yourself on the same statements as when you started. Scale: 1 = Strongly Agree · 5 = Strongly Disagree.",
    questions: [
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

  // Page 3 — AI tools (mirrors pre-survey for delta comparison)
  {
    kind: "questions",
    title: "AI Tools",
    subtitle:
      "Rate yourself on the same statements as when you started. Scale: 1 = Strongly Agree · 5 = Strongly Disagree.",
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
    ] as SurveyQuestion[],
  },

  // Page 4 — Program reflection
  {
    kind: "questions",
    title: "Program Reflection",
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
        id: "post_confidence_change",
        label: "Do you feel more confident using technology after this program?",
        options: [
          "Yes, a lot more confident",
          "A little more confident",
          "About the same",
          "Less confident than before",
        ],
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

export function PublicPostSurvey({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      contactSubtitle="So we can connect your post-survey to your pre-survey record."
      successTitle="Thank you!"
      successBody="Your feedback helps us improve the program for everyone. We appreciate you completing the post-survey."
    />
  );
}
