"use client";

import { type SurveyQuestion } from "@/components/survey-fields";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// Structured questions for the CompTIA Network+ End-of-Cohort Survey.
// Mirrors the content spec in
// .context/attachments/pasted_text_2026-04-24_10-16-58.txt
//
// Page 0: consent (Q1 required + Q2 optional follow-up preference)
// Page 1: contact (name + email)
// Subsequent pages: standard QuestionsPage rendered via QuestionRenderer.
// Security+ detail page (Q25) hides when Q24 is "Probably not right now" or
// "Not interested".

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

// Bump this whenever the consent content below changes. The version is
// stored with each response so we can tell which notice a respondent agreed
// to. Keep this in sync with CONSENT_LEAD / CONSENT_BULLETS / CONSENT_FOOTER.
export const CONSENT_VERSION = "v2";

const CONSENT_LEAD =
  "Your answers help us make this program better and show our impact. Here's what you should know:";

const CONSENT_BULLETS = [
  "Your name stays private. Only the BCC team sees your name with your answers. When we share results with others, your name is removed.",
  'You can mark "Prefer not to say" on any sensitive question.',
  "To see, change, or delete your answers, email info@bccacademy.io.",
  "We keep your answers for up to 5 years so we can measure long-term impact, then we remove your name from the data.",
];

const CONSENT_FOOTER =
  "Your use of this platform is also governed by the BCC Terms of Use and Privacy Policy at wearebcc.org. Full platform-specific details at /privacy.";

const RETROSPECTIVE_CONFIDENCE_STATEMENTS = [
  "I understand core networking concepts (IP addresses, subnets, protocols).",
  "I can explain how networks work to someone who isn't technical.",
  "I feel confident troubleshooting a basic networking problem.",
  "I see myself succeeding in a tech career.",
  "I belong in this industry.",
  "I know how to keep learning new tech skills on my own.",
  "I can talk about my technical skills in a job interview.",
];

const PAGES: Page[] = [
  // Page 0 — Consent
  {
    kind: "questions",
    title: "Before you start",
    subtitle:
      "A quick note on how we use what you share — take a moment before you start.",
    questions: [
      {
        type: "consent",
        id: "consent_to_participate",
        label: "Consent",
        text: CONSENT_LEAD,
        bullets: CONSENT_BULLETS,
        footer: CONSENT_FOOTER,
        confirmLabel: "Yes, I want to take this survey.",
        required: true,
      },
      {
        type: "radio",
        id: "contact_follow_up",
        label:
          "Is it okay if BCC contacts you in the next 1–2 years to see how you're doing? (Optional)",
        options: [
          "Yes, you can contact me",
          "No, please don't contact me for follow-up",
        ],
        required: false,
      },
    ] as SurveyQuestion[],
  },

  // Page 1 — Contact (custom component handles email + name)
  { kind: "contact" },

  // Page 2 — About You
  {
    kind: "questions",
    title: "About You",
    subtitle:
      "We collect this to share the impact of our learner community with funders. You can mark \"Prefer not to say\" on any item — your choice never affects your participation.",
    questions: [
      {
        type: "month-year",
        id: "date_of_birth",
        label: "Month and year of birth",
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
        label:
          "What is your race and/or ethnicity? Select all that apply.",
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
        label:
          "What languages do you speak at home? Select all that apply.",
        options: ["English", "Spanish", "Prefer not to say", "Other"],
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
      {
        type: "radio",
        id: "education_level",
        label:
          "What is the highest level of education you have completed?",
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
        id: "first_gen_college",
        label:
          "If you started college today, would you be the first in your immediate family to attend or complete college?",
        options: ["Yes", "No", "Not applicable", "Prefer not to say"],
        required: true,
      },
      {
        type: "multi-select",
        id: "employment_status",
        label:
          "What is your current employment status? Select all that apply.",
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
        label:
          "Do you identify as a person with a disability? (Self-reported and voluntary — helps us keep the program accessible.)",
        options: ["Yes", "No", "Prefer not to say"],
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 3 — Driving Reason
  {
    kind: "questions",
    title: "Driving Reason",
    questions: [
      {
        type: "radio",
        id: "how_heard",
        label: "How did you hear about this program?",
        options: [
          "Friend, family member, or colleague",
          "Social media",
          "Employer or workforce program",
          "School, teacher, or counselor",
          "Email or newsletter",
          "Online search",
          "Other",
        ],
        required: true,
      },
      {
        type: "text",
        id: "why_enroll",
        label: "What drove you to enroll in this program?",
        placeholder: "Share what motivated you to start…",
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 4 — Looking Back (retrospective, BEFORE)
  {
    kind: "questions",
    title: "Looking back: where you started",
    subtitle:
      "Thinking back to BEFORE the program started, how would you have rated yourself? (1 = Not at all confident · 5 = Very confident)",
    questions: [
      {
        type: "likert",
        id: "confidence_before",
        label: "Rate your confidence BEFORE the program.",
        scale: LIKERT_1_5,
        scaleAnchors: {
          low: "1 — Not at all confident",
          high: "5 — Very confident",
        },
        statements: RETROSPECTIVE_CONFIDENCE_STATEMENTS,
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 5 — Right Now (retrospective, NOW)
  {
    kind: "questions",
    title: "Right now: where you are today",
    subtitle:
      "Now rate yourself on the same items as you feel RIGHT NOW. (1 = Not at all confident · 5 = Very confident)",
    questions: [
      {
        type: "likert",
        id: "confidence_now",
        label: "Rate your confidence RIGHT NOW.",
        scale: LIKERT_1_5,
        scaleAnchors: {
          low: "1 — Not at all confident",
          high: "5 — Very confident",
        },
        statements: RETROSPECTIVE_CONFIDENCE_STATEMENTS,
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 6 — Your Experience
  {
    kind: "questions",
    title: "Your experience in this program",
    subtitle:
      "Please be honest — this is how we improve. (1 = Strongly disagree · 5 = Strongly agree)",
    questions: [
      {
        type: "likert",
        id: "experience_agreement",
        label: "How much do you agree with each statement?",
        scale: LIKERT_1_5,
        scaleAnchors: {
          low: "1 — Strongly disagree",
          high: "5 — Strongly agree",
        },
        statements: [
          "The pace of the program worked for my schedule and learning style.",
          "I felt supported by the instructors and program team.",
          "The material felt relevant to real-world work.",
          "I felt a sense of belonging in this cohort.",
          "The Tech+ content gave me a strong foundation for Network+.",
        ],
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 7 — Open text: what worked, what could be better
  {
    kind: "questions",
    title: "What worked, what could be better",
    questions: [
      {
        type: "text",
        id: "most_valuable",
        label: "What was the most valuable part of this program for you?",
        placeholder: "Tell us what stood out…",
        required: true,
      },
      {
        type: "text",
        id: "most_challenging",
        label:
          "What was the most challenging part — or what could have been better?",
        placeholder: "Be candid — this is how we improve.",
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 8 — Next step
  {
    kind: "questions",
    title: "What's next",
    questions: [
      {
        type: "multi-select",
        id: "next_step_support",
        label:
          "What would help you most as a next step? Select all that apply.",
        options: [
          "Job placement help / employer connections",
          "Resume and interview prep",
          "Continued mentorship or coaching",
          "Continued learning (e.g., Security+, Cloud, etc.)",
          "Networking events or community connections",
          "Help with exam prep",
          "Financial support information",
          "Other",
        ],
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 9 — Security+ interest
  {
    kind: "questions",
    title: "Looking ahead: CompTIA Security+",
    questions: [
      {
        type: "radio",
        id: "securityplus_interest",
        label: "How interested are you in continuing to CompTIA Security+ next?",
        options: [
          "Very interested — count me in",
          "Somewhat interested — I'd want to know more first",
          "Undecided — depends on timing",
          "Probably not right now",
          "Not interested",
        ],
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 10 — Security+ factors (conditional)
  {
    kind: "questions",
    title: "If we offered Security+",
    subtitle: "What would matter most to you? Select all that apply.",
    showIf: (a) =>
      a.securityplus_interest !== "Probably not right now" &&
      a.securityplus_interest !== "Not interested",
    questions: [
      {
        type: "multi-select",
        id: "securityplus_factors",
        label: "What would matter most to you?",
        options: [
          "Schedule flexibility",
          "Same instructors / same cohort feel",
          "Clear path to a job after",
          "Scholarship or financial support",
          "Time gap between Network+ and Security+",
        ],
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 11 — Last few
  {
    kind: "questions",
    title: "Last few questions",
    questions: [
      {
        type: "likert",
        id: "recommend_bcc",
        label:
          "How likely are you to recommend Beyond Code Collective to someone you know?",
        scale: LIKERT_1_5,
        scaleAnchors: {
          low: "1 — Not at all likely",
          high: "5 — Extremely likely",
        },
        statements: ["Likelihood to recommend"],
        required: true,
      },
      {
        type: "text",
        id: "thirty_day_change",
        label:
          "In the past 30 days, what's one specific thing you did differently because of this program? (A behavior, a conversation, a habit — anything concrete.)",
        placeholder: "Something concrete…",
        required: true,
      },
      {
        type: "text",
        id: "anything_else",
        label:
          "Anything else you'd like us to know — about your experience, your goals, or what would help you succeed?",
        placeholder: "Optional — share anything you'd like us to know.",
        required: false,
      },
    ] as SurveyQuestion[],
  },
];

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicNetworkPlusSurvey({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      contactTitle="A few quick basics"
      contactSubtitle="So we can tie this response to your record and follow up if you opt in."
      successTitle="Thank you."
      successBody="What you shared helps shape what comes next — for you and for the people coming after you."
    />
  );
}
