"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuestionRenderer, isPageValid, type SurveyQuestion } from "@/components/survey-fields";
import { buttonClass } from "@/components/ui";
import { submitChecklistForm } from "@/lib/onboarding/actions";

export function ChecklistForm({
  trackSlug,
  itemId,
  programSlug,
  title,
  description,
  questions,
}: {
  trackSlug: string;
  itemId: string;
  programSlug: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = isPageValid(questions, answers);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await submitChecklistForm(trackSlug, itemId, answers, programSlug);
      if (res.ok) {
        router.push(`/dashboard/track/${trackSlug}`);
        router.refresh();
        return;
      }
      setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setPending(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <Link
          href={`/dashboard/track/${trackSlug}`}
          className="text-xs font-semibold text-ink-soft hover:text-ink"
        >
          ← Back to your checklist
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft">{description}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q) => (
          <section key={q.id} className="panel p-5">
            <QuestionRenderer
              question={q}
              value={answers[q.id]}
              onChange={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
            />
          </section>
        ))}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={!ready || pending}
          className={`${buttonClass("primary", "md")} w-full disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {pending ? "Saving…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
