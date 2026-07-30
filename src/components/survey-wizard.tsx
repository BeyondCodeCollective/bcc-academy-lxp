"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { saveSurveyResponse } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";
import {
  QuestionRenderer,
  isPageValid as validatePage,
  US_STATES,
  type SurveyQuestion,
} from "@/components/survey-fields";

type SurveyPage = {
  title: string;
  subtitle?: string;
  questions: SurveyQuestion[];
};

import { BCC_INTAKE_SURVEY_ID } from "@/lib/surveys/platform";
// Shared with the analytics schema so the form and the dashboard measure the
// same statements, word for word.
import {
  DIGITAL_EXPERIENCE_STATEMENTS,
  AI_EXPERIENCE_STATEMENTS,
} from "@/lib/surveys/schemas";

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
        zip: true,
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
          "To see, change, or delete your answers, email info@bccacademy.io.",
          "Your answers stay private and are never shared individually.",
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
          "To see, change, or delete your answers, email info@bccacademy.io.",
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
          "To see, change, or delete your answers, email info@bccacademy.io.",
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
      { type: "text", id: "mid_zip_code", label: "ZIP code", placeholder: "e.g. 40202", required: true, zip: true },
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
      "For each statement, rate yourself twice — once for BEFORE Beyond the Game started (4 weeks ago) and once for RIGHT NOW.",
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
        label: "What does success look like for you when Beyond the Game ends?",
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

// ─── Forge AI Fundamentals Post-Survey ───────────────────────────────────────
//
// End-of-program survey for the three Forge AI Fundamentals cohorts. Reuses
// the exact `digital_experience` and `ai_experience` Likert ids from the
// pre-survey so the dashboard can pair pre→post per student and compute true
// confidence deltas without asking respondents to recall their "before" state.

// ─── AI Fundamentals — Program Impact Survey (single sitting) ────────────────
//
// The pre→post pair needed two sittings months apart and got 9 of 9 then 1 of
// 9, so the cohort had no reportable outcome. This asks the same statements
// once, rating BEFORE and NOW side by side, the way ATG's mid-program check-in
// does (4 of 4). Statements come from schemas.ts so the form a learner fills in
// and the schema Insights reads can't drift apart.
const AI_IMPACT_PAGES: SurveyPage[] = [
  {
    title: "Before you start",
    subtitle: "A quick note on how we use what you share.",
    questions: [
      {
        type: "consent",
        id: "impact_consent",
        label: "Why we ask",
        text: "Your answers help us measure how the program landed and improve future cohorts. Here's what you should know:",
        bullets: [
          "Your answers stay private.",
          'You can mark "Prefer not to say" on any question.',
          "To see, change, or delete your answers, email info@bccacademy.io.",
        ],
        confirmLabel: "Got it — I'm ready to start.",
        required: true,
      },
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
    ],
  },
  {
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
    ],
  },
  {
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
    ],
  },
  {
    title: "In your own words",
    questions: [
      {
        type: "text",
        id: "post_new_skill",
        label: "What is something you can do now that you couldn't do before this program?",
        placeholder: "Tell us what stood out…",
        required: true,
      },
      {
        type: "radio",
        id: "post_taught_others",
        label:
          "Did you have a chance to share or teach what you learned to someone else — like a family member or friend?",
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
        label: "How do you feel about working in a career that involves technology?",
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
        placeholder:
          "Is there a skill, topic, or type of support you wish the program had included?",
        required: false,
      },
    ],
  },
];

const FORGE_POST_SURVEY_PAGES: SurveyPage[] = [
  {
    title: "Before you start",
    subtitle: "A quick note on how we use what you share.",
    questions: [
      {
        type: "consent",
        id: "post_consent",
        label: "Why we ask",
        text: "Your answers help us measure how the program landed and improve future cohorts. Here's what you should know:",
        bullets: [
          "Your answers stay private.",
          'You can mark "Prefer not to say" on any question.',
          "To see, change, or delete your answers, email info@bccacademy.io.",
        ],
        confirmLabel: "Got it — I'm ready to start.",
        required: true,
      },
      {
        type: "date",
        id: "post_today_date",
        label: "Today's date",
        max: new Date().toISOString().split("T")[0],
        required: true,
      },
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
    ],
  },
  {
    title: "AI Experience",
    subtitle:
      "These questions help us understand your current understanding of AI.",
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
    ],
  },
  {
    title: "Post-Program Reflection",
    questions: [
      {
        type: "text",
        id: "post_new_skill",
        label: "What is something you can do now that you couldn't do before this program?",
        placeholder: "Tell us what stood out…",
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
          "Did you have a chance to share or teach what you learned to someone else — like a family member or friend?",
        options: [
          "Yes — I taught or shared something with someone",
          "I tried, but it was hard to explain",
          "Not yet, but I want to",
          "No",
        ],
        required: true,
      },
      {
        type: "text",
        id: "post_more_help",
        label: "Do you want more help with anything?",
        placeholder:
          "Is there a skill, topic, or type of support you wish the program had included?",
        required: false,
      },
      {
        type: "radio",
        id: "post_recommend",
        label: "Would you recommend this program to someone else?",
        options: ["Yes", "Maybe", "No"],
        required: true,
      },
      {
        type: "radio",
        id: "post_career_interest",
        label: "How do you feel about working in a career that involves technology?",
        options: [
          "More interested than before",
          "I was already interested and still am",
          "About the same",
          "Less interested than before",
        ],
        required: true,
      },
    ],
  },
];

// ─── Security+ Application ────────────────────────────────────────────────────

const SECURITY_PLUS_APPLICATION_PAGES: SurveyPage[] = [
  {
    title: "Your Information",
    questions: [
      {
        type: "text",
        id: "full_name",
        label: "Full name",
        placeholder: "e.g. Jordan Smith",
        required: true,
        short: true,
      },
    ],
  },
  {
    title: "Where You Are Now",
    subtitle: "These questions tell us about your current work life so we can build the right support around the cohort.",
    questions: [
      {
        type: "text",
        id: "work_situation",
        label: "What is your current work situation?",
        placeholder: "E.g., employed full-time, employed part-time, actively looking, freelancing, juggling more than one of these.",
        required: true,
      },
      {
        type: "text",
        id: "industry",
        label: "What industry do you currently work in (or most recently worked in)?",
        placeholder: "E.g., technology, hospitality, government. If you've had recent shifts, list the one most relevant to where you're heading.",
        required: true,
      },
      {
        type: "text",
        id: "tech_in_role",
        label: "In your current or most recent role, do you work with technology directly? Briefly describe the title and work you're doing.",
        placeholder: "This helps us understand how close you already are to a tech-adjacent role.",
        required: true,
      },
      {
        type: "text",
        id: "used_comptia_at_work",
        label: "In your current or most recent role, have you had to use what you've learned through the CompTIA program?",
        placeholder: "This helps us understand how close you already are to a tech-adjacent role.",
        required: true,
      },
    ],
  },
  {
    title: "What's Next for You",
    subtitle: "We want to know what direction you're moving in so the cohort can be designed to support real career outcomes.",
    questions: [
      {
        type: "text",
        id: "job_switch_plan",
        label: "Are you looking to switch jobs or employers in the next 6–12 months?",
        placeholder: "If yes, describe the kind of role and/or employer you're targeting. If no, what's keeping you where you are?",
        required: true,
      },
      {
        type: "text",
        id: "security_plus_in_career",
        label: "How do you see Security+ fitting into your career?",
        placeholder: "A promotion in your current role, a pivot into a new field, a specific job title you're aiming for — paint us the picture.",
        required: true,
      },
    ],
  },
  {
    title: "Why Security+, Why Now",
    questions: [
      {
        type: "radio",
        id: "heard_about_program",
        label: "How did you hear about this program?",
        options: [
          "Clark University",
          "Black Girls Code",
          "Beyond Code Collective",
          "Other",
        ],
        required: true,
      },
      {
        type: "text",
        id: "heard_about_program_other",
        label: "If you chose Other, where did you hear about us? (Optional)",
        required: false,
        short: true,
      },
      {
        type: "text",
        id: "why_techplus_network_plus",
        label: "Why did you originally sign up for Tech+ and then Network+? Has anything changed about your goals since then?",
        required: true,
      },
      {
        type: "text",
        id: "cybersecurity_interests",
        label: "What about cybersecurity interests you most?",
        placeholder: "E.g., SOC analyst work, incident response, governance/risk/compliance, cloud security, ethical hacking. \"Not sure yet\" is a valid answer.",
        required: true,
      },
    ],
  },
  {
    title: "Your Commitment",
    subtitle: "We want to be upfront: this program asks for real time and energy. This cohort runs approximately 12 weeks, with an estimated 6-8 hours per week including instructor-led technology sessions, coursework, coaching, and additional wraparound support.",
    questions: [
      {
        type: "text",
        id: "schedule_july_completion",
        label: "What does your schedule look like from July through completion?",
        placeholder: "Are there obligations we should know about — work, caregiving, other programs, travel, school?",
        required: true,
      },
      {
        type: "text",
        id: "support_needed",
        label: "What kind of support do you need from us to be successful?",
        placeholder: "E.g., mentorship, exam prep, job placement, study group, accessibility accommodations, financial support.",
        required: true,
      },
    ],
  },
  {
    title: "Anything Else",
    questions: [
      {
        type: "text",
        id: "anything_else",
        label: "Is there anything else you want us to know about you or your application? (Optional)",
        required: false,
      },
    ],
  },
];

// ─── Home for the Summer — Application ──────────────────────────────────────
// Beyond Code Collective x NextEra Energy. Five 90-minute virtual sessions,
// August 10–14, 2026. Mirrors the flat schema in lib/surveys/schemas.ts — keep
// the two in sync or admin Survey Insights mislabels the response JSON.
const HOME_FOR_SUMMER_APPLICATION_PAGES: SurveyPage[] = [
  {
    title: "Your Information",
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
        type: "text",
        id: "phone",
        label: "Phone number",
        placeholder: "e.g. (555) 123-4567",
        required: true,
        short: true,
      },
      {
        type: "radio",
        id: "student_status",
        label: "Are you currently a student or recent graduate?",
        options: [
          "Current undergraduate student",
          "Recently graduated (within the last two years)",
          "Other",
        ],
        required: true,
      },
      {
        type: "text",
        id: "student_status_other",
        label: "If you chose Other, please specify",
        required: false,
        short: true,
      },
      {
        type: "text",
        id: "university",
        label: "Current university / college (or most recent, if you recently graduated)",
        required: true,
        short: true,
      },
      {
        type: "month-year",
        id: "graduation_date",
        // Applicants are current undergrads or grads from the last two years,
        // so the date is usually in the future — the default range ends at the
        // current year and would make those unselectable.
        minYear: 2022,
        maxYear: 2031,
        label: "Expected or actual graduation date",
        required: true,
      },
      {
        type: "text",
        id: "major",
        label: "Major / field of study",
        required: true,
        short: true,
      },
    ],
  },
  {
    title: "Eligibility & Commitment",
    subtitle:
      "Home for the Summer runs August 10–14, 2026 — five virtual sessions, 90 minutes each day.",
    questions: [
      {
        type: "text",
        id: "age",
        label: "Your age",
        required: true,
        short: true,
      },
      {
        type: "select",
        id: "state",
        label: "State",
        options: US_STATES,
        placeholder: "Select your state",
        required: true,
      },
      {
        type: "text",
        id: "zip_code",
        label: "ZIP code",
        placeholder: "e.g. 33101",
        zip: true,
        required: true,
      },
      {
        type: "radio",
        id: "computer_internet_access",
        label: "Do you have access to a computer or laptop and reliable internet access?",
        options: ["Yes", "No"],
        required: true,
      },
      {
        type: "radio",
        id: "available_all_sessions",
        label:
          "Are you available for all five virtual sessions, August 10–14, 2026 (11:00 AM–12:30 PM ET, 90 minutes each)?",
        options: ["Yes", "No"],
        required: true,
      },
    ],
  },
  {
    title: "Professional Goals",
    subtitle:
      "No prior technical experience is expected. This series assumes curiosity, not expertise.",
    questions: [
      {
        type: "text",
        id: "career_goals",
        label:
          "What career goals are you working toward, and which skills or areas do you feel you need to develop to reach them?",
        required: true,
      },
      // Was a "paste a shareable link" text field. Sharing permissions are the
      // usual failure mode there — the link arrives and staff can't open it,
      // and nobody finds out until someone tries. An attached file can't be
      // permission-locked.
      {
        type: "file",
        id: "resume_file",
        kind: "home-for-summer",
        label: "Upload your resume",
        hint: "Optional, but it helps us understand where you are in your journey.",
        required: false,
      },
      {
        type: "multi-select",
        id: "tech_interests",
        label: "What areas of tech are you interested in? Select all that apply.",
        options: [
          "Artificial Intelligence",
          "Cyber Security",
          "Data & Analytics",
          "Software Development",
          "UX/UI Design",
          "Project Management & Operations",
          "Digital Marketing & Content",
          "Other",
        ],
        required: true,
      },
      {
        type: "text",
        id: "tech_interests_other",
        label: "If you chose Other, which area of tech? (Optional)",
        required: false,
        short: true,
      },
      {
        type: "multi-select",
        id: "workplace_tools",
        label: "Which workplace tools have you used before? Select all that apply.",
        options: [
          "Google Workspace",
          "Microsoft 365",
          "Slack",
          "Notion",
          "Asana",
          "Zoom/Loom",
          "AI tools (ChatGPT, Claude, etc.)",
          "None of the above",
        ],
        required: true,
      },
    ],
  },
  {
    title: "Anything Else",
    questions: [
      {
        type: "text",
        id: "anything_else",
        label: "Is there anything else you want us to know about you or your application? (Optional)",
        required: false,
      },
      {
        type: "radio",
        id: "heard_about_program",
        label: "How did you hear about Home for the Summer?",
        options: [
          "Social media",
          "University/college",
          "Friend or peer",
          "Beyond Code Collective Community",
          "Other",
        ],
        required: true,
      },
      {
        type: "text",
        id: "heard_about_program_other",
        label: "If you chose Other, where did you hear about us? (Optional)",
        required: false,
        short: true,
      },
    ],
  },
];

// ─── CompTIA Security+ — Pre-Program Survey ─────────────────────────────────
const SECURITY_PLUS_PRE_PAGES: SurveyPage[] = [
  {
    title: "Welcome",
    subtitle:
      "This survey is not a test. We want to understand where you are right now — your confidence, your goals, and what you need from this program — so we can support you from the start. Your answers are private and used only to improve the program and report our impact.",
    questions: [
      {
        type: "consent",
        id: "acknowledgment",
        label: "Acknowledgment",
        text: "By completing this survey, you agree to allow Beyond Code Collective to use your anonymous responses for program reporting and improvement.",
        bullets: ["Your answers stay private — used only to improve the program and report our impact."],
        confirmLabel: "I understand and agree to participate.",
        required: true,
      },
    ],
  },
  {
    title: "A few basics",
    questions: [
      { type: "text", id: "full_name", label: "Full name", placeholder: "e.g. Jordan Smith", required: true, short: true },
      { type: "text", id: "email", label: "Email address", placeholder: "you@example.com", required: true, short: true },
      {
        type: "multi-select",
        id: "employment_status",
        label: "What is your current employment status? Select all that apply.",
        options: ["Employed full-time", "Employed part-time", "Unemployed", "Looking for work", "Student", "Other"],
        required: true,
      },
      { type: "text", id: "industry", label: "What industry do you currently work in, or most recently worked in?", placeholder: "e.g. Retail, Healthcare, Logistics…", required: true, short: true },
    ],
  },
  {
    title: "Tech Confidence",
    subtitle:
      "Mark how much you agree right now. There are no right or wrong answers — this is your honest starting point. We will ask these again at mid-program and at the end to measure your growth.",
    questions: [
      {
        type: "likert",
        id: "tech_confidence",
        label: "Tech Confidence",
        scale: ["1", "2", "3", "4", "5"],
        scaleAnchors: { low: "1 — Strongly Disagree", high: "5 — Strongly Agree" },
        statements: [
          "I feel confident in my ability to learn technical material.",
          "I see myself succeeding in a tech career.",
          "I belong in the tech industry.",
          "I can talk about my technical skills with someone who works in tech.",
          "I know how to keep learning tech skills on my own.",
          "When I face a hard challenge, I stay with it instead of giving up.",
        ],
        required: true,
      },
    ],
  },
  {
    title: "Security+ Knowledge Baseline",
    subtitle:
      "How familiar are you with each of these right now? You are not expected to know all of this yet. Be honest — this is not graded.",
    questions: [
      {
        type: "likert",
        id: "security_baseline",
        label: "Security+ Knowledge Baseline",
        scale: ["1", "2", "3", "4", "5"],
        scaleAnchors: { low: "1 — No familiarity", high: "5 — I can apply it" },
        pointLabels: ["No familiarity", "Heard of it", "Understand the basics", "Can explain it", "Can apply it"],
        statements: [
          "Network security fundamentals (firewalls, ports, protocols)",
          "Threat types and attack vectors (phishing, malware, ransomware)",
          "Identity and access management (authentication, authorization)",
          "Risk management and compliance frameworks",
          "Cryptography and PKI basics",
          "Incident response and security operations",
          "Cloud security concepts",
        ],
        required: true,
      },
      {
        type: "radio",
        id: "network_plus_status",
        label: "Have you studied for or taken the CompTIA Network+ exam?",
        options: ["Yes — passed", "Yes — studied but not yet tested", "No, but I have equivalent experience", "No prior exposure"],
        required: true,
      },
      {
        type: "text",
        id: "cyber_challenge",
        label: "What have you found most challenging about cybersecurity concepts so far? If this is your first time, what do you expect might be hard?",
        placeholder: "Share your thoughts…",
        required: true,
      },
    ],
  },
  {
    title: "Career Direction",
    questions: [
      {
        type: "likert",
        id: "career_direction",
        label: "Career Direction",
        scale: ["1", "2", "3", "4", "5"],
        scaleAnchors: { low: "1 — Strongly Disagree", high: "5 — Strongly Agree" },
        statements: [
          "I can clearly describe the career path or type of role I am working toward.",
          "I can tell my professional story — who I am, what I have done, where I am headed.",
          "When I think about my next career steps, I know what to do first.",
          "I feel confident reaching out to someone I do not know to ask for a conversation or opportunity.",
          "I believe I belong in the career space I am working toward.",
        ],
        required: true,
      },
      {
        type: "text",
        id: "target_role",
        label: "Do you know what role or type of work you are aiming for after this program? Examples: SOC analyst, IT support, security engineer, GRC, cloud security, federal/government IT. \"Not sure yet\" is a valid answer.",
        placeholder: "Share your thoughts…",
        required: true,
      },
      {
        type: "text",
        id: "success_definition",
        label: "What does success look like for you when this program ends?",
        placeholder: "Share your thoughts…",
        required: true,
      },
    ],
  },
  {
    title: "Mindset & Professional Identity",
    subtitle:
      "This is about how you see yourself as a professional right now. It connects to the MASS (Mindset and Soft Skills) coaching component led by Angel.",
    questions: [
      {
        type: "likert",
        id: "mindset_identity",
        label: "Mindset & Professional Identity",
        scale: ["1", "2", "3", "4", "5"],
        scaleAnchors: { low: "1 — Strongly Disagree", high: "5 — Strongly Agree" },
        statements: [
          "I have a clear sense of my professional identity and what I bring to the table.",
          "I can talk about my value and accomplishments without downplaying them.",
          "When I hit a setback, I know how to reflect, adjust, and keep moving.",
          "I feel comfortable asking for help or support when I need it.",
          "I see a version of myself thriving in a professional environment.",
        ],
        required: true,
      },
      {
        type: "text",
        id: "mindset_focus",
        label: "Is there anything about your mindset, habits, or professional identity you want to work on during this program?",
        placeholder: "Optional",
        required: false,
      },
    ],
  },
  {
    title: "Community & Connection",
    subtitle:
      "This is about how connected you feel to professional networks and communities right now. It connects to the Community component led by Stephanie.",
    questions: [
      {
        type: "likert",
        id: "community_connection",
        label: "Community & Connection",
        scale: ["1", "2", "3", "4", "5"],
        scaleAnchors: { low: "1 — Strongly Disagree", high: "5 — Strongly Agree" },
        statements: [
          "I have a professional network I can draw on for advice or opportunities.",
          "I feel connected to a community of people working in or toward tech careers.",
          "I know how to build professional relationships in spaces I am new to.",
          "I am comfortable showing up in spaces — events, groups, platforms — where I do not yet know people.",
        ],
        required: true,
      },
      {
        type: "text",
        id: "community_meaning",
        label: "What does community mean to you in the context of your career?",
        placeholder: "Optional",
        required: false,
      },
    ],
  },
  {
    title: "Last question",
    questions: [
      {
        type: "text",
        id: "most_need",
        label: "What is the one thing you most need from this program to be successful?",
        placeholder: "Share your thoughts…",
        required: true,
      },
    ],
  },
];

// ─── CompTIA Security+ Midpoint Check-In ──────────────────────────────────────
// One page, four questions, taken in the last few minutes of class at the
// halfway mark. No consent page and no contact page: everyone answering is an
// enrolled learner who is already signed in, and the response saves against
// their account.

const SECURITY_PLUS_MIDPOINT_PAGES: SurveyPage[] = [
  {
    title: "Halfway there",
    subtitle:
      "You're at the midpoint of Security+. Before we head into the back half, we want to hear how it's actually going for you. This is a check-in, not a test. There's no grade attached and nothing here affects your standing in the program. We share what we're hearing with your instructor as themes, not as a list of who said what.",
    questions: [
      {
        type: "text",
        id: "working_well",
        label: "What's working for you so far?",
        placeholder:
          "A topic that finally clicked, the labs, how class runs, the pace, your study group. Whatever you'd keep.",
        required: true,
      },
      {
        type: "text",
        id: "would_change",
        label: "What would you change if it were up to you?",
        placeholder:
          "Be straight with us. Nothing is too small, and there's still time to act on it.",
        required: true,
      },
      {
        type: "text",
        id: "most_helpful_next",
        label:
          "What's the one thing that would help you most between now and the exam?",
        placeholder:
          "More lab time, a review session on a specific domain, practice questions, someone to study with. Name the one thing.",
        required: true,
      },
      {
        // Every learner in this cohort answered "studied but not yet tested" for
        // Network+ on the pre-survey — 15 of 15 — so the exam is still ahead of
        // all of them. Structured options rather than free text so the admin can
        // see the distribution and chase the "not sure yet" group.
        type: "radio",
        id: "network_plus_exam_timing",
        label: "When do you plan to take your Network+ exam?",
        options: [
          "I've already taken it",
          "It's scheduled — I have a date",
          "Within the next month",
          "One to three months from now",
          "After I finish Security+",
          "I'm not sure yet",
        ],
        required: true,
      },
      {
        type: "likert",
        id: "exam_confidence",
        label: "Right now, how are you feeling about the exam?",
        scale: ["1", "2", "3", "4", "5"],
        scaleAnchors: { low: "1 — Not ready yet", high: "5 — I've got this" },
        statements: ["My confidence about passing the Security+ exam"],
        required: true,
      },
    ],
  },
];

function getSurveyPages(surveyId: string, programSlug: string): SurveyPage[] {
  if (surveyId === "security-plus-midpoint") {
    return SECURITY_PLUS_MIDPOINT_PAGES;
  }
  if (surveyId === "comptia-security-pre") {
    return SECURITY_PLUS_PRE_PAGES;
  }
  if (surveyId === BCC_INTAKE_SURVEY_ID) {
    return BCC_INTAKE_PAGES;
  }
  if (surveyId === "security-plus-application") {
    return SECURITY_PLUS_APPLICATION_PAGES;
  }
  if (surveyId === "home-for-summer-application") {
    return HOME_FOR_SUMMER_APPLICATION_PAGES;
  }
  if (surveyId === "mid-program-spring-2026" && programSlug === "atg") {
    return ATG_MID_PROGRAM_PAGES;
  }
  if (surveyId === "post-survey-spring-2026" && programSlug === "catalyst") {
    return FORGE_POST_SURVEY_PAGES;
  }
  // No programSlug condition: this survey belongs to AI Fundamentals wherever
  // it's opened from (Catalyst aggregates Beyond Code Centers' courses). Without
  // an explicit branch it would fall through to SHARED_PAGES — the PRE-survey
  // questions under an impact-survey title.
  if (surveyId === "ai-impact-survey-2026") {
    return AI_IMPACT_PAGES;
  }
  const finalPage = programSlug === "atg" ? ATG_FINAL_PAGE : FORGE_FINAL_PAGE;
  return [...SHARED_PAGES, finalPage];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  surveyId: string;
  programSlug: string;
  existingResponses?: Record<string, unknown> | null;
  /** Pre-filled answers (e.g. name/email from the account) — fully editable. */
  initialAnswers?: Record<string, unknown>;
  /** Logged-in user id. Used to scope localStorage so a previous user's
   *  unsubmitted progress on a shared device doesn't bleed into a new
   *  user's session. */
  userId?: string;
  /** Custom submit handler for public (unauthenticated) forms. When provided,
   *  called instead of saveSurveyResponse. The parent is responsible for
   *  rendering the post-submit state. */
  onSubmit?: (answers: Record<string, unknown>) => Promise<void>;
}

export function SurveyWizard({ surveyId, programSlug, existingResponses, userId, onSubmit, initialAnswers }: Props) {
  const router = useRouter();
  const storageKey = userId
    ? `survey-${surveyId}-${userId}-progress`
    : `survey-${surveyId}-progress`;
  const SURVEY_PAGES = getSurveyPages(surveyId, programSlug);

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
    // No saved/existing answers yet → seed with any server-provided prefill
    // (account name/email, mapped intake fields). Fully editable by the learner.
    return initialAnswers ?? {};
  });

  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return 0;
    try {
      const { page: savedPage, answers: savedAnswers } = JSON.parse(saved) as {
        page?: number;
        answers?: Record<string, unknown>;
      };
      if (!savedPage || savedPage <= 0) return 0;
      // Only restore the page if every preceding page has valid answers.
      // Guards against navigating forward without answering and then resuming
      // at a page where required questions are unanswered.
      const effectiveAnswers = existingResponses ?? savedAnswers ?? {};
      for (let i = 0; i < savedPage && i < SURVEY_PAGES.length; i++) {
        if (!validatePage(SURVEY_PAGES[i].questions, effectiveAnswers)) return i;
      }
      return Math.min(savedPage, SURVEY_PAGES.length - 1);
    } catch { return 0; }
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
      if (onSubmit) {
        await onSubmit(answers);
        if (typeof window !== "undefined") localStorage.removeItem(storageKey);
        // parent handles post-submit state
      } else {
        await saveSurveyResponse(surveyId, answers, programSlug);
        if (typeof window !== "undefined") localStorage.removeItem(storageKey);
        router.refresh();
      }
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
          <p className="text-sm font-medium text-ink">
            Page {page + 1} of {SURVEY_PAGES.length}
          </p>
          <p className="text-xs text-ink-faint">
            {Math.round(((page + 1) / SURVEY_PAGES.length) * 100)}%
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden bg-paper-tint">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${((page + 1) / SURVEY_PAGES.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-ink">
          {currentPage.title}
        </h2>
        {currentPage.subtitle && (
          <p className="mt-1 text-sm text-ink-soft">
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
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-rule">
        <button
          onClick={handleBack}
          disabled={page === 0}
          className="inline-flex items-center gap-1 border border-rule px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-tint-soft disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={submitting}
          className="inline-flex items-center gap-1 bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
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
