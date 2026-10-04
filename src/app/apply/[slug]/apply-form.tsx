"use client";

import { useState } from "react";
import {
  QuestionRenderer,
  isPageValid,
  type SurveyQuestion,
} from "@/components/survey-fields";
import { submitApplicationAction } from "./actions";

/** Campaign chrome, read off the application's landing page so the form wears
 *  the same colors as the page the applicant just came from. Absent when the
 *  application has no landing page — the form falls back to the product accent. */
export type ApplyTheme = {
  accent: string | null;
  eyebrow: string | null;
  heroImageUrl: string | null;
};

export function GenericApplyForm({
  slug,
  title,
  description,
  questions,
  theme,
}: {
  slug: string;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
  theme?: ApplyTheme;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = fullName.trim() && emailValid && isPageValid(questions, answers);

  // The field derives its gradient from --primary, so setting the campaign
  // accent here themes the header without hardcoding a second dark treatment.
  const themeVars = theme?.accent
    ? ({ "--primary": theme.accent } as React.CSSProperties)
    : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await submitApplicationAction({
        slug,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        answers,
      });
      if (res.ok) setSubmitted(true);
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div style={themeVars} className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16">
        <div className="stage-surface stage-grid relative isolate overflow-hidden rounded-xl px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-2xl">
            🎉
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-white">
            Your application is in.
          </h2>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/70">
            We read every single one, and we&apos;ll be in touch soon. Keep an
            eye on the inbox you used to apply — and check spam just in case.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={themeVars} className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-10 sm:py-14">
      {/* Header on the field: one dark object at the top of the page, themed by
          the campaign accent. */}
      <header className="stage-surface stage-grid relative isolate mb-8 overflow-hidden rounded-xl px-6 py-8 sm:px-8 sm:py-10">
        {theme?.eyebrow && (
          <p className="mb-2 text-micro font-medium uppercase tracking-[0.18em] text-white/60">
            {theme.eyebrow}
          </p>
        )}
        <h1 className="text-[27px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[30px]">
          Apply for {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70">
            {description}
          </p>
        )}
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white/80">
          <span aria-hidden>⏱</span> Takes about 5 minutes
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-xl border border-rule bg-surface-elevated p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">
            First, the basics
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="apply-name"
                className="mb-2 block text-sm font-medium text-neutral-700"
              >
                Full name
              </label>
              <input
                id="apply-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label
                htmlFor="apply-email"
                className="mb-2 block text-sm font-medium text-neutral-700"
              >
                Email address
              </label>
              <input
                id="apply-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </section>

        {/* One card per question, numbered — the applicant can see how much is
            left without the form becoming a wall of fields. */}
        {questions.map((q, i) => (
          <section
            key={q.id}
            className="rounded-xl border border-rule bg-surface-elevated p-5 sm:p-6"
          >
            <span
              className="mb-3 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white"
              style={{ background: theme?.accent ?? "var(--primary)" }}
            >
              {i + 1}
            </span>
            <QuestionRenderer
              question={q}
              value={answers[q.id]}
              onChange={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
            />
          </section>
        ))}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={!ready || pending}
            className="w-full rounded-full px-6 py-4 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-10"
            style={{ background: theme?.accent ?? "var(--primary)" }}
          >
            {pending ? "Sending…" : "Submit application"}
          </button>
          <p className="mt-3 text-xs text-neutral-500">
            You can only apply once with the same email — submitting again
            updates your answers.
          </p>
        </div>
      </form>
    </div>
  );
}
