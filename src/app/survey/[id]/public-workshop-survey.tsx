"use client";

import { useCallback, useMemo, useState } from "react";
import {
  QuestionRenderer,
  isPageValid as validatePage,
  type SurveyQuestion,
} from "@/components/survey-fields";
import { savePublicSurveyResponse } from "./actions";
import { WORKSHOP_NAMES, WORKSHOP_LOCATIONS as WORKSHOP_LOCATION_OPTIONS } from "@/lib/surveys/schemas";

// BCC Workshop Survey — post-workshop feedback for standalone workshops
// (1–8 hours). Takes ~3–5 minutes. Mirrors the content spec in
// .context/attachments/BCC Workshop Survey.pdf

type QuestionsPage = {
  kind: "questions";
  title: string;
  subtitle?: string;
  questions: SurveyQuestion[];
};

type Page = { kind: "contact" } | QuestionsPage;

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

export const CONSENT_VERSION = "workshop-v1";

const CONSENT_LEAD =
  "Your answers are private. They are only used to help us improve our programs.";

const CONSENT_BULLETS = [
  "We may share results with our partners and funders, but your name will never be attached to your answers.",
  "You can email info@beyondcodecollective.org anytime to see, change, or delete your answers.",
];

const CONSENT_FOOTER =
  "For more information, visit wearebcc.org/en/privacy. Your use of this platform is also governed by the BCC Terms of Use and Privacy Policy. Full platform-specific details at /privacy.";

const PAGES: Page[] = [
  // Page 0 — Consent
  {
    kind: "questions",
    title: "Before we begin",
    subtitle:
      "Thanks for being here today! Before you go, take a few minutes to share your thoughts. Your honest answers help us make our programs better for everyone.",
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
    ],
  },

  // Page 1 — Contact + Workshop Details
  { kind: "contact" },

  // Page 2 — Tell Us About Today (v1: single likert, no before/after)
  {
    kind: "questions",
    title: "Tell Us About Today",
    subtitle:
      "For each statement below, please rate yourself. Scale: 1 = Not at all · 5 = Very much.",
    questions: [
      {
        type: "likert",
        id: "learning_outcomes",
        label: "Rate yourself on the following",
        scale: LIKERT_1_5,
        scaleAnchors: { low: "1 — Not at all", high: "5 — Very much" },
        statements: [
          "I understand the main ideas from today.",
          "I feel ready to use what I learned.",
          "Learning about this topic will help me grow personally and professionally.",
        ],
        required: true,
      },
      {
        type: "text",
        id: "best_part",
        label: "What was the best part of today's workshop?",
        placeholder: "Tell us what stood out…",
        required: true,
      },
      {
        type: "text",
        id: "still_unsure",
        label:
          "Is there anything from today that you're still not sure about?",
        placeholder:
          "Example: \"I'm still not sure how to use AI workflow tools on my own.\" Leave blank if everything felt clear.",
        required: false,
      },
      {
        type: "likert",
        id: "workshop_rating",
        label: "How would you rate today's workshop overall?",
        scale: LIKERT_1_5,
        scaleAnchors: { low: "1 — Not useful", high: "5 — Very useful" },
        statements: ["Overall workshop rating"],
        required: true,
      },
    ],
  },

  // Page 3 — What's Next for You
  {
    kind: "questions",
    title: "What's Next for You",
    questions: [
      {
        type: "text",
        id: "plan_to_do",
        label:
          "What is one thing you plan to do because of this workshop?",
        placeholder:
          "Try to be as specific as you can. Example: \"I'm going to try building a simple website this weekend.\"",
        required: true,
      },
      {
        type: "multi-select",
        id: "want_next",
        label:
          "What would you want to learn or do next with Beyond Code Collective? Select all that apply.",
        options: [
          "Another workshop on a related topic",
          "A longer multi-week program",
          "1:1 coaching",
          "Help connecting to others learning the same thing",
          "Just stay in touch about future opportunities",
          "Not sure yet — keep me posted",
          "Other",
        ],
        required: true,
      },
      {
        type: "likert",
        id: "recommend_bcc",
        label:
          "How likely are you to recommend Beyond Code Collective?",
        scale: LIKERT_1_5,
        scaleAnchors: {
          low: "1 — Not likely at all",
          high: "5 — I'd definitely recommend it",
        },
        statements: ["Likelihood to recommend"],
        required: true,
      },
      {
        type: "text",
        id: "anything_else",
        label: "Anything else you want to share? (Optional)",
        placeholder: "Any other thoughts, questions, or ideas?",
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

export function PublicWorkshopSurvey({ surveyId, programSlug }: Props) {
  const storageKey = `public-survey-${programSlug}-${surveyId}`;

  const initialState = useMemo(() => {
    if (typeof window === "undefined")
      return {
        page: 0,
        answers: {} as Record<string, unknown>,
        email: "",
        fullName: "",
        workshopName: "",
        workshopLocation: "",
        workshopDate: "",
      };
    const saved = window.localStorage.getItem(storageKey);
    if (!saved)
      return {
        page: 0,
        answers: {} as Record<string, unknown>,
        email: "",
        fullName: "",
        workshopName: "",
        workshopLocation: "",
        workshopDate: "",
      };
    try {
      const parsed = JSON.parse(saved) as {
        page?: number;
        answers?: Record<string, unknown>;
        email?: string;
        fullName?: string;
        workshopName?: string;
        workshopLocation?: string;
        workshopDate?: string;
      };
      const savedName = parsed.workshopName ?? "";
      return {
        page: parsed.page ?? 0,
        answers: parsed.answers ?? {},
        email: parsed.email ?? "",
        fullName: parsed.fullName ?? "",
        // Stale free-text workshopName values from before the dropdown won't
        // match any option, so drop them rather than silently submitting.
        workshopName: WORKSHOP_NAMES.includes(savedName) ? savedName : "",
        workshopLocation: parsed.workshopLocation ?? "",
        workshopDate: parsed.workshopDate ?? "",
      };
    } catch {
      return {
        page: 0,
        answers: {} as Record<string, unknown>,
        email: "",
        fullName: "",
        workshopName: "",
        workshopLocation: "",
        workshopDate: "",
      };
    }
  }, [storageKey]);

  const [page, setPage] = useState(initialState.page);
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    initialState.answers,
  );
  const [email, setEmail] = useState(initialState.email);
  const [fullName, setFullName] = useState(initialState.fullName);
  const [workshopName, setWorkshopName] = useState(initialState.workshopName);
  const [workshopLocation, setWorkshopLocation] = useState(
    initialState.workshopLocation,
  );
  const [workshopDate, setWorkshopDate] = useState(initialState.workshopDate);

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
      workshopName?: string;
      workshopLocation?: string;
      workshopDate?: string;
    }) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          page: next.page ?? page,
          answers: next.answers ?? answers,
          email: next.email ?? email,
          fullName: next.fullName ?? fullName,
          workshopName: next.workshopName ?? workshopName,
          workshopLocation: next.workshopLocation ?? workshopLocation,
          workshopDate: next.workshopDate ?? workshopDate,
        }),
      );
    },
    [storageKey, page, answers, email, fullName, workshopName, workshopLocation, workshopDate],
  );

  function updateAnswer(id: string, val: unknown) {
    const updated = { ...answers, [id]: val };
    setAnswers(updated);
    persist({ answers: updated });
    if (error) setError("");
  }

  function contactPageValid(): boolean {
    return (
      EMAIL_RE.test(email.trim()) &&
      fullName.trim().length > 0 &&
      workshopName.trim().length > 0 &&
      workshopLocation.length > 0 &&
      workshopDate.length > 0
    );
  }

  function isCurrentValid(): boolean {
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
        responses: {
          ...answers,
          workshop_name: workshopName.trim(),
          workshop_location: workshopLocation,
          workshop_date: workshopDate,
        },
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
            Your voice matters and helps shape everything we build.
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
            style={{
              width: `${((page + 1) / PAGES.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {currentPage?.kind === "contact" ? (
        <ContactPage
          email={email}
          fullName={fullName}
          workshopName={workshopName}
          workshopLocation={workshopLocation}
          workshopDate={workshopDate}
          onEmailChange={(v) => {
            setEmail(v);
            persist({ email: v });
            if (error) setError("");
          }}
          onFullNameChange={(v) => {
            setFullName(v);
            persist({ fullName: v });
            if (error) setError("");
          }}
          onWorkshopNameChange={(v) => {
            setWorkshopName(v);
            persist({ workshopName: v });
            if (error) setError("");
          }}
          onWorkshopLocationChange={(v) => {
            setWorkshopLocation(v);
            persist({ workshopLocation: v });
            if (error) setError("");
          }}
          onWorkshopDateChange={(v) => {
            setWorkshopDate(v);
            persist({ workshopDate: v });
            if (error) setError("");
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
          ← Back
        </button>
        <button
          onClick={handleNext}
          disabled={submitting}
          className="inline-flex items-center gap-1 rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
        >
          {submitting ? (
            <>… Submitting...</>
          ) : isLastPage ? (
            <>✓ Submit</>
          ) : (
            <>Next →</>
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
  workshopName,
  workshopLocation,
  workshopDate,
  onEmailChange,
  onFullNameChange,
  onWorkshopNameChange,
  onWorkshopLocationChange,
  onWorkshopDateChange,
}: {
  email: string;
  fullName: string;
  workshopName: string;
  workshopLocation: string;
  workshopDate: string;
  onEmailChange: (v: string) => void;
  onFullNameChange: (v: string) => void;
  onWorkshopNameChange: (v: string) => void;
  onWorkshopLocationChange: (v: string) => void;
  onWorkshopDateChange: (v: string) => void;
}) {
  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900">
          About you &amp; today&apos;s workshop
        </h2>
        <p className="mt-1 text-sm text-neutral-700">
          So we can connect your feedback to the right workshop.
        </p>
      </div>
      <div className="space-y-5">
        <div>
          <label
            htmlFor="workshop-name"
            className="text-sm font-medium text-neutral-900 mb-2 block"
          >
            Workshop Name
            <span aria-hidden="true" className="text-red-500 ml-0.5">
              *
            </span>
          </label>
          <select
            id="workshop-name"
            value={workshopName}
            onChange={(e) => onWorkshopNameChange(e.target.value)}
            required
            aria-required="true"
            className={inputClass}
          >
            <option value="" disabled>
              Choose your workshop…
            </option>
            {WORKSHOP_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-neutral-900 mb-2">
            Workshop Location
            <span aria-hidden="true" className="text-red-500 ml-0.5">
              *
            </span>
          </legend>
          <div className="space-y-1.5">
            {WORKSHOP_LOCATION_OPTIONS.map((loc) => (
              <label
                key={loc}
                className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 cursor-pointer transition-colors ${
                  workshopLocation === loc
                    ? "border-neutral-900 bg-neutral-900/5"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name="workshop-location"
                  value={loc}
                  checked={workshopLocation === loc}
                  onChange={() => onWorkshopLocationChange(loc)}
                  className="h-3.5 w-3.5 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span className="text-sm text-neutral-700">{loc}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="workshop-date"
            className="text-sm font-medium text-neutral-900 mb-2 block"
          >
            Today&apos;s Date
            <span aria-hidden="true" className="text-red-500 ml-0.5">
              *
            </span>
          </label>
          <input
            id="workshop-date"
            type="date"
            value={workshopDate}
            onChange={(e) => onWorkshopDateChange(e.target.value)}
            required
            aria-required="true"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="contact-name"
            className="text-sm font-medium text-neutral-900 mb-2 block"
          >
            Your Name
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
            className={inputClass}
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
