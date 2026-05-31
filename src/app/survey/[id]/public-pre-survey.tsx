"use client";

import { useCallback, useMemo, useState } from "react";
import {
  QuestionRenderer,
  isPageValid as validatePage,
  type SurveyQuestion,
} from "@/components/survey-fields";
import { savePublicSurveyResponse } from "./actions";

// Public (unauthenticated) Beyond Code Centers pre-survey — Spring 2026.
// Students land here via a shared link without needing to log in.
// Collects demographics, device access, digital literacy, and AI experience.

type QuestionsPage = {
  kind: "questions";
  title: string;
  subtitle?: string;
  questions: SurveyQuestion[];
};

type Page = { kind: "contact" } | QuestionsPage;

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

export const CONSENT_VERSION = "pre-survey-spring-2026-v1";

const CONSENT_LEAD =
  "Beyond Code Collective collects this information to understand your background and experience so we can better support you.";

const CONSENT_BULLETS = [
  'You can mark "Prefer not to say" on any item — your choice never affects your participation.',
  "Your answers stay private and are never shared individually.",
  "To see, change, or delete your answers, email info@beyondcodecollective.org.",
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
    ],
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
    ],
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
    ],
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
    ],
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicPreSurvey({ surveyId, programSlug }: Props) {
  const storageKey = `public-survey-${programSlug}-${surveyId}`;

  const initialState = useMemo(() => {
    if (typeof window === "undefined")
      return { page: 0, answers: {} as Record<string, unknown>, email: "", fullName: "" };
    const saved = window.localStorage.getItem(storageKey);
    if (!saved)
      return { page: 0, answers: {} as Record<string, unknown>, email: "", fullName: "" };
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
      return { page: 0, answers: {} as Record<string, unknown>, email: "", fullName: "" };
    }
  }, [storageKey]);

  const [page, setPage] = useState(initialState.page);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialState.answers);
  const [email, setEmail] = useState(initialState.email);
  const [fullName, setFullName] = useState(initialState.fullName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const currentPage = PAGES[page];
  const isLastPage = page === PAGES.length - 1;

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
    if (error) setError("");
  }

  function contactPageValid() {
    return EMAIL_RE.test(email.trim()) && fullName.trim().length > 0;
  }

  function isCurrentValid() {
    if (!currentPage) return false;
    if (currentPage.kind === "contact") return contactPageValid();
    return validatePage(currentPage.questions, answers);
  }

  function handleNext() {
    if (!isCurrentValid()) {
      setError(
        "Please answer all required questions (marked with *) before continuing.",
      );
      return;
    }
    setError("");
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
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-900">You&apos;re all set.</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Thanks for sharing. Your answers help us build Beyond Code Centers around you.
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
            Page {page + 1} of {PAGES.length}
          </p>
          <p className="text-xs text-neutral-600">
            {Math.round(((page + 1) / PAGES.length) * 100)}%
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Survey progress"
          aria-valuenow={page + 1}
          aria-valuemin={1}
          aria-valuemax={PAGES.length}
          aria-valuetext={`Page ${page + 1} of ${PAGES.length}`}
          className="h-2 w-full overflow-hidden rounded-full bg-neutral-100"
        >
          <div
            className="h-full rounded-full bg-[#1a1a1a] transition-all duration-300"
            style={{ width: `${((page + 1) / PAGES.length) * 100}%` }}
          />
        </div>
      </div>

      {currentPage?.kind === "contact" ? (
        <ContactPage
          email={email}
          fullName={fullName}
          onEmailChange={(v) => { setEmail(v); persist({ email: v }); if (error) setError(""); }}
          onFullNameChange={(v) => { setFullName(v); persist({ fullName: v }); if (error) setError(""); }}
        />
      ) : currentPage ? (
        <QuestionsPageView page={currentPage} answers={answers} onChange={updateAnswer} />
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
          ← Back
        </button>
        <button
          onClick={handleNext}
          disabled={submitting}
          className="inline-flex items-center gap-1 rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
        >
          {submitting ? <>… Submitting...</> : isLastPage ? <>✓ Submit</> : <>Next →</>}
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
      <a href="/privacy" className="hover:text-neutral-600">Privacy</a>
      <span aria-hidden>·</span>
      <a href="/privacy/withdraw" className="hover:text-neutral-600">Remove my response</a>
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
  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900">Your info</h2>
        <p className="mt-1 text-sm text-neutral-700">
          So we can connect your responses to your record when the program starts.
        </p>
      </div>
      <div className="space-y-5">
        <div>
          <label htmlFor="contact-name" className="text-sm font-medium text-neutral-900 mb-2 block">
            Full name
            <span aria-hidden="true" className="text-red-500 ml-0.5">*</span>
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
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="text-sm font-medium text-neutral-900 mb-2 block">
            Email
            <span aria-hidden="true" className="text-red-500 ml-0.5">*</span>
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
            className={inputClass}
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
