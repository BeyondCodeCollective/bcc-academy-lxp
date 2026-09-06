"use client";

import { useState } from "react";
import {
  QuestionRenderer,
  isPageValid,
  type SurveyQuestion,
} from "@/components/survey-fields";
import { submitApplicationAction } from "./actions";

export function GenericApplyForm({
  slug,
  title,
  description,
  questions,
}: {
  slug: string;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = fullName.trim() && emailValid && isPageValid(questions, answers);

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
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16">
        <div className="border border-rule bg-surface-elevated p-8 sm:p-12 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <span className="text-2xl text-green-600">✓</span>
          </div>
          <h2 className="mb-3 text-2xl font-bold text-neutral-900">
            Your application is in.
          </h2>
          <p className="mx-auto max-w-sm text-sm text-neutral-500">
            We review every application carefully and will be in touch soon.
            Keep an eye on the inbox you used to apply — and check spam just in
            case.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16">
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          BCC Academy
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Apply for {title}
        </h1>
        {description && (
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">{description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="apply-name"
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500"
            >
              Full name
            </label>
            <input
              id="apply-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className="w-full border border-neutral-300 px-4 py-3 text-base focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="apply-email"
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500"
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
              className="w-full border border-neutral-300 px-4 py-3 text-base focus:border-neutral-900 focus:outline-none"
            />
          </div>
        </div>

        {questions.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
          />
        ))}

        {error && (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!ready || pending}
          className="w-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Submitting…" : "Submit application →"}
        </button>
      </form>
    </div>
  );
}
