"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import {
  QuestionRenderer,
  isPageValid as validatePage,
  type SurveyQuestion,
} from "@/components/survey-fields";
import { savePublicSurveyResponse } from "./actions";

// Structured questions for the CompTIA Network+ End-of-Cohort Survey.
// Mirrors the content spec in
// .context/attachments/pasted_text_2026-04-24_10-16-58.txt
//
// Page 0: consent (Q1 required + Q2 optional follow-up preference)
// Page 1: contact (name + email)
// Subsequent pages: standard QuestionsPage rendered via QuestionRenderer.
// Security+ detail page (Q25) hides when Q24 is "Probably not right now" or
// "Not interested".

type QuestionsPage = {
  kind: "questions";
  title: string;
  subtitle?: string;
  questions: SurveyQuestion[];
  showIf?: (answers: Record<string, unknown>) => boolean;
};

type Page = { kind: "contact" } | QuestionsPage;

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

// Bump this whenever the consent text below changes. The version is stored
// with each response so we can tell which notice a respondent agreed to.
export const CONSENT_VERSION = "v2";

const CONSENT_TEXT =
  "Your answers help us make this program better and show our impact. " +
  "Your name stays private — only the BCC team sees your name with your answers, and when we share results with others, your name is removed. " +
  "You can mark \"Prefer not to say\" on any sensitive question. " +
  "You can email info@beyondcodecollective.org anytime to see, change, or delete your answers. " +
  "We keep your answers for up to 5 years so we can measure long-term impact, then we remove your name from the data. " +
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
        text: CONSENT_TEXT,
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
    ],
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
        label: "First 3 digits of your ZIP code",
        placeholder: "e.g. 402",
        required: true,
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
    ],
  },

  // Page 3 — Driving Reason
  {
    kind: "questions",
    title: "Driving Reason",
    questions: [
      {
        type: "text",
        id: "why_enroll",
        label: "What drove you to enroll in this program?",
        placeholder: "Share what motivated you to start…",
        required: true,
      },
    ],
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
    ],
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
    ],
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
    ],
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
    ],
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
    ],
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
    ],
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
    ],
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
    ],
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicNetworkPlusSurvey({ surveyId, programSlug }: Props) {
  const storageKey = `public-survey-${programSlug}-${surveyId}`;

  const initialState = useMemo(() => {
    if (typeof window === "undefined")
      return {
        page: 0,
        answers: {} as Record<string, unknown>,
        email: "",
        fullName: "",
      };
    const saved = window.localStorage.getItem(storageKey);
    if (!saved)
      return {
        page: 0,
        answers: {} as Record<string, unknown>,
        email: "",
        fullName: "",
      };
    try {
      const parsed = JSON.parse(saved) as {
        page?: number;
        answers?: Record<string, unknown>;
        email?: string;
        fullName?: string;
      };
      return {
        page: parsed.page ?? 0,
        answers: parsed.answers ?? {},
        email: parsed.email ?? "",
        fullName: parsed.fullName ?? "",
      };
    } catch {
      return {
        page: 0,
        answers: {} as Record<string, unknown>,
        email: "",
        fullName: "",
      };
    }
  }, [storageKey]);

  const [page, setPage] = useState(initialState.page);
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    initialState.answers,
  );
  const [email, setEmail] = useState(initialState.email);
  const [fullName, setFullName] = useState(initialState.fullName);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const visiblePages = useMemo(() => {
    return PAGES.filter((p) => {
      if (p.kind !== "questions") return true;
      if (!p.showIf) return true;
      return p.showIf(answers);
    });
  }, [answers]);

  const currentPage = visiblePages[page];
  const isLastPage = page === visiblePages.length - 1;

  const persist = useCallback(
    (next: {
      page?: number;
      answers?: Record<string, unknown>;
      email?: string;
      fullName?: string;
    }) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          page: next.page ?? page,
          answers: next.answers ?? answers,
          email: next.email ?? email,
          fullName: next.fullName ?? fullName,
        }),
      );
    },
    [storageKey, page, answers, email, fullName],
  );

  function updateAnswer(id: string, val: unknown) {
    const updated = { ...answers, [id]: val };
    setAnswers(updated);
    persist({ answers: updated });
  }

  function contactPageValid(): boolean {
    return EMAIL_RE.test(email.trim()) && fullName.trim().length > 0;
  }

  function isCurrentValid(): boolean {
    if (!currentPage) return false;
    if (currentPage.kind === "contact") return contactPageValid();
    return validatePage(currentPage.questions, answers);
  }

  function handleNext() {
    if (!isCurrentValid()) return;
    if (isLastPage) {
      submit();
      return;
    }
    const next = page + 1;
    setPage(next);
    persist({ page: next });
  }

  function handleBack() {
    if (page === 0) return;
    const prev = page - 1;
    setPage(prev);
    persist({ page: prev });
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const result = await savePublicSurveyResponse({
        programSlug,
        surveyType: surveyId,
        email: email.trim(),
        fullName: fullName.trim(),
        consentVersion: CONSENT_VERSION,
        responses: answers,
      });
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to submit. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 pb-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E54D2E]/10">
            <Check className="h-6 w-6 text-[#E54D2E]" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Thank you.</h2>
          <p className="mt-2 text-sm text-neutral-600">
            What you shared helps shape what comes next — for you and for the
            people coming after you.
          </p>
          <p className="mt-4 text-xs text-neutral-500">
            Change your mind?{" "}
            <a
              href="/privacy/withdraw"
              className="font-medium text-neutral-700 underline hover:text-neutral-900"
            >
              Remove my response
            </a>
            .
          </p>
        </div>
        <FooterLinks />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-neutral-900">
            Page {page + 1} of {visiblePages.length}
          </p>
          <p className="text-xs text-neutral-600">
            {Math.round(((page + 1) / visiblePages.length) * 100)}%
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Survey progress"
          aria-valuenow={page + 1}
          aria-valuemin={1}
          aria-valuemax={visiblePages.length}
          aria-valuetext={`Page ${page + 1} of ${visiblePages.length}`}
          className="h-2 w-full overflow-hidden rounded-full bg-neutral-100"
        >
          <div
            className="h-full rounded-full bg-[#1a1a1a] transition-all duration-300"
            style={{
              width: `${((page + 1) / visiblePages.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {currentPage?.kind === "contact" ? (
        <ContactPage
          email={email}
          fullName={fullName}
          onEmailChange={(v) => {
            setEmail(v);
            persist({ email: v });
          }}
          onFullNameChange={(v) => {
            setFullName(v);
            persist({ fullName: v });
          }}
        />
      ) : currentPage ? (
        <QuestionsPageView
          page={currentPage}
          answers={answers}
          onChange={updateAnswer}
        />
      ) : null}

      <p
        role="alert"
        aria-live="assertive"
        className={`mt-4 text-sm text-red-600 ${error ? "" : "sr-only"}`}
      >
        {error}
      </p>

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
          disabled={!isCurrentValid() || submitting}
          className="inline-flex items-center gap-1 rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
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
      <FooterLinks />
    </div>
  );
}

function FooterLinks() {
  return (
    <div className="mt-8 flex items-center justify-center gap-3 text-xs text-neutral-600">
      <a
        href="https://www.wearebcc.org/en/terms"
        className="hover:text-neutral-600"
        target="_blank"
        rel="noopener noreferrer"
      >
        Terms
      </a>
      <span aria-hidden>·</span>
      <a href="/privacy" className="hover:text-neutral-600">
        Privacy
      </a>
      <span aria-hidden>·</span>
      <a href="/privacy/withdraw" className="hover:text-neutral-600">
        Remove my response
      </a>
    </div>
  );
}

function ContactPage({
  email,
  fullName,
  onEmailChange,
  onFullNameChange,
}: {
  email: string;
  fullName: string;
  onEmailChange: (v: string) => void;
  onFullNameChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900">A few quick basics</h2>
        <p className="mt-1 text-sm text-neutral-700">
          So we can tie this response to your record and follow up if you opt in.
        </p>
      </div>
      <div className="space-y-5">
        <div>
          <label
            htmlFor="contact-name"
            className="text-sm font-medium text-neutral-900 mb-2 block"
          >
            Full name
            <span aria-hidden="true" className="text-red-500 ml-0.5">
              *
            </span>
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            required
            aria-required="true"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            placeholder="First and last name"
            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="text-sm font-medium text-neutral-900 mb-2 block"
          >
            Email
            <span aria-hidden="true" className="text-red-500 ml-0.5">
              *
            </span>
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );
}

function QuestionsPageView({
  page,
  answers,
  onChange,
}: {
  page: QuestionsPage;
  answers: Record<string, unknown>;
  onChange: (id: string, val: unknown) => void;
}) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900">{page.title}</h2>
        {page.subtitle && (
          <p className="mt-1 text-sm text-neutral-700">{page.subtitle}</p>
        )}
      </div>
      <div className="space-y-6">
        {page.questions.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => onChange(q.id, val)}
          />
        ))}
      </div>
    </>
  );
}
