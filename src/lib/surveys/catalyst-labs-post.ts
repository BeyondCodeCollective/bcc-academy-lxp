import type { SurveyQuestion } from "@/components/survey-fields";
import type { SurveyConfig } from "@/lib/programs/types";

// Catalyst Labs post-session survey: four questions (three ratings, one open),
// taken at the end of the single 90-minute AI Fundamentals session. Question
// set from Devin Cooper, 2026-11-12.

export const CATALYST_LABS_POST_SURVEY_ID = "catalyst-labs-post";

// Registered in the Catalyst program config (not PLATFORM_AUTH_SURVEYS) because
// only program surveys reach the dashboard card and redirect. Nov 19 only: it
// opens 15 minutes before the session ends (7:30 PM ET), so learners who open
// their dashboard as the session wraps land on it. Earlier Labs dates are not
// asked retroactively.
export const CATALYST_LABS_POST_SURVEY: SurveyConfig = {
  id: CATALYST_LABS_POST_SURVEY_ID,
  title: "Catalyst Labs: Post-Session Survey",
  description: "Four quick questions before you go.",
  required: true,
  appliesToTracks: ["catalyst-labs-nov19"],
  opensAt: "2026-11-20T00:15:00Z", // Thu Nov 19, 7:15 PM ET
  organization: "Beyond Code Collective",
};

type Page = { title: string; subtitle?: string; questions: SurveyQuestion[] };

const LIKELY = { low: "1: Not at all likely", high: "5: Extremely likely" };
const SCALE = ["1", "2", "3", "4", "5"];

export const CATALYST_LABS_POST_PAGES: Page[] = [
  {
    title: "Before you go",
    subtitle: "Four quick questions.",
    questions: [
      {
        type: "likert",
        id: "session_value",
        label: "How valuable was today's Catalyst Lab session for you?",
        statements: ["Today's session"],
        scale: SCALE,
        scaleAnchors: { low: "1: Not at all valuable", high: "5: Extremely valuable" },
        required: true,
      },
      {
        type: "likert",
        id: "apply_likelihood",
        label: "How likely are you to apply something from this session in the next 30 days?",
        statements: ["Apply something in the next 30 days"],
        scale: SCALE,
        scaleAnchors: LIKELY,
        required: true,
      },
      {
        type: "likert",
        id: "return_likelihood",
        label: "How likely are you to attend future Beyond Code Collective programming?",
        statements: ["Attend future programming"],
        scale: SCALE,
        scaleAnchors: LIKELY,
        required: true,
      },
      {
        type: "text",
        id: "keep_change_add",
        label: "What's one thing we should keep, change, or add for the next Catalyst Lab?",
        required: true,
      },
    ],
  },
];
