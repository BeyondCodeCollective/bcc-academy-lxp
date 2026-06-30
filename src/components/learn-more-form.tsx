"use client";

import { useState, useTransition } from "react";
import { savePublicSurveyResponse } from "@/app/survey/[id]/actions";

/**
 * Minimal "learn more" signup on the marketing homepage. Newsletter lead, not a
 * survey: savePublicSurveyResponse routes survey_type "learn-more" to Mailchimp
 * (+ a staff heads-up email) and does NOT store it in public_survey_responses,
 * so it never shows up in the portal / Survey Insights.
 */
export function LearnMoreForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await savePublicSurveyResponse({
        programSlug: "catalyst",
        surveyType: "learn-more",
        email,
        fullName: name,
        consentVersion: "learn-more-v1",
        responses: { source: "homepage" },
      });
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <p className="text-center font-mono text-sm text-electric-green tracking-wide">
        You&apos;re on the list — we&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-3">
      <input
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoComplete="name"
        className="w-full bg-white/5 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-ink-faint focus:border-electric-green focus:outline-none"
      />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        autoComplete="email"
        className="w-full bg-white/5 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-ink-faint focus:border-electric-green focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full border border-white/30 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:border-electric-green hover:text-electric-green disabled:opacity-50"
      >
        {pending ? "Subscribing…" : "Subscribe"}
      </button>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </form>
  );
}
