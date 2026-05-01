"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { saveSurveyResponse } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";
import {
  QuestionRenderer,
  isPageValid as validatePage,
  type SurveyQuestion,
} from "@/components/survey-fields";

type SurveyPage = {
  title: string;
  subtitle?: string;
  questions: SurveyQuestion[];
};

// ─── Survey IDs ───────────────────────────────────────────────────────────────

export const BCC_INTAKE_SURVEY_ID = "bcc-learner-intake";

// ─── BCC Learner Intake ───────────────────────────────────────────────────────
// Platform-level required survey — fires once for every student regardless of program.

const BCC_INTAKE_PAGES: SurveyPage[] = [
  {
    title: "A few quick basics",
    subtitle: "This helps us know who we're serving.",
    questions: [
      {
        type: "text",
        id: "full_name",
        label: "Full name",
        placeholder: "e.g. Jordan Smith",
        required: true,
        short: true,
      },
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
        short: true,
      },
    ],
  },
  {
    title: "About You",
    subtitle:
      'We collect this so we can share our learner community\'s impact with funders — keeping our programs free and sustainable. You can mark "Prefer not to say" on any item.',
    questions: [
      {
        type: "consent",
        id: "intake_consent",
        label: "Why we ask",
        text: "Beyond Code Collective collects this information to demonstrate the impact of our programs to funders. This keeps our programs free and sustainable.",
        bullets: [
          'You can mark "Prefer not to say" on any item — your choice never affects your participation.',
          "Your answers stay private and are never shared individually.",
          "To see, change, or delete your answers, email info@beyondcodecollective.org.",
        ],
        confirmLabel: "Understood — I'm ready to continue.",
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
    ],
  },
];

// ─── Survey Pages ─────────────────────────────────────────────────────────────
//
// Pages 1–4 are shared across every program (demographics, background, digital
// access, digital experience). The final page is program-specific — ATG is
// oriented around breaking into IT careers, Forge is oriented around AI skills.

const SHARED_PAGES: SurveyPage[] = [
  {
    title: "Consent + About You",
    subtitle: "Your responses are confidential and help us improve our program.",
    questions: [
      {
        type: "consent",
        id: "consent",
        label: "Before you start: Here's how we'll use your feedback",
        text: "Your answers help us make this program better and show our impact. Here's what you should know:",
        bullets: [
          "Your answers stay private.",
          'You can mark "Prefer not to say" on any question.',
          "You can ask us anytime to see your answers, change them, or delete them. Just email us at info@beyondcodecollective.org.",
        ],
        confirmLabel: "I understand and agree to participate.",
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
    ],
  },
  {
    title: "Background",
    subtitle: "Tell us a bit about your situation.",
    questions: [
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
    ],
  },
  {
    title: "Digital Access",
    subtitle: "Help us understand your current access to technology.",
    questions: [
      {
        type: "multi-select",
        id: "device_access",
        label:
          "What devices do you have regular access to right now? Select all that apply.",
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
          "Where do you usually go when you need to use a computer or get online? Do you have any challenges getting access?",
        placeholder: "Tell us about your typical access to computers and internet...",
        required: true,
      },
    ],
  },
  {
    title: "Digital Experience",
    subtitle:
      "For each statement below, select how much you agree or disagree. There are no right or wrong answers.",
    questions: [
      {
        type: "likert",
        id: "digital_experience",
        label: "Digital Experience",
        scale: ["1", "2", "3", "4", "5"],
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
    ],
  },
];

const FORGE_FINAL_PAGE: SurveyPage = {
  title: "AI Experience",
  subtitle:
    "These questions help us understand your current understanding of AI. You don't need any prior experience — just answer based on where you are right now.",
  questions: [
    {
      type: "likert",
      id: "ai_experience",
      label: "AI Tools",
      scale: ["1", "2", "3", "4", "5"],
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
      label:
        "What is your perspective and experience with AI? Tell us more in a few sentences.",
      placeholder: "Share your thoughts on AI...",
      required: true,
    },
    {
      type: "text",
      id: "anything_else",
      label: "Is there anything else important for us to know?",
      placeholder: "Optional — share anything else you'd like us to know.",
      required: false,
    },
  ],
};

const ATG_FINAL_PAGE: SurveyPage = {
  title: "Tech Career Path",
  subtitle:
    "These questions help us understand your interest and readiness for a career in tech. There are no right or wrong answers.",
  questions: [
    {
      type: "likert",
      id: "tech_career_readiness",
      label: "Tech Career Readiness",
      scale: ["1", "2", "3", "4", "5"],
      scaleAnchors: { low: "1 — Strongly Agree", high: "5 — Strongly Disagree" },
      statements: [
        "I'm familiar with what IT professionals do day-to-day.",
        "I know what the CompTIA Tech+ certification is and why it matters.",
        "I see learning IT skills as a realistic path for me.",
        "I feel confident I could pass a tech certification exam with the right prep.",
        "I've researched what tech jobs are available and what they pay.",
        "I know at least one person who works in IT or tech.",
        "Transitioning from athletics into a tech career feels achievable for me.",
      ],
      required: true,
    },
    {
      type: "text",
      id: "tech_motivation",
      label:
        "What draws you to a career in tech? Tell us more in a few sentences.",
      placeholder: "Share what's motivating you to pursue tech...",
      required: true,
    },
    {
      type: "text",
      id: "anything_else",
      label: "Is there anything else important for us to know?",
      placeholder: "Optional — share anything else you'd like us to know.",
      required: false,
    },
  ],
};

const LIKERT_1_5 = ["1", "2", "3", "4", "5"];
const LIKERT_AGREE_ANCHORS = { low: "1 — Strongly disagree", high: "5 — Strongly agree" };

const MINDSET_STATEMENTS = [
  "I can clearly describe the career path or type of role I'm working toward.",
  "I can tell my professional story — who I am, what I've done, where I'm headed.",
  "When I think about my next career steps, I know what to do first.",
  "I feel confident reaching out to someone I don't know to ask for a conversation or opportunity.",
  "I can talk about my value and accomplishments without downplaying them.",
  "I feel I belong in the career space I'm working toward.",
  "When I face a setback, I know how to reflect, adjust, and keep moving forward.",
  "I see myself as more than my athletic identity.",
];

const TECH_CONFIDENCE_STATEMENTS = [
  "I feel confident in my ability to learn technical material.",
  "I see myself succeeding in a tech career.",
  "I feel I belong in the tech industry.",
  "I can talk about my technical skills with someone who works in tech.",
  "I know how to keep building tech skills on my own.",
];

const ATG_MID_PROGRAM_PAGES: SurveyPage[] = [
  {
    title: "Before you start",
    subtitle: "Here's how we'll use your feedback.",
    questions: [
      {
        type: "consent",
        id: "mid_consent",
        label: "How we use your feedback",
        text: "Your answers help us make this program better and show our impact. Here's what you should know:",
        bullets: [
          "Your answers stay private.",
          'You can mark "Prefer not to say" on any question.',
          "You can ask us anytime to see your answers, change them, or delete them. Just email us at info@beyondcodecollective.org.",
        ],
        confirmLabel: "Got it — I'm ready to start.",
        required: true,
      },
    ],
  },
  {
    title: "About You",
    subtitle:
      'We collect this to share the impact of our learner community with our funders. You can mark "Prefer not to say" on any item — your choice never affects your participation.',
    questions: [
      { type: "month-year", id: "mid_date_of_birth", label: "Month and year of birth", required: true },
      {
        type: "radio",
        id: "mid_gender",
        label: "What is your gender?",
        options: ["Man", "Woman", "Non-binary", "Genderqueer / Gender non-conforming", "Transgender", "Prefer not to say", "Other"],
        required: true,
      },
      {
        type: "multi-select",
        id: "mid_race_ethnicity",
        label: "What is your race and/or ethnicity? Select all that apply.",
        options: ["American Indian or Alaska Native", "Asian", "Black or African American", "Hispanic or Latino", "Middle Eastern or North African", "Native Hawaiian or Pacific Islander", "White", "Prefer not to say", "Other"],
        required: true,
      },
      {
        type: "multi-select",
        id: "mid_languages",
        label: "What languages do you speak at home? Select all that apply.",
        options: ["English", "Spanish", "Prefer not to say", "Other"],
        required: true,
      },
      { type: "text", id: "mid_zip_code", label: "ZIP code", placeholder: "e.g. 40202", required: true, short: true },
      {
        type: "radio",
        id: "mid_education_level",
        label: "What is the highest level of education you have completed?",
        options: ["Some high school (no diploma)", "High school diploma or GED", "Some college (no degree)", "Associate degree", "Bachelor's degree", "Graduate or professional degree", "Prefer not to say"],
        required: true,
      },
      {
        type: "radio",
        id: "mid_first_gen_college",
        label: "If you started college today, would you be the first in your immediate family to attend or complete college?",
        options: ["Yes", "No", "Not applicable", "Prefer not to say"],
        required: true,
      },
      {
        type: "multi-select",
        id: "mid_employment_status",
        label: "What is your current employment status? Select all that apply.",
        options: ["Employed full-time", "Employed part-time", "Unemployed", "Looking for work", "Not currently looking for work", "Student", "Prefer not to say", "Other"],
        required: true,
      },
      {
        type: "radio",
        id: "mid_household_income",
        label: "What best describes your household income range?",
        options: ["Under $20,000", "$20,000 – $39,999", "$40,000 – $59,999", "$60,000 – $79,999", "$80,000 or more", "Prefer not to say"],
        required: true,
      },
      {
        type: "radio",
        id: "mid_disability",
        label: "Do you identify as a person with a disability? (Self-reported and voluntary — helps us keep the program accessible.)",
        options: ["Yes", "No", "Prefer not to say"],
        required: true,
      },
    ],
  },
  {
    title: "Where you started, where you are now",
    subtitle:
      "For each statement, rate yourself twice — once for BEFORE After the Game started (4 weeks ago) and once for RIGHT NOW.",
    questions: [
      {
        type: "dual-likert",
        id: "mindset_change",
        label: "Mindset, identity, and career direction",
        scale: LIKERT_1_5,
        beforeLabel: "BEFORE ATG started",
        nowLabel: "RIGHT NOW (week 4)",
        scaleAnchors: { low: "Strongly Disagree", high: "Strongly Agree" },
        statements: MINDSET_STATEMENTS,
        required: true,
      },
      {
        type: "dual-likert",
        id: "tech_confidence_change",
        label: "Tech confidence and direction",
        scale: LIKERT_1_5,
        beforeLabel: "BEFORE ATG started",
        nowLabel: "RIGHT NOW (week 4)",
        scaleAnchors: { low: "Not at all confident", high: "Very confident" },
        statements: TECH_CONFIDENCE_STATEMENTS,
        required: true,
      },
    ],
  },
  {
    title: "How the CompTIA course is going",
    subtitle: "This is about the technical learning side of ATG. (1 = Strongly disagree · 5 = Strongly agree)",
    questions: [
      {
        type: "likert",
        id: "comptia_experience",
        label: "How much do you agree with each statement?",
        scale: LIKERT_1_5,
        scaleAnchors: LIKERT_AGREE_ANCHORS,
        statements: [
          "The pace of the CompTIA course works for me.",
          "I feel supported by the CompTIA instructor.",
          "The material feels relevant to a real tech career.",
          "I am able to keep up with the work outside of class time.",
        ],
        required: true,
      },
      {
        type: "text",
        id: "comptia_most_helpful",
        label: "What part of CompTIA has been the most helpful so far?",
        placeholder: "Tell us what's been most valuable…",
        required: true,
      },
      {
        type: "text",
        id: "comptia_hardest",
        label: "What part has been hardest, confusing, or could be better?",
        placeholder: "Be candid — this is how we improve.",
        required: true,
      },
    ],
  },
  {
    title: "How the mindset & soft skills coaching is going",
    subtitle: "(1 = Strongly disagree · 5 = Strongly agree)",
    questions: [
      {
        type: "likert",
        id: "coaching_experience",
        label: "How much do you agree with each statement?",
        scale: LIKERT_1_5,
        scaleAnchors: LIKERT_AGREE_ANCHORS,
        statements: [
          "The coaching sessions feel valuable to my growth.",
          "I leave the sessions thinking differently about my career or myself.",
          "The pace and structure of the sessions work for me.",
          "I feel comfortable being honest and open in these sessions.",
        ],
        required: true,
      },
      {
        type: "text",
        id: "coaching_powerful_moment",
        label: "What's been the most powerful moment or shift from the coaching so far?",
        placeholder: "Share what's stood out…",
        required: true,
      },
      {
        type: "text",
        id: "coaching_improvement",
        label: "What would make the coaching even more useful in the second half?",
        placeholder: "Be specific — this shapes how we run the next 4 weeks.",
        required: true,
      },
    ],
  },
  {
    title: "1-on-1 coaching",
    questions: [
      {
        type: "radio",
        id: "one_on_one_rating",
        label: "How would you describe your 1:1 sessions with Ramon so far?",
        options: [
          "Extremely valuable — I look forward to them",
          "Valuable — they're helping",
          "Mixed — some sessions help more than others",
          "Not yet what I hoped — still figuring out how to use them",
          "I haven't been able to attend/haven't started",
          "Prefer not to say",
        ],
        required: true,
      },
      {
        type: "text",
        id: "one_on_one_memorable",
        label: "What's something Ramon has said or done that has stuck with you? (if applicable)",
        placeholder: "Optional — share anything that's stayed with you.",
        required: false,
      },
      {
        type: "text",
        id: "one_on_one_improvement",
        label: "What would make your 1:1 time with Ramon more useful in the second half of the program?",
        placeholder: "Be specific…",
        required: true,
      },
    ],
  },
  {
    title: "Help us adjust the second half",
    subtitle: "This is the actionable feedback section. We'll use this directly.",
    questions: [
      {
        type: "text",
        id: "want_more_of",
        label: "What is one thing you want MORE of in the second half?",
        placeholder: "Be specific…",
        required: true,
      },
      {
        type: "multi-select",
        id: "support_needed",
        label: "What kind of support would make the biggest difference for you in the next 4 weeks? Select all that apply.",
        options: [
          "More 1:1 time with a coach",
          "Peer accountability or study groups",
          "Help with exam prep/practice tests",
          "Resume or interview prep",
          "Connections to people working in tech",
          "Mental health or wellness resources",
          "Financial support information",
          "More flexibility in scheduling",
          "Other",
          "Prefer not to say",
        ],
        required: true,
      },
    ],
  },
  {
    title: "Looking Ahead",
    questions: [
      {
        type: "text",
        id: "success_end_of_program",
        label: "What does success look like for you when After the Game ends?",
        placeholder: "Be as specific as you can.",
        required: true,
      },
      {
        type: "text",
        id: "success_12_months",
        label: "What does success look like for you 12 months after this program ends?",
        placeholder: "Where do you want to be?",
        required: true,
      },
      {
        type: "text",
        id: "mid_anything_else",
        label: "Anything else you want us to know?",
        placeholder: "Optional — share anything you'd like us to know.",
        required: false,
      },
    ],
  },
];

function getSurveyPages(surveyId: string, programSlug: string): SurveyPage[] {
  if (surveyId === BCC_INTAKE_SURVEY_ID) {
    return BCC_INTAKE_PAGES;
  }
  if (surveyId === "mid-program-spring-2026" && programSlug === "atg") {
    return ATG_MID_PROGRAM_PAGES;
  }
  const finalPage = programSlug === "atg" ? ATG_FINAL_PAGE : FORGE_FINAL_PAGE;
  return [...SHARED_PAGES, finalPage];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  surveyId: string;
  programSlug: string;
  existingResponses?: Record<string, unknown> | null;
}

export function SurveyWizard({ surveyId, programSlug, existingResponses }: Props) {
  const router = useRouter();
  const storageKey = `survey-${surveyId}-progress`;
  const SURVEY_PAGES = getSurveyPages(surveyId, programSlug);

  const [page, setPage] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved).page ?? 0;
        } catch { /* ignore */ }
      }
    }
    return 0;
  });

  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    if (existingResponses) return existingResponses;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved).answers ?? {};
        } catch { /* ignore */ }
      }
    }
    return {};
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentPage = SURVEY_PAGES[page];
  const isLastPage = page === SURVEY_PAGES.length - 1;

  const saveProgress = useCallback(
    (newAnswers: Record<string, unknown>, newPage: number) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ answers: newAnswers, page: newPage })
        );
      }
    },
    [storageKey]
  );

  function updateAnswer(questionId: string, value: unknown) {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    saveProgress(updated, page);
    if (error) setError("");
  }

  function isPageValid(): boolean {
    if (!currentPage) return false;
    return validatePage(currentPage.questions, answers);
  }

  function handleNext() {
    if (!isPageValid()) {
      setError("Please answer all required questions (marked with *) before continuing.");
      return;
    }
    setError("");
    if (isLastPage) {
      handleSubmit();
    } else {
      const nextPage = page + 1;
      setPage(nextPage);
      saveProgress(answers, nextPage);
    }
  }

  function handleBack() {
    if (page > 0) {
      const prevPage = page - 1;
      setPage(prevPage);
      saveProgress(answers, prevPage);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      await saveSurveyResponse(surveyId, answers, programSlug);
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit survey");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-neutral-900">
            Page {page + 1} of {SURVEY_PAGES.length}
          </p>
          <p className="text-xs text-neutral-400">
            {Math.round(((page + 1) / SURVEY_PAGES.length) * 100)}%
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all duration-300"
            style={{
              width: `${((page + 1) / SURVEY_PAGES.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900">
          {currentPage.title}
        </h2>
        {currentPage.subtitle && (
          <p className="mt-1 text-sm text-neutral-500">
            {currentPage.subtitle}
          </p>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {currentPage.questions.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => updateAnswer(q.id, val)}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200">
        <button
          onClick={handleBack}
          disabled={page === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={submitting}
          className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : isLastPage ? (
            <>
              <Check size={16} />
              Submit
            </>
          ) : (
            <>
              Next
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
