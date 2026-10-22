"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { buttonClass } from "@/components/ui";
import type { SurveyAnswerValue, SurveyQuestion } from "@/lib/event-survey";
import { submitCustomEventSurvey } from "./actions";
import { CHOICE_BASE, CHOICE_OFF, CHOICE_ON, INPUT_CLASS, LABEL_CLASS } from "./survey-form";

export function CustomSurveyForm({
  token,
  questions,
  initial,
}: {
  token: string;
  questions: SurveyQuestion[];
  initial: SurveyAnswerValue[] | null;
}) {
  const [values, setValues] = useState<SurveyAnswerValue[]>(() => questions.map((_, i) => initial?.[i] ?? null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (i: number, v: SurveyAnswerValue) => setValues((s) => s.map((x, j) => (j === i ? v : x)));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitCustomEventSurvey(token, values);
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

  const choices = (i: number, opts: { label: string; value: SurveyAnswerValue }[], className = "") => (
    <div className={`flex flex-wrap gap-2 ${className}`} role="radiogroup" aria-label={questions[i].prompt}>
      {opts.map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={values[i] === o.value}
          onClick={() => set(i, o.value)}
          className={`${CHOICE_BASE} ${className ? "flex-1" : ""} ${values[i] === o.value ? CHOICE_ON : CHOICE_OFF}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl px-5 pb-20" noValidate>
      <div className="space-y-6 rounded-lg border border-rule bg-white p-6">
        {questions.map((q, i) => (
          <fieldset key={i}>
            <legend className={LABEL_CLASS}>{q.prompt}</legend>
            {q.type === "rating" && choices(i, [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n })), "gap-2")}
            {q.type === "yesno" &&
              choices(i, [
                { label: "Yes", value: true },
                { label: "No", value: false },
              ])}
            {q.type === "choice" && choices(i, (q.options ?? []).map((o) => ({ label: o, value: o })))}
            {q.type === "text" && (
              <textarea
                rows={3}
                aria-label={q.prompt}
                value={typeof values[i] === "string" ? (values[i] as string) : ""}
                onChange={(e) => set(i, e.target.value)}
                className={INPUT_CLASS}
              />
            )}
          </fieldset>
        ))}
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
