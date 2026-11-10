"use client";

import { useState } from "react";
import {
  toSurveyQuestion,
  toDraftQuestion,
  newDraftQuestion,
  type DraftQuestion,
} from "@/lib/application-questions";
import { QuestionRowsEditor } from "@/components/application-questions";
import { Field, fieldInput, buttonClass, Panel } from "@/components/ui";
import {
  saveOnboardingChecklistAction,
  resetOnboardingChecklistAction,
  type ChecklistInput,
} from "../actions";

export type EditorState = ChecklistInput;

type Row = ChecklistInput["items"][number] & { drafts: DraftQuestion[] };

const KIND_LABEL = { survey: "Built-in form", agreement: "Participation agreement", form: "Custom form" } as const;

function toRows(items: ChecklistInput["items"]): Row[] {
  return items.map((i) => ({
    ...i,
    drafts: i.questions.flatMap((q) => {
      const d = toDraftQuestion(q);
      return d ? [d] : [];
    }),
  }));
}

export function OnboardingEditor({
  trackSlug,
  initial,
  hasSaved,
  hasBuiltIn,
  enrolled,
  done,
}: {
  trackSlug: string;
  initial: EditorState;
  /** A checklist saved from this screen exists for the course. */
  hasSaved: boolean;
  /** The course still runs on the checklist built into the code. */
  hasBuiltIn: boolean;
  enrolled: number;
  /** Enrolled learners who finished each step, by step id. */
  done: Record<string, number>;
}) {
  const [d, setD] = useState(initial);
  const [rows, setRows] = useState<Row[]>(() => toRows(initial.items));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [custom, setCustom] = useState(hasSaved);

  const touch = () => setSaved(false);
  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    touch();
    setD((s) => ({ ...s, [key]: value }));
  };
  const patchRow = (i: number, changes: Partial<Row>) => {
    touch();
    setRows((rs) => rs.map((r, n) => (n === i ? { ...r, ...changes } : r)));
  };
  const move = (i: number, by: -1 | 1) => {
    touch();
    setRows((rs) => {
      const j = i + by;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const addRow = (row: Row) => {
    touch();
    setRows((rs) => [...rs, row]);
  };

  const hasIntake = rows.some((r) => r.surveyType === "bcc-learner-intake");
  const hasAgreement = rows.some((r) => r.kind === "agreement");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const res = await saveOnboardingChecklistAction(trackSlug, {
        ...d,
        items: rows.map(({ drafts, ...r }) => ({
          ...r,
          questions: r.kind === "form" ? drafts.map(toSurveyQuestion) : [],
        })),
      });
      if (res.ok) {
        setSaved(true);
        setCustom(true);
      } else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function reset() {
    setError(null);
    setPending(true);
    try {
      const res = await resetOnboardingChecklistAction(trackSlug);
      if (res.ok) window.location.reload();
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Panel className="space-y-4 p-5">
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={!d.paused}
            onChange={(e) => set("paused", !e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-rule"
          />
          <span>
            <span className="font-semibold">Hold learners until they finish</span>
            <span className="block text-xs text-ink-soft">
              When on, enrolled learners see this checklist instead of the course until every step is done and
              the course has started. {enrolled} learner{enrolled === 1 ? " is" : "s are"} enrolled now.
            </span>
          </span>
        </label>
        {!custom && hasBuiltIn && (
          <p className="text-xs text-ink-soft">
            This course uses the checklist built into the platform. Saving here replaces it for this course only.
          </p>
        )}
      </Panel>

      <Panel className="space-y-5 p-5">
        <Field label="Title">
          <input type="text" required value={d.title} onChange={(e) => set("title", e.target.value)} className={fieldInput} />
        </Field>
        <Field label="Intro" hint="shown under the title">
          <textarea rows={3} value={d.intro} onChange={(e) => set("intro", e.target.value)} className={fieldInput} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Small label" hint='above the title, e.g. "Welcome to MASS"'>
            <input type="text" value={d.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className={fieldInput} />
          </Field>
          <Field label="Cohort name" hint="recorded with a signed agreement">
            <input type="text" value={d.cohort} onChange={(e) => set("cohort", e.target.value)} className={fieldInput} />
          </Field>
        </div>
        <Field label="Line under the list" hint="optional, e.g. the deadline">
          <input type="text" value={d.footnote} onChange={(e) => set("footnote", e.target.value)} className={fieldInput} />
        </Field>
        <Field label="All-done headline" hint="optional">
          <input type="text" value={d.completeTitle} onChange={(e) => set("completeTitle", e.target.value)} className={fieldInput} />
        </Field>
      </Panel>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-ink">
          Steps
          <span className="ml-2 text-xs font-normal text-ink-soft">in the order learners see them</span>
        </p>

        {rows.map((r, i) => (
          <Panel key={r.id} className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {i + 1}. {KIND_LABEL[r.kind]}
              </span>
              {enrolled > 0 && (
                <span className="text-xs text-ink-soft">
                  {done[r.id] ?? 0} of {enrolled} done
                </span>
              )}
              <span className="ml-auto flex items-center gap-3 text-xs">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="text-ink-soft hover:text-ink disabled:opacity-30">
                  Up
                </button>
                <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="text-ink-soft hover:text-ink disabled:opacity-30">
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => {
                    touch();
                    setRows((rs) => rs.filter((_, n) => n !== i));
                  }}
                  className="text-ink-soft hover:text-red-600"
                >
                  Remove
                </button>
              </span>
            </div>

            <Field label="Step name">
              <input type="text" required value={r.label} onChange={(e) => patchRow(i, { label: e.target.value })} className={fieldInput} />
            </Field>
            <Field label="What learners see" hint="one line under the name">
              <input type="text" value={r.description} onChange={(e) => patchRow(i, { description: e.target.value })} className={fieldInput} />
            </Field>

            {r.kind === "form" && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-ink">Questions</p>
                <QuestionRowsEditor questions={r.drafts} onChange={(drafts) => patchRow(i, { drafts })} />
                <button
                  type="button"
                  onClick={() => patchRow(i, { drafts: [...r.drafts, newDraftQuestion()] })}
                  className={buttonClass("secondary", "sm")}
                >
                  + Add question
                </button>
              </div>
            )}
          </Panel>
        ))}

        <div className="flex flex-wrap gap-2">
          {!hasIntake && (
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() =>
                addRow({
                  id: "intake",
                  kind: "survey",
                  label: "Learner Intake Form",
                  description: "A few quick questions so we know who we're serving.",
                  surveyType: "bcc-learner-intake",
                  questions: [],
                  drafts: [],
                })
              }
            >
              + Learner intake form
            </button>
          )}
          {!hasAgreement && (
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() =>
                addRow({
                  id: "agreement",
                  kind: "agreement",
                  label: "Participation Agreement",
                  description: "Review and sign your commitment to the program expectations.",
                  surveyType: "",
                  questions: [],
                  drafts: [],
                })
              }
            >
              + Participation agreement
            </button>
          )}
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() =>
              addRow({
                id: `form-${crypto.randomUUID().slice(0, 8)}`,
                kind: "form",
                label: "",
                description: "",
                surveyType: "",
                questions: [],
                drafts: [newDraftQuestion()],
              })
            }
          >
            + Custom form
          </button>
        </div>
      </div>

      {hasAgreement && (
        <Panel className="space-y-4 p-5">
          <p className="text-sm font-semibold text-ink">Participation agreement</p>
          <Field label="Time commitment" hint="the first bullet of the agreement, e.g. the weeks and weekly hours">
            <textarea rows={3} value={d.timeCommitment} onChange={(e) => set("timeCommitment", e.target.value)} className={fieldInput} />
          </Field>
          <label className="flex items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={d.requireReleases}
              onChange={(e) => set("requireReleases", e.target.checked)}
              className="h-4 w-4 rounded border-rule"
            />
            Also collect the liability and media releases
          </label>
        </Panel>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {saved && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Saved. {d.paused ? "The checklist is off, so learners are not held yet." : "Learners now see it on their course page."}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || rows.length === 0} className={`${buttonClass("primary", "md")} flex-1`}>
          {pending ? "Saving…" : "Save checklist"}
        </button>
        {custom && (
          <button type="button" disabled={pending} onClick={reset} className={buttonClass("secondary", "md")}>
            Reset to built-in
          </button>
        )}
      </div>
    </form>
  );
}
