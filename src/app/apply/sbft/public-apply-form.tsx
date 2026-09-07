"use client";

import { useState } from "react";
import { SurveyWizard } from "@/components/survey-wizard";
import { SBFT_APPLICATION_SURVEY_ID } from "@/lib/surveys/platform";
import { savePublicApplication } from "./actions";

const EYEBROW = "Black Girls Code · Oakland";

const PROGRAM_DATES: [string, string][] = [
  ["Kickoff", "September 26"],
  ["Sessions", "Oct 3 · Oct 10 · Oct 17 · Oct 24 · Oct 31"],
  ["Celebration Day", "November 7 (families welcome!)"],
  ["Time", "10 AM - 1 PM"],
  ["Location", "Oakland, CA"],
];

/** What the program is and when it runs. Rendered on the email screen AND above
 *  the wizard's first page, so the dates are in front of a family before they
 *  spend time on the form and still there while they fill it out. */
function ProgramSummary() {
  return (
    <div className="mt-6 border border-rule bg-surface-elevated p-5 sm:p-6">
      <p className="text-sm leading-relaxed text-neutral-700">
        She&apos;s Built for This is a cohort program for 6th-8th grade girls
        that combines leadership development, STEM/tech exploration, and
        goal-setting in a structured, community-driven experience. This program
        meets our girls exactly where confidence begins to slip, offering them
        the tools, community, and belief system to persevere in STEM.
      </p>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
        Program dates
      </p>
      <dl className="mt-2.5 space-y-1.5">
        {PROGRAM_DATES.map(([label, value]) => (
          <div key={label} className="flex flex-wrap gap-x-2 text-sm">
            <dt className="font-semibold text-neutral-900">{label}:</dt>
            <dd className="text-neutral-600">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

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
            Your application is in. She&apos;s one step closer.
          </h2>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto">
            We&apos;ll review every application carefully and be in touch within
            a few days. Keep an eye on the inbox you used to apply — and check
            your spam folder just in case.
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
            {EYEBROW}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Apply for She&apos;s Built for This
          </h1>
          <ProgramSummary />
          <p className="mt-5 text-sm text-neutral-500">
            Plan for about 10 minutes. A parent or guardian can fill this out
            with her.
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-2"
            >
              Student&apos;s email address
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
            No account needed. If she doesn&apos;t have her own email, use a
            parent or guardian&apos;s — we ask for their contact details on the
            next page either way.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 pt-8 pb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-2">
          {EYEBROW}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Apply for She&apos;s Built for This
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
        <ProgramSummary />
      </div>
      <SurveyWizard
        surveyId={SBFT_APPLICATION_SURVEY_ID}
        programSlug="bgc"
        onSubmit={handleSurveySubmit}
      />
    </div>
  );
}
