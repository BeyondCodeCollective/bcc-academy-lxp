"use client";

import { useState } from "react";
import { SurveyWizard } from "@/components/survey-wizard";
import { HOME_FOR_SUMMER_APPLICATION_SURVEY_ID } from "@/lib/surveys/platform";
import { savePublicApplication } from "./actions";

export function PublicApplyForm() {
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim());

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmail(emailInput.trim().toLowerCase());
    setEmailError("");
  }

  async function handleSurveySubmit(answers: Record<string, unknown>) {
    const result = await savePublicApplication({ email, answers });
    if (!result.ok) throw new Error(result.error);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16">
        <div className="border border-rule bg-surface-elevated p-8 sm:p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-6">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">
            Application received.
          </h2>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto">
            We&apos;ll review every application and share decisions ahead of the
            August 3 start. Selected participants will be onboarded before the
            first session.
          </p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-2">
            Beyond Code Collective · NextEra Energy
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Apply for Home for the Summer
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600 max-w-[55ch]">
            A week-long virtual intensive for undergraduates and recent
            graduates — the tools, norms, and competencies employers assume but
            rarely teach. Five sessions, 90 minutes each, August 3–7, 2026.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            No prior technical experience needed. The series assumes curiosity,
            not expertise. Plan for 10–15 minutes to apply.
          </p>
          <p className="mt-3 text-xs text-neutral-400">
            Ends with live mock interviews conducted by NextEra Energy staff and
            a certificate of completion.
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-2"
            >
              Your email address
            </label>
            <input
              id="email"
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setEmailError("");
              }}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              className="w-full border border-neutral-300 px-4 py-3 text-base focus:outline-none focus:border-neutral-900"
            />
            {emailError && (
              <p className="mt-1.5 text-sm text-red-600">{emailError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!isValidEmail}
            className="w-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Start Application →
          </button>
          <p className="text-xs text-neutral-400">
            No account needed. We use your email to save your application.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 pt-8 pb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-2">
          Beyond Code Collective · NextEra Energy
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Apply for Home for the Summer
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Applying as <span className="font-medium text-neutral-700">{email}</span>
          {" · "}
          <button
            onClick={() => setEmail("")}
            className="text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            Change
          </button>
        </p>
      </div>
      <SurveyWizard
        surveyId={HOME_FOR_SUMMER_APPLICATION_SURVEY_ID}
        programSlug="catalyst"
        onSubmit={handleSurveySubmit}
      />
    </div>
  );
}
