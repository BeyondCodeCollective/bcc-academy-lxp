"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveSurveyResponse } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";
import type { IntakeQuestion } from "@/lib/programs/types";
import { buttonClass } from "@/components/ui";

interface Props {
  trackSlug: string;
  trackName: string;
  programSlug: string;
  questions: IntakeQuestion[];
}

export function IntakeForm({
  trackSlug,
  trackName,
  programSlug,
  questions,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateAnswer(id: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function isValid(): boolean {
    for (const q of questions) {
      if (!q.required) continue;
      const val = answers[q.id];
      if (q.type === "multi-select") {
        if (!Array.isArray(val) || val.length === 0) return false;
      } else {
        if (!val || (typeof val === "string" && !val.trim())) return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid()) return;
    setSubmitting(true);
    setError("");
    try {
      await saveSurveyResponse(`intake-${trackSlug}`, answers, programSlug);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">
          Quick Registration
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Answer a few questions before accessing <strong>{trackName}</strong>{" "}
          content. This helps us understand who we&apos;re reaching.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => updateAnswer(q.id, val)}
          />
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!isValid() || submitting}
          className={`${buttonClass("primary", "md")} w-full`}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check size={16} />
              Continue to Session
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Question Field ──────────────────────────────────────────────────────────

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: IntakeQuestion;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  switch (question.type) {
    case "radio":
      return (
        <RadioField
          question={question}
          value={value as string}
          onChange={onChange}
        />
      );
    case "multi-select":
      return (
        <MultiSelectField
          question={question}
          value={value as string[]}
          onChange={onChange}
        />
      );
    case "text":
      return (
        <TextField
          question={question}
          value={value as string}
          onChange={onChange}
        />
      );
  }
}

function RadioField({
  question,
  value,
  onChange,
}: {
  question: IntakeQuestion & { type: "radio" };
  value: string | undefined;
  onChange: (val: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink mb-2">
        {question.label}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </legend>
      <div className="space-y-1.5">
        {question.options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2.5 border px-3.5 py-2.5 cursor-pointer transition-colors ${
              value === opt
                ? "border-ink bg-ink/5"
                : "border-rule bg-white hover:border-ink-faint"
            }`}
          >
            <input
              type="radio"
              name={question.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-3.5 w-3.5 border-rule text-ink focus:ring-ink-faint"
            />
            <span className="text-sm text-ink">{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function MultiSelectField({
  question,
  value,
  onChange,
}: {
  question: IntakeQuestion & { type: "multi-select" };
  value: string[] | undefined;
  onChange: (val: string[]) => void;
}) {
  const selected = value ?? [];

  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink mb-2">
        {question.label}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </legend>
      <div className="space-y-1.5">
        {question.options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2.5 border px-3.5 py-2.5 cursor-pointer transition-colors ${
              selected.includes(opt)
                ? "border-ink bg-ink/5"
                : "border-rule bg-white hover:border-ink-faint"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="h-3.5 w-3.5 rounded border-rule text-ink focus:ring-ink-faint"
            />
            <span className="text-sm text-ink">{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TextField({
  question,
  value,
  onChange,
}: {
  question: IntakeQuestion & { type: "text" };
  value: string | undefined;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-ink mb-2 block">
        {question.label}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        rows={3}
        className="w-full border border-rule bg-white px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:ring-1 focus:ring-ink-faint focus:outline-none transition-all resize-none"
      />
    </div>
  );
}
