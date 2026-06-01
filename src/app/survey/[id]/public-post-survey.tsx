"use client";

import { useCallback, useMemo, useState } from "react";
import {
  QuestionRenderer,
  isPageValid as validatePage,
  type SurveyQuestion,
} from "@/components/survey-fields";
import { savePublicSurveyResponse } from "./actions";

// Public (unauthenticated) Beyond Code Centers post-survey — Spring 2026.
// Collects end-of-program reflection + the same digital_experience and
// ai_experience Likert blocks as the pre-survey so the dashboard can compute
// true pre→post confidence deltas.

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

export const CONSENT_VERSION = "post-survey-spring-2026-v1";

type QuestionsPage = {
  kind: "questions";
  title: string;
  subtitle?: string;
  questions: SurveyQuestion[];
};

type Page = { kind: "contact" } | QuestionsPage;

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
    ],
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
    ],
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
    ],
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
    ],
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicPostSurvey({ surveyId, programSlug }: Props) {
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
          <h2 className="text-xl font-bold text-neutral-900">Thank you!</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Your feedback helps us improve the program for everyone. We appreciate you completing the post-survey.
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
          So we can connect your post-survey to your pre-survey record.
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
