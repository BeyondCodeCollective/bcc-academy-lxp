"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { SURVEY_SAMPLE_CSV, type SurveyQuestion } from "@/lib/event-survey";
import { saveSurveyQuestions } from "./actions";

const TYPE_LABEL = { rating: "Rating 1 to 5", yesno: "Yes / no", text: "Free text", choice: "Multiple choice" } as const;

export function SurveyEditor({ eventId, initial }: { eventId: string; initial: SurveyQuestion[] | null }) {
  const [questions, setQuestions] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(csv: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await saveSurveyQuestions(eventId, csv);
      if (res.ok) setQuestions(res.questions);
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await save(await file.text());
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-rule bg-white p-5">
        <h2 className="text-sm font-semibold text-ink">{questions ? "Custom questions" : "Default questions (rating, recommend, enjoyed, improve)"}</h2>
        {questions ? (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink">
            {questions.map((q, i) => (
              <li key={i}>
                {q.prompt} <span className="text-ink-soft">({TYPE_LABEL[q.type]}{q.options ? `: ${q.options.join(", ")}` : ""})</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">No custom survey uploaded for this event.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className={`${buttonClass("primary", "sm")} cursor-pointer`}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Upload CSV
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} className="sr-only" />
        </label>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(SURVEY_SAMPLE_CSV)}`}
          download="survey-template.csv"
          className="text-sm text-ink-soft underline hover:text-ink"
        >
          Download template
        </a>
        {questions && (
          <button type="button" disabled={busy} onClick={() => save(null)} className={buttonClass("secondary", "sm")}>
            Use default questions
          </button>
        )}
      </div>
      <p className="text-xs text-ink-soft">
        Columns: question, type (rating, yesno, text or choice), options (choice only, separated by |). Up to 20
        questions. Families who already answered keep their answers.
      </p>
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
