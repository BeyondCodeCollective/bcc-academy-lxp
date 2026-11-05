import type { SurveyQuestion } from "@/components/survey-fields";
import type { SurveyConfig } from "@/lib/programs/types";

// Catalyst Labs post-session survey: three questions, taken at the end of the
// single 90-minute AI Fundamentals session. Shared across every Labs date so
// the cohorts stay comparable; responses separate by the learner's enrollment.

export const CATALYST_LABS_POST_SURVEY_ID = "catalyst-labs-post";

// Registered in the Catalyst program config (not PLATFORM_AUTH_SURVEYS) because
// only program surveys reach the dashboard card and redirect. Nov 19 only: it
// opens 15 minutes before the session ends (7:30 PM ET), so learners who open
// their dashboard as the session wraps land on it. Earlier Labs dates are not
// asked retroactively.
export const CATALYST_LABS_POST_SURVEY: SurveyConfig = {
  id: CATALYST_LABS_POST_SURVEY_ID,
  title: "Catalyst Labs: Post-Session Survey",
  description: "Three quick questions before you go.",
  required: true,
  appliesToTracks: ["catalyst-labs-nov19"],
  opensAt: "2026-11-20T00:15:00Z", // Thu Nov 19, 7:15 PM ET
  organization: "Beyond Code Collective",
};

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
