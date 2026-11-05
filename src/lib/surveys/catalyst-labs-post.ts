import type { SurveyQuestion } from "@/components/survey-fields";

// Catalyst Labs post-session survey: three questions, taken at the end of the
// single 90-minute AI Fundamentals session. Shared across every Labs date so
// the cohorts stay comparable; responses separate by the learner's enrollment.

export const CATALYST_LABS_POST_SURVEY_ID = "catalyst-labs-post";

export const CATALYST_LABS_TRACKS = ["catalyst-labs", "catalyst-labs-oct14", "catalyst-labs-nov19"];

type Page = { title: string; subtitle?: string; questions: SurveyQuestion[] };

export const CATALYST_LABS_POST_PAGES: Page[] = [
  {
    title: "Before you go",
    subtitle: "Three quick questions.",
    questions: [
      {
        type: "likert",
        id: "lab_rating",
        label: "How would you rate today's Catalyst Lab?",
        statements: ["Today's Catalyst Lab"],
        scale: ["1", "2", "3", "4", "5"],
        scaleAnchors: { low: "1: Poor", high: "5: Excellent" },
        required: true,
      },
      {
        type: "text",
        id: "try_this_week",
        label: "What's one thing you'll try with AI this week?",
        short: true,
        required: true,
      },
      {
        type: "radio",
        id: "field_ready_interest",
        label: "Want to keep going with Field Ready, our 8-week program?",
        options: ["Yes", "Maybe", "No"],
        required: true,
      },
    ],
  },
];
