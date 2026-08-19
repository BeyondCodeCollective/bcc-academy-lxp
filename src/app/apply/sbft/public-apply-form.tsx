"use client";

import { useState } from "react";
import { SurveyWizard } from "@/components/survey-wizard";
import { SBFT_APPLICATION_SURVEY_ID } from "@/lib/surveys/platform";
import { savePublicApplication } from "./actions";

const EYEBROW = "Black Girls Code · Oakland";

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
            We read every application and email families with a decision before
            the September 26 kickoff. Check the inbox you applied with, and your
            spam folder just in case.
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
          <p className="mt-3 text-sm leading-relaxed text-neutral-600 max-w-[55ch]">
            A Saturday leadership cohort in Oakland for girls in 6th through 8th
            grade. Seven sessions, one group, start to finish: kickoff on
            September 26, sessions through October, and a Celebration Day on
            November 7 with families welcome.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
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
      </div>
      <SurveyWizard
        surveyId={SBFT_APPLICATION_SURVEY_ID}
        programSlug="bgc"
        onSubmit={handleSurveySubmit}
      />
    </div>
  );
}
