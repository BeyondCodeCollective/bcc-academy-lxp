"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SurveyQuestion } from "@/components/survey-fields";
import type { ApplicationSubmission, SubmissionStatus } from "@/lib/applications";
import { buttonClass } from "@/components/ui";
import { setSubmissionStatusAction, setApplicationOpenAction } from "../actions";

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  new: "bg-primary/10 text-primary",
  accepted: "bg-green-100 text-green-700",
  waitlisted: "bg-amber-100 text-amber-700",
  declined: "bg-paper-tint text-ink-faint",
};

/** Render one stored answer the way a reviewer wants to read it. */
function answerText(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ReviewQueue({
  slug,
  open,
  questions,
  submissions,
}: {
  slug: string;
  open: boolean;
  questions: SurveyQuestion[];
  submissions: ApplicationSubmission[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, status: SubmissionStatus) {
    setBusy(id);
    await setSubmissionStatusAction(id, status);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-ink/10 bg-surface-muted px-4 py-3">
        <p className="text-sm text-ink-soft">
          {open ? "The form is live and accepting submissions." : "The form is closed."}
        </p>
        <button
          type="button"
          onClick={async () => {
            await setApplicationOpenAction(slug, !open);
            router.refresh();
          }}
          className={buttonClass("secondary", "sm")}
        >
          {open ? "Close applications" : "Reopen applications"}
        </button>
      </div>

      {submissions.length === 0 ? (
        <p className="rounded-lg border border-ink/10 bg-surface-muted px-4 py-6 text-center text-sm text-ink-soft">
          No submissions yet. Share bccacademy.io/apply/{slug} to start collecting.
        </p>
      ) : (
        submissions.map((s) => (
          <details key={s.id} className="rounded-lg border border-ink/10 bg-surface-elevated">
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <span className="font-medium text-ink">{s.fullName ?? s.email}</span>
              <span className="text-sm text-ink-soft">{s.email}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-micro font-semibold ${STATUS_STYLE[s.status]}`}
              >
                {s.status}
              </span>
              <span className="ml-auto text-xs text-ink-faint">
                {new Date(s.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </summary>

            <div className="space-y-3 border-t border-rule px-4 py-4">
              {questions.map((q) => (
                <div key={q.id}>
                  <p className="text-xs font-semibold text-ink-soft">{q.label}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">
                    {answerText(s.answers[q.id])}
                  </p>
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-3">
                <button
                  type="button"
                  disabled={busy === s.id || s.status === "accepted"}
                  onClick={() => decide(s.id, "accepted")}
                  className={buttonClass("primary", "sm")}
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busy === s.id || s.status === "waitlisted"}
                  onClick={() => decide(s.id, "waitlisted")}
                  className={buttonClass("secondary", "sm")}
                >
                  Waitlist
                </button>
                <button
                  type="button"
                  disabled={busy === s.id || s.status === "declined"}
                  onClick={() => decide(s.id, "declined")}
                  className={buttonClass("secondary", "sm")}
                >
                  Decline
                </button>
                {s.reviewedBy && (
                  <span className="ml-auto text-xs text-ink-faint">
                    reviewed by {s.reviewedBy}
                  </span>
                )}
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
