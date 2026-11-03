"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { submitExitSurvey } from "@/app/dashboard/track/exit-survey-actions";
import { buttonClass } from "@/components/ui";
import { MAX_UNCLEAR_LENGTH, UNCLEAR_PROMPT, UNDERSTANDING_PROMPT } from "@/lib/exit-survey";

export function ExitSurveyForm({
  trackSlug,
  weekNumber,
  sessionNumber,
  title,
  initialRating,
  initialUnclear,
}: {
  trackSlug: string;
  weekNumber: number;
  sessionNumber: number;
  /** Shown above the questions, e.g. "Session 2 exit survey". */
  title: string;
  initialRating: number | null;
  initialUnclear: string | null;
}) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [unclear, setUnclear] = useState(initialUnclear ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initialRating !== null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">{title}</p>

      <p id={labelId} className="mt-3 text-sm font-medium text-ink">
        {UNDERSTANDING_PROMPT}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="mt-2 flex items-center gap-2">
        <span className="text-xs text-ink-faint">Strongly disagree</span>
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
            className={`min-h-[44px] min-w-[44px] rounded-lg border text-sm font-semibold transition-colors ${
              rating === n
                ? "border-primary bg-primary text-white"
                : "border-neutral-200 bg-white text-ink hover:border-ink"
            }`}
          >
            {n}
          </button>
        ))}
        <span className="text-xs text-ink-faint">Strongly agree</span>
      </div>

      <label className="mt-4 block text-sm font-medium text-ink" htmlFor={`${labelId}-unclear`}>
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
        className="mt-1 w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-ink"
      />

      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className={buttonClass("primary", "sm")}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saved ? "Update" : "Submit"}
        </button>
        {saved && !saving && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
            <CheckCircle size={14} /> Thanks, saved
          </span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </section>
  );
}
