"use client";

// The editable question list — used by the manual application builder AND the
// cohort-brief importer's review step. The shapes and converter live in
// src/lib/application-questions.ts so server actions share them.

import {
  QUESTION_KINDS,
  needsOptions,
  type DraftQuestion,
  type QuestionKind,
} from "@/lib/application-questions";
import { fieldInput } from "@/components/ui";

/** Controlled: the parent owns the array. */
export function QuestionRowsEditor({
  questions,
  onChange,
}: {
  questions: DraftQuestion[];
  onChange: (questions: DraftQuestion[]) => void;
}) {
  function patch(i: number, changes: Partial<DraftQuestion>) {
    onChange(questions.map((q, n) => (n === i ? { ...q, ...changes } : q)));
  }

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-lg border border-ink/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={q.kind}
              onChange={(e) => patch(i, { kind: e.target.value as QuestionKind })}
              className={`${fieldInput} w-44`}
            >
              {QUESTION_KINDS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={q.kind === "consent" ? true : q.required}
                disabled={q.kind === "consent"}
                onChange={(e) => patch(i, { required: e.target.checked })}
              />
              Required
            </label>
            <button
              type="button"
              onClick={() => onChange(questions.filter((_, n) => n !== i))}
              className="ml-auto text-xs text-ink-soft transition-colors hover:text-red-600"
            >
              Remove
            </button>
          </div>
          <input
            type="text"
            required
            value={q.label}
            onChange={(e) => patch(i, { label: e.target.value })}
            placeholder="Question text"
            className={fieldInput}
          />
          {needsOptions(q.kind) && (
            <textarea
              rows={3}
              value={q.options.join("\n")}
              onChange={(e) => patch(i, { options: e.target.value.split("\n") })}
              placeholder="One option per line"
              className={`${fieldInput} text-sm`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
