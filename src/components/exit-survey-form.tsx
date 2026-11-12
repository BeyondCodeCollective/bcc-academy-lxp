"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { submitExitSurvey } from "@/app/dashboard/track/exit-survey-actions";
import { weekBtnPrimary, weekHeading, weekState, weekStateDone } from "@/components/week-page-ui";
import { MAX_UNCLEAR_LENGTH, UNCLEAR_PROMPT, UNDERSTANDING_PROMPT } from "@/lib/exit-survey";

export function ExitSurveyForm({
  trackSlug,
  weekNumber,
  sessionNumber,
  title,
  initialRating,
  initialUnclear,
  variant = "card",
}: {
  trackSlug: string;
  weekNumber: number;
  sessionNumber: number;
  /** Shown above the questions, e.g. "Session 2 exit survey". */
  title: string;
  initialRating: number | null;
  initialUnclear: string | null;
  /** "plain" is the week page's Survey block: the title becomes the block
   *  heading, with "Sent" or "Not sent yet" beside it, and no card chrome. */
  variant?: "card" | "plain";
}) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [unclear, setUnclear] = useState(initialUnclear ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initialRating !== null);
  // True only after a save in this visit, so the confirmation is not shown on load.
  const [savedThisVisit, setSavedThisVisit] = useState(false);
  const [error, setError] = useState("");
  const labelId = `exit-rating-${weekNumber}-${sessionNumber}`;

  async function save() {
    if (rating === null) {
      setError("Pick a rating from 1 to 5.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await submitExitSurvey(trackSlug, weekNumber, sessionNumber, rating, unclear);
      setSaved(true);
      setSavedThisVisit(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <>
      <p id={labelId} className="mb-2.5 font-medium text-ink">
        {UNDERSTANDING_PROMPT}
      </p>
      {/* The end labels sit under the scale, at its width: beside five 48px
         buttons they ran off a phone screen. */}
      <div className="w-fit max-w-full">
        <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onClick={() => {
                setRating(n);
                setSaved(false);
              }}
              className={`h-12 w-12 rounded-lg border font-medium tabular-nums transition-colors ${
                rating === n
                  ? "border-ink bg-ink text-white"
                  : "border-rule bg-surface-elevated text-ink hover:border-ink"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between gap-4 text-[13px] text-ink-faint">
          <span>Strongly disagree</span>
          <span>Strongly agree</span>
        </div>
      </div>

      <label className="mb-2.5 mt-6 block font-medium text-ink" htmlFor={`${labelId}-unclear`}>
        {UNCLEAR_PROMPT}
      </label>
      <textarea
        id={`${labelId}-unclear`}
        value={unclear}
        onChange={(e) => {
          setUnclear(e.target.value);
          setSaved(false);
        }}
        maxLength={MAX_UNCLEAR_LENGTH}
        rows={3}
        className="block min-h-24 w-full resize-y rounded-lg border border-rule bg-surface-elevated p-3 text-ink caret-primary"
      />

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`${weekBtnPrimary} w-full sm:w-auto`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saved ? "Update survey" : "Send survey"}
        </button>
        <span role="status" className="text-sm">
          {saved && savedThisVisit && !saving && !error && (
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <CheckCircle size={16} /> Thanks, saved
            </span>
          )}
          {error && <span className="text-red-600">{error}</span>}
        </span>
      </div>
    </>
  );

  if (variant === "plain") {
    return (
      <>
        <h2 className={weekHeading}>
          {title}
          {saved ? (
            <span className={weekStateDone}>
              <CheckCircle size={14} /> Sent
            </span>
          ) : (
            <span className={weekState}>Not sent yet</span>
          )}
        </h2>
        {form}
      </>
    );
  }

  return (
    <section className="mb-8 panel p-4 sm:p-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">{title}</p>
      {form}
    </section>
  );
}
