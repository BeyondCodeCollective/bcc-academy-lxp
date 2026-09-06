"use client";

import { useState } from "react";
import type { SurveyQuestion } from "@/components/survey-fields";
import { toSlug } from "@/lib/programs/slug";
import { Field, fieldInput, buttonClass } from "@/components/ui";
import { createApplicationAction } from "../actions";

// The subset of question types an admin builds by hand. The renderer supports
// more (likert, file, …); those arrive via AI generation or code when needed.
const QUESTION_TYPES = [
  { value: "text", label: "Long answer" },
  { value: "text-short", label: "Short answer" },
  { value: "radio", label: "Pick one" },
  { value: "multi-select", label: "Pick any" },
  { value: "select", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "consent", label: "Consent checkbox" },
] as const;

type BuilderQuestion = {
  id: string;
  kind: (typeof QUESTION_TYPES)[number]["value"];
  label: string;
  optionsText: string;
  required: boolean;
};

function toSurveyQuestion(q: BuilderQuestion): SurveyQuestion {
  const options = q.optionsText
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
  const base = { id: q.id, label: q.label.trim(), required: q.required };
  switch (q.kind) {
    case "text":
      return { ...base, type: "text" };
    case "text-short":
      return { ...base, type: "text", short: true };
    case "radio":
      return { ...base, type: "radio", options };
    case "multi-select":
      return { ...base, type: "multi-select", options };
    case "select":
      return { ...base, type: "select", options };
    case "date":
      return { ...base, type: "date" };
    case "consent":
      // Consent must be affirmative to mean anything. The label doubles as
      // the lead text; the checkbox line is a standard confirmation.
      return {
        ...base,
        type: "consent",
        text: q.label.trim(),
        confirmLabel: "I understand and agree",
        required: true,
      };
  }
}

export function ApplicationBuilder() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trackSlug, setTrackSlug] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      {
        id: `q-${crypto.randomUUID().slice(0, 8)}`,
        kind: "text",
        label: "",
        optionsText: "",
        required: true,
      },
    ]);
  }

  function patchQuestion(i: number, changes: Partial<BuilderQuestion>) {
    setQuestions((qs) => qs.map((q, n) => (n === i ? { ...q, ...changes } : q)));
  }

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
  const needsOptions = (k: BuilderQuestion["kind"]) =>
    k === "radio" || k === "multi-select" || k === "select";

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

        {questions.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-ink/10 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={q.kind}
                onChange={(e) =>
                  patchQuestion(i, { kind: e.target.value as BuilderQuestion["kind"] })
                }
                className={`${fieldInput} w-44`}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={q.kind === "consent" ? true : q.required}
                  disabled={q.kind === "consent"}
                  onChange={(e) => patchQuestion(i, { required: e.target.checked })}
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => setQuestions((qs) => qs.filter((_, n) => n !== i))}
                className="ml-auto text-xs text-ink-soft transition-colors hover:text-red-600"
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              required
              value={q.label}
              onChange={(e) => patchQuestion(i, { label: e.target.value })}
              placeholder="Question text"
              className={fieldInput}
            />
            {needsOptions(q.kind) && (
              <textarea
                rows={3}
                value={q.optionsText}
                onChange={(e) => patchQuestion(i, { optionsText: e.target.value })}
                placeholder={"One option per line"}
                className={`${fieldInput} text-sm`}
              />
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addQuestion}
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
