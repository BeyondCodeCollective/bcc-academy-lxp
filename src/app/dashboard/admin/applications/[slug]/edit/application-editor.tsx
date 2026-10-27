"use client";

import { useState } from "react";
import Link from "next/link";
import {
  toSurveyQuestion,
  toDraftQuestion,
  newDraftQuestion,
  type DraftQuestion,
} from "@/lib/application-questions";
import type { SurveyQuestion } from "@/components/survey-fields";
import { QuestionRowsEditor } from "@/components/application-questions";
import { Field, fieldInput, buttonClass } from "@/components/ui";
import { updateApplicationAction } from "../../actions";

type Details = {
  title: string;
  description: string;
  trackSlug: string;
  notifyEmail: string;
  closesAt: string;
};

export function ApplicationEditor({
  slug,
  initial,
  questions,
  hiddenQuestions,
}: {
  slug: string;
  initial: Details;
  questions: SurveyQuestion[];
  hiddenQuestions: string[];
}) {
  const [details, setDetails] = useState<Details>(initial);
  // Questions the builder can draw are editable; richer ones (likert, file,
  // month-year, zip) stay exactly as stored and can only be switched on or off.
  const [drafts, setDrafts] = useState<DraftQuestion[]>(() =>
    questions.flatMap((q) => {
      const d = toDraftQuestion(q);
      return d ? [d] : [];
    }),
  );
  const [hidden, setHidden] = useState<string[]>(hiddenQuestions);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const originalIds = new Set(questions.map((q) => q.id));
  const fixed = questions.filter((q) => !toDraftQuestion(q));
  const set = <K extends keyof Details>(key: K, value: Details[K]) => {
    setSaved(false);
    setDetails((d) => ({ ...d, [key]: value }));
  };
  const toggle = (id: string) => {
    setSaved(false);
    setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  };

  /** Stored order is kept. A draft nobody touched goes back as the original
   *  object, so fields the builder doesn't draw (placeholders, bullets) survive. */
  function finalQuestions(): SurveyQuestion[] {
    const byId = new Map(drafts.map((d) => [d.id, d]));
    const out = questions.flatMap((q) => {
      const draft = byId.get(q.id);
      const before = toDraftQuestion(q);
      if (!before) return [q];
      if (!draft) return [q];
      return [JSON.stringify(draft) === JSON.stringify(before) ? q : toSurveyQuestion(draft)];
    });
    return out.concat(drafts.filter((d) => !originalIds.has(d.id)).map(toSurveyQuestion));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const res = await updateApplicationAction(slug, {
        ...details,
        questions: finalQuestions(),
        hiddenQuestions: hidden,
      });
      if (res.ok) setSaved(true);
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <Field label="Title">
        <input
          type="text"
          required
          value={details.title}
          onChange={(e) => set("title", e.target.value)}
          className={fieldInput}
        />
      </Field>

      <Field label="Description" hint="shown above the form">
        <textarea
          rows={3}
          value={details.description}
          onChange={(e) => set("description", e.target.value)}
          className={fieldInput}
        />
      </Field>

      <Field label="Course slug" hint="accepted applicants are allowlisted for it (optional)">
        <input
          type="text"
          value={details.trackSlug}
          onChange={(e) => set("trackSlug", e.target.value)}
          className={`${fieldInput} font-mono text-xs`}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Notify on submission" hint="defaults to the program inbox">
          <input
            type="email"
            value={details.notifyEmail}
            onChange={(e) => set("notifyEmail", e.target.value)}
            className={fieldInput}
          />
        </Field>
        <Field label="Closes" hint="optional — end of day Eastern">
          <input
            type="date"
            value={details.closesAt}
            onChange={(e) => set("closesAt", e.target.value)}
            className={fieldInput}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-ink">
          Questions
          <span className="ml-2 font-normal text-xs text-ink-soft">
            untick &ldquo;Shown on form&rdquo; to turn one off. It stays here, and past answers stay readable.
          </span>
        </p>

        <QuestionRowsEditor
          questions={drafts}
          onChange={(next) => {
            setSaved(false);
            setDrafts(next);
          }}
          hidden={hidden}
          onToggleHidden={toggle}
          lockedIds={[...originalIds]}
        />

        {fixed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-ink-soft">
              These use a format this editor can&apos;t change. You can still turn them on or off.
            </p>
            {fixed.map((q) => (
              <label
                key={q.id}
                className={`flex items-center gap-2 rounded-lg border border-ink/10 p-3 text-sm text-ink ${hidden.includes(q.id) ? "opacity-60" : ""}`}
              >
                <input type="checkbox" checked={!hidden.includes(q.id)} onChange={() => toggle(q.id)} />
                <span className="flex-1">{q.label}</span>
                <span className="text-xs text-ink-soft">Shown on form</span>
              </label>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setSaved(false);
            setDrafts((d) => [...d, newDraftQuestion()]);
          }}
          className={buttonClass("secondary", "sm")}
        >
          + Add question
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {saved && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Saved. Live at /apply/{slug}.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={`${buttonClass("primary", "md")} flex-1`}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <Link href={`/dashboard/admin/applications/${slug}`} className={buttonClass("secondary", "md")}>
          Back to submissions
        </Link>
      </div>
    </form>
  );
}
