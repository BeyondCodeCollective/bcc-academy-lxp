"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { submitEventSurvey, type SurveyInput } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-rule bg-white px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:ring-1 focus:ring-ink-faint focus:outline-none transition-all";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-ink";
const CHOICE_BASE =
  "flex h-12 min-w-12 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors";
const CHOICE_ON = "border-ink bg-ink text-white";
const CHOICE_OFF = "border-rule bg-white text-ink hover:border-ink-faint";

export function SurveyForm({ token, initial }: { token: string; initial: SurveyInput | null }) {
  const [v, setV] = useState<SurveyInput>(initial ?? { rating: 0, wouldRecommend: null, enjoyed: "", improve: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.rating) {
      setError("Pick a rating from 1 to 5.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitEventSurvey(token, v);
      if (res.ok) setDone(true);
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 pb-20">
        <div className="rounded-lg border border-rule bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-ink">Thank you</h2>
          <p className="mt-2 text-sm text-ink-soft">Your answers help us plan the next one.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl px-5 pb-20" noValidate>
      <div className="space-y-6 rounded-lg border border-rule bg-white p-6">
        <fieldset>
          <legend className={LABEL_CLASS}>Overall, how was the event for your family?</legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Rating from 1 to 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={v.rating === n}
                onClick={() => setV((s) => ({ ...s, rating: n }))}
                className={`${CHOICE_BASE} flex-1 ${v.rating === n ? CHOICE_ON : CHOICE_OFF}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-ink-soft">
            <span>Not great</span>
            <span>Excellent</span>
          </div>
        </fieldset>

        <fieldset>
          <legend className={LABEL_CLASS}>Would you recommend it to another family?</legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Would you recommend">
            {[
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={v.wouldRecommend === o.value}
                onClick={() => setV((s) => ({ ...s, wouldRecommend: o.value }))}
                className={`${CHOICE_BASE} ${v.wouldRecommend === o.value ? CHOICE_ON : CHOICE_OFF}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="sv-enjoyed" className={LABEL_CLASS}>
            What did your child enjoy most?
          </label>
          <textarea
            id="sv-enjoyed"
            rows={3}
            value={v.enjoyed}
            onChange={(e) => setV((s) => ({ ...s, enjoyed: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="sv-improve" className={LABEL_CLASS}>
            What could we do better?
          </label>
          <textarea
            id="sv-improve"
            rows={3}
            value={v.improve}
            onChange={(e) => setV((s) => ({ ...s, improve: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-end border-t border-rule pt-6">
        <button type="submit" disabled={submitting} className={buttonClass("primary", "md")}>
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Check size={16} />
              {initial ? "Update answers" : "Send"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
