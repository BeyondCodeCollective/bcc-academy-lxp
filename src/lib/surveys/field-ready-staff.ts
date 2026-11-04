import type { SurveyQuestion } from "@/components/survey-fields";

// Field Ready staff pilot (track field-ready-staff-cohort, starts Nov 9, 2026).
// Pre and post share the SAME ids and wording for the confidence items, the AI
// use frequency, the tools and the three knowledge checks, so pre to post can
// be compared. A reworded statement on one side silently breaks the delta.
// Knowledge checks carry no correct-answer flag anywhere: learners never see
// answers and the key lives with whoever scores them.
//
// The survey types have no conditional display, no number field and no
// "other" text box, so: per-tool free/paid is one grid over all five tools
// (with "Did not use"), hours is a short text field, and "Other" tools get a
// follow-up text question.

type Page = { title: string; subtitle?: string; questions: SurveyQuestion[] };

const AGREE_1_5 = ["1", "2", "3", "4", "5"];
const AGREE_ANCHORS = { low: "1: Strongly disagree", high: "5: Strongly agree" };

export const FIELD_READY_CONFIDENCE = [
  { id: "conf_explain_model", statement: "I can explain what an AI model is and is not." },
  { id: "conf_check_answer", statement: "I can tell when an AI answer needs to be checked." },
  { id: "conf_set_up_tool", statement: "I can set up an AI tool so it works the way I want." },
  {
    id: "conf_explain_work",
    statement: "I can explain a piece of AI-assisted work to a skeptical colleague.",
  },
] as const;

const confidenceQuestions = (): SurveyQuestion[] =>
  FIELD_READY_CONFIDENCE.map((c) => ({
    type: "likert",
    id: c.id,
    label: "How much do you agree?",
    statements: [c.statement],
    scale: AGREE_1_5,
    scaleAnchors: AGREE_ANCHORS,
    required: true,
  }));

const FREQUENCY: SurveyQuestion = {
  type: "radio",
  id: "ai_use_frequency",
  label: "How often do you use AI at work today?",
  options: ["Never", "Monthly", "Weekly", "Daily"],
  required: true,
};

const TOOLS = ["ChatGPT", "Claude", "Gemini", "Microsoft Copilot", "Perplexity"];

const toolQuestions = (): SurveyQuestion[] => [
  {
    type: "multi-select",
    id: "ai_tools_used",
    label: "Which AI tools have you used in the last month?",
    options: [...TOOLS, "Other"],
  },
  {
    type: "text",
    id: "ai_tools_other",
    label: "If you picked Other, which tool?",
    short: true,
  },
  {
    type: "likert",
    id: "ai_tools_plan",
    label: "For each tool you used, is your account free or paid?",
    statements: [...TOOLS],
    scale: ["Free", "Paid", "Not sure", "Did not use"],
  },
];

const KNOWLEDGE_CHECKS: SurveyQuestion[] = [
  {
    type: "radio",
    id: "kc_statistic_source",
    label:
      "An AI tool gives you a statistic and names a report as the source. What should you do first?",
    options: [
      "Accept it because it named a source",
      "Ask the tool whether it is sure",
      "Find the report and look for the statistic",
      "Ask the tool to write a summary of the report",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "kc_check_first_claim",
    label:
      "An AI tool writes this summary of a vendor’s product: “The tool cut processing time by 40% in a study. It is fully compliant with privacy law. Most customers renew within a year.” You have time to check one claim before a meeting. Which should you check first?",
    options: [
      "The 40% claim, because numbers are always the least reliable",
      "The privacy compliance claim, because it costs the most if it is wrong",
      "The renewal claim, because it is the most specific",
      "None, because the summary sounds confident",
    ],
    required: true,
  },
  {
    type: "radio",
    id: "kc_sensitive_data",
    label:
      "A manager asks you to summarize 40 customer complaint emails that include names and phone numbers. What is the best first step?",
    options: [
      "Paste them into your personal free AI account so your work account stays clean",
      "Paste them into the AI tool and ask it to remove the names and numbers for you",
      "Remove the names and numbers yourself, then check your organization’s policy before pasting anything",
      "Skip AI and read all 40 by hand",
    ],
    required: true,
  },
];

export const FIELD_READY_PRE_PAGES: Page[] = [
  {
    title: "Where you are starting",
    subtitle: "Not a test. This shows where you begin so we can see what the program changes.",
    questions: confidenceQuestions(),
  },
  {
    title: "How you use AI today",
    questions: [
      FREQUENCY,
      ...toolQuestions(),
      {
        type: "multi-select",
        id: "ai_uses",
        label: "What have you used AI for in the last month?",
        options: [
          "Writing or editing",
          "Research or summarizing",
          "Brainstorming",
          "Data or spreadsheets",
          "Coding",
          "Images or design",
          "Meeting notes",
          "Other",
        ],
      },
      {
        type: "text",
        id: "ai_uses_other",
        label: "If you picked Other, what for?",
        short: true,
      },
    ],
  },
  {
    title: "Quick knowledge check",
    subtitle: "Pick the best answer. Answers are not shown, and nobody is graded.",
    questions: KNOWLEDGE_CHECKS,
  },
  {
    title: "Your goals",
    questions: [
      {
        type: "text",
        id: "workflow_to_improve",
        label: "Which workflow do you most want to improve?",
      },
      {
        type: "text",
        id: "hope_and_worry",
        label: "What is one hope and one worry about doing this?",
      },
      {
        type: "consent",
        id: "recording_consent",
        label: "Recording consent",
        text: "We will record live sessions for use in building the program. Participation indicates consent.",
        confirmLabel: "I understand and agree",
        required: true,
      },
    ],
  },
];

const RETRO_PREFIX = "Looking back, how would you have rated yourself BEFORE the program? ";

export const FIELD_READY_POST_PAGES: Page[] = [
  {
    title: "Where you are now",
    questions: confidenceQuestions(),
  },
  {
    title: "Looking back",
    subtitle:
      "How would you have rated yourself on each of those four statements before the program?",
    questions: FIELD_READY_CONFIDENCE.map(
      (c): SurveyQuestion => ({
        type: "likert",
        id: c.id.replace("conf_", "retro_"),
        label: RETRO_PREFIX.trim(),
        statements: [c.statement],
        scale: AGREE_1_5,
        scaleAnchors: AGREE_ANCHORS,
        required: true,
      }),
    ),
  },
  {
    title: "Quick knowledge check",
    subtitle: "Pick the best answer. Answers are not shown, and nobody is graded.",
    questions: KNOWLEDGE_CHECKS,
  },
  {
    title: "How you use AI now",
    questions: [
      { ...FREQUENCY, label: "How often do you use AI at work now?" },
      ...toolQuestions(),
    ],
  },
  {
    title: "The program itself",
    questions: [
      {
        type: "text",
        id: "hours_per_week",
        label: "On average, how many hours a week did the program take?",
        placeholder: "e.g. 3",
        short: true,
      },
      {
        type: "radio",
        id: "hours_fit",
        label: "Was that too much, about right, or too little?",
        options: ["Too much", "About right", "Too little"],
      },
      {
        type: "likert",
        id: "week_keep_shorten_cut",
        label: "Which parts would you keep, shorten, or cut?",
        statements: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
        scale: ["Keep", "Shorten", "Cut"],
      },
      {
        type: "radio",
        id: "nps",
        label: "How likely are you to recommend this program to a colleague?",
        options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      },
    ],
  },
  {
    title: "What you take from it",
    questions: [
      {
        type: "likert",
        id: "use_in_30_days",
        label: "How much do you agree?",
        statements: ["I can use what I built or learned in my work in the next 30 days."],
        scale: AGREE_1_5,
        scaleAnchors: AGREE_ANCHORS,
      },
      { type: "text", id: "what_built", label: "What did you build?" },
      {
        type: "radio",
        id: "built_in_use",
        label: "Is it in use?",
        options: ["Yes", "No"],
      },
      {
        type: "text",
        id: "free_account_fit",
        label: "Which parts worked on a free account and which did not?",
      },
      {
        type: "text",
        id: "public_learner_struggle",
        label: "What will a public learner struggle with that staff did not?",
      },
    ],
  },
  {
    title: "What is next",
    questions: [
      {
        type: "radio",
        id: "facilitator_interest",
        label: "Would you want to serve as a facilitator or pod lead?",
        options: ["Yes", "Maybe", "No"],
      },
      {
        type: "radio",
        id: "follow_up_90_days",
        label: "May we contact you in 90 days about how this helped?",
        options: ["Yes", "No"],
      },
    ],
  },
];
