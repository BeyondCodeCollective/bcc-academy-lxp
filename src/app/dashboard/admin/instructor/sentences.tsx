"use client";

import { useState } from "react";
import { ChevronDown, Check, Clock } from "lucide-react";

// What the room wrote. The 90-minute session writes a reflection and a
// completion, not flags and checkpoints, so none of it reaches the queue above
// — this is the only place the sentences are readable outside the database.

export type SessionSentence = {
  studentId: string;
  name: string;
  email: string | null;
  trackSlug: string;
  weekNumber: number;
  prompt: string;
  sentence: string;
  submittedAt: string | null;
  finished: boolean;
};

export function SessionSentences({ rows, enrolled }: { rows: SessionSentence[]; enrolled: number }) {
  const [open, setOpen] = useState(true);
  const written = rows.filter((r) => r.sentence.trim().length > 0);

  return (
    <section className="panel overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-ink">What the room wrote</h2>
          <p className="text-micro text-ink-faint mt-0.5">
            {written.length} of {enrolled} enrolled have finished the session
          </p>
        </div>
        <ChevronDown size={14} className={`text-ink-faint shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-rule-soft">
          {written.length === 0 ? (
            <p className="text-sm text-ink-faint py-8 text-center">
              Nobody has finished the session yet.
            </p>
          ) : (
            <ul className="divide-y divide-rule-soft">
              {written.map((r) => (
                <li key={`${r.studentId}-${r.trackSlug}-${r.weekNumber}`} className="px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{r.name}</p>
                    <span className="text-micro text-ink-faint shrink-0 inline-flex items-center gap-1">
                      {r.finished ? <Check size={11} className="text-green-600" /> : <Clock size={11} />}
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "not submitted"}
                    </span>
                  </div>
                  <p className="text-micro text-ink-faint mt-1.5">{r.prompt}</p>
                  <p className="text-sm text-ink mt-1 whitespace-pre-wrap">{r.sentence}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
