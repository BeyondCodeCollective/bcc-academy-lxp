"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import {
  QuestionRenderer,
  isPageValid as validatePage,
  type SurveyQuestion,
} from "@/components/survey-fields";
import { savePublicSurveyResponse } from "./actions";
import { buttonClass } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestionsPage = {
  kind: "questions";
  title: string;
  subtitle?: string;
  questions: SurveyQuestion[];
  /** When provided, this page is skipped (not rendered) if the function returns false. */
  showIf?: (answers: Record<string, unknown>) => boolean;
};

export type Page = { kind: "contact" } | QuestionsPage;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ContactPageContext {
  email: string;
  fullName: string;
  onEmailChange: (v: string) => void;
  onFullNameChange: (v: string) => void;
  /** Clear the validation error (call when any field changes). */
  clearError: () => void;
}

export interface PublicSurveyWizardProps {
  surveyId: string;
  programSlug: string;
  pages: Page[];
  consentVersion: string;
  /**
   * Optional override for the contact page.
   *
   * Receives the base contact context plus a `setExtraValid` callback for the
   * wizard to know whether the extra fields pass validation, and a
   * `setExtraResponses` callback to supply extra key/value pairs that will be
   * merged into the survey responses on submit.
   *
   * If omitted, the default name + email contact page is rendered.
   */
  renderContactPage?: (
    ctx: ContactPageContext & {
      setExtraValid: (valid: boolean) => void;
      setExtraResponses: (r: Record<string, string>) => void;
    },
  ) => React.ReactNode;
  /**
   * Heading shown on the default contact page. Defaults to "Your info".
   */
  contactTitle?: string;
  /**
   * Subtitle shown under the contact page heading.
   * Defaults to a generic message about connecting responses to a record.
   */
  contactSubtitle?: string;
  /**
   * Success screen copy.  Defaults to the generic "You're all set." variant.
   */
  successTitle?: string;
  successBody?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Wizard component
// ---------------------------------------------------------------------------

export function PublicSurveyWizard({
  surveyId,
  programSlug,
  pages,
  consentVersion,
  renderContactPage,
  contactTitle,
  contactSubtitle,
  successTitle = "You're all set.",
  successBody = "Thanks for sharing.",
}: PublicSurveyWizardProps) {
  const storageKey = `public-survey-${programSlug}-${surveyId}`;

  // ── Initial state (hydrated from localStorage on mount) ──────────────────
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

  // ── State ─────────────────────────────────────────────────────────────────
  const [page, setPage] = useState(initialState.page);
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    initialState.answers,
  );
  const [email, setEmail] = useState(initialState.email);
  const [fullName, setFullName] = useState(initialState.fullName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Extra state for surveys that augment the contact page (e.g. workshop fields)
  const [extraContactValid, setExtraContactValid] = useState(true);
  const [extraContactResponses, setExtraContactResponses] = useState<
    Record<string, string>
  >({});

  // ── Visible pages (respects showIf) ───────────────────────────────────────
  const visiblePages = useMemo(
    () =>
      pages.filter((p) => {
        if (p.kind !== "questions") return true;
        if (!p.showIf) return true;
        return p.showIf(answers);
      }),
    [pages, answers],
  );

  const currentPage = visiblePages[page];
  const isLastPage = page === visiblePages.length - 1;

  // ── Persistence ───────────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  function updateAnswer(id: string, val: unknown) {
    const updated = { ...answers, [id]: val };
    setAnswers(updated);
    persist({ answers: updated });
    if (error) setError("");
  }

  function contactPageValid() {
    return (
      EMAIL_RE.test(email.trim()) &&
      fullName.trim().length > 0 &&
      (renderContactPage ? extraContactValid : true)
    );
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
      void submit();
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
        consentVersion,
        responses: { ...answers, ...extraContactResponses },
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

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 pb-20">
        <div className="rounded-lg border border-rule bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-ink">{successTitle}</h2>
          <p className="mt-2 text-sm text-ink-soft">{successBody}</p>
          <p className="mt-4 text-xs text-ink-soft">
            Change your mind?{" "}
            <a
              href="/privacy/withdraw"
              className="font-medium text-ink underline hover:text-ink"
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

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-ink">
            Page {page + 1} of {visiblePages.length}
          </p>
          <p className="text-xs text-ink-soft">
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
          className="h-2 w-full overflow-hidden rounded-full bg-paper-tint"
        >
          <div
            className="h-full rounded-full bg-[#1a1a1a] transition-all duration-300"
            style={{ width: `${((page + 1) / visiblePages.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Page content */}
      {currentPage?.kind === "contact" ? (
        renderContactPage ? (
          renderContactPage({
            email,
            fullName,
            onEmailChange: (v) => {
              setEmail(v);
              persist({ email: v });
              if (error) setError("");
            },
            onFullNameChange: (v) => {
              setFullName(v);
              persist({ fullName: v });
              if (error) setError("");
            },
            clearError: () => { if (error) setError(""); },
            setExtraValid: setExtraContactValid,
            setExtraResponses: setExtraContactResponses,
          })
        ) : (
          <DefaultContactPage
            email={email}
            fullName={fullName}
            title={contactTitle}
            subtitle={contactSubtitle}
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
          />
        )
      ) : currentPage ? (
        <QuestionsPageView
          page={currentPage}
          answers={answers}
          onChange={updateAnswer}
        />
      ) : null}

      {/* Validation error */}
      <p
        role="alert"
        aria-live="assertive"
        className={`mt-4 text-sm text-red-600 ${error ? "" : "sr-only"}`}
      >
        {error}
      </p>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-rule">
        <button
          onClick={handleBack}
          disabled={page === 0}
          className={buttonClass("secondary", "md")}
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={submitting}
          className={buttonClass("primary", "md")}
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin" />Submitting...</>
          ) : isLastPage ? (
            <><Check size={16} />Submit</>
          ) : (
            <>Next<ChevronRight size={16} /></>
          )}
        </button>
      </div>
      <FooterLinks />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function FooterLinks() {
  return (
    <div className="mt-8 flex items-center justify-center gap-3 text-xs text-ink-soft">
      <a
        href="https://www.wearebcc.org/en/terms"
        className="hover:text-ink-soft"
        target="_blank"
        rel="noopener noreferrer"
      >
        Terms
      </a>
      <span aria-hidden>·</span>
      <a href="/privacy" className="hover:text-ink-soft">
        Privacy
      </a>
      <span aria-hidden>·</span>
      <a href="/privacy/withdraw" className="hover:text-ink-soft">
        Remove my response
      </a>
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-lg border border-rule bg-white px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:ring-1 focus:ring-ink-faint focus:outline-none transition-all";

export { INPUT_CLASS };

function DefaultContactPage({
  email,
  fullName,
  title,
  subtitle,
  onEmailChange,
  onFullNameChange,
}: {
  email: string;
  fullName: string;
  title?: string;
  subtitle?: string;
  onEmailChange: (v: string) => void;
  onFullNameChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-ink">
          {title ?? "Your info"}
        </h2>
        <p className="mt-1 text-sm text-ink">
          {subtitle ??
            "So we can connect your responses to your record when the program starts."}
        </p>
      </div>
      <div className="space-y-5">
        <div>
          <label
            htmlFor="contact-name"
            className="text-sm font-medium text-ink mb-2 block"
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
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="text-sm font-medium text-ink mb-2 block"
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
            className={INPUT_CLASS}
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
        <h2 className="text-xl font-bold text-ink">{page.title}</h2>
        {page.subtitle && (
          <p className="mt-1 text-sm text-ink">{page.subtitle}</p>
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
