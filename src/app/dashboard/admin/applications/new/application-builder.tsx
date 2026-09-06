"use client";

import { useState } from "react";
import {
  toSurveyQuestion,
  newDraftQuestion,
  type DraftQuestion,
} from "@/lib/application-questions";
import { QuestionRowsEditor } from "@/components/application-questions";
import { toSlug } from "@/lib/programs/slug";
import { Field, fieldInput, buttonClass } from "@/components/ui";
import { createApplicationAction } from "../actions";

export function ApplicationBuilder() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trackSlug, setTrackSlug] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await createApplicationAction({
        title,
        description,
        trackSlug,
        notifyEmail,
        closesAt,
        questions: questions.map(toSurveyQuestion),
      });
      if (res.ok) setCreatedSlug(res.slug);
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (createdSlug) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-3">
        <p className="text-sm font-semibold text-green-800">✓ Application created</p>
        <p className="font-mono text-sm text-green-700 break-all">
          https://bccacademy.io/apply/{createdSlug}
        </p>
        <a
          href={`/dashboard/admin/applications/${createdSlug}`}
          className={`${buttonClass("primary", "md")} block text-center`}
        >
          Review submissions →
        </a>
      </div>
    );
  }

  const slug = toSlug(title);

  return (
    <form onSubmit={handleCreate} className="space-y-5">
      <Field label="Title" hint="e.g. She's Built for This — Spring 2027">
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={fieldInput}
        />
        {slug && (
          <p className="mt-1.5 font-mono text-xs text-ink-soft">
            bccacademy.io/apply/<span className="text-primary">{slug}</span>
          </p>
        )}
      </Field>

      <Field label="Description" hint="shown above the form — what it is, who it's for, key dates">
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={fieldInput}
        />
      </Field>

      <Field
        label="Course slug"
        hint="the cohort this feeds — accepted applicants are allowlisted for it (optional, can link later)"
      >
        <input
          type="text"
          value={trackSlug}
          onChange={(e) => setTrackSlug(e.target.value)}
          placeholder="shes-built-for-this-spring-2027"
          className={`${fieldInput} font-mono text-xs`}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Notify on submission" hint="defaults to the program inbox">
          <input
            type="email"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
            className={fieldInput}
          />
        </Field>
        <Field label="Closes" hint="optional — end of day Eastern">
          <input
            type="date"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className={fieldInput}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-ink">
          Questions
          <span className="ml-2 font-normal text-xs text-ink-soft">
            name and email are always collected — don&apos;t add them again
          </span>
        </p>

        <QuestionRowsEditor questions={questions} onChange={setQuestions} />

        <button
          type="button"
          onClick={() => setQuestions((qs) => [...qs, newDraftQuestion()])}
          className={`${buttonClass("secondary", "sm")}`}
        >
          + Add question
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || questions.length === 0}
        className={`${buttonClass("primary", "md")} w-full`}
      >
        {pending ? "Creating…" : "Create application"}
      </button>
    </form>
  );
}
