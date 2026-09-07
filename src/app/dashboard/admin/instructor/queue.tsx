"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, Flag } from "lucide-react";
import { buttonClass, Panel } from "@/components/ui";
import { approveCheckpointAction, resolveFlagAction, revokeCheckpointAction } from "./actions";

export type QueueFlag = {
  id: string;
  learner: string;
  trackSlug: string;
  weekNumber: number | null;
  reason: string;
  note: string;
  createdAt: string;
};

export type QueueLearner = {
  studentId: string;
  programId: string;
  trackSlug: string;
  name: string;
  workflow: string | null;
  industry: string | null;
  businessNumber: string | null;
  checkpoints: { key: string; label: string; approvedAt: string | null; score: number | null }[];
  openFlags: number;
};

const REASON_LABEL: Record<string, string> = {
  workflow_fit: "Workflow fit",
  data_rule: "Data rule",
  stuck: "Stuck",
  judgment_call: "Judgment call",
  scope: "Scope",
  other: "Other",
};

export function InstructorQueue({ flags, learners }: { flags: QueueFlag[]; learners: QueueLearner[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function run(id: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(id);
    setErr(null);
    start(async () => {
      try {
        const r = await fn();
        if (!r.ok) setErr(r.error ?? "Something went wrong.");
        router.refresh();
      } catch {
        setErr("Something went wrong.");
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="space-y-8">
      {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Office-hours agenda · {flags.length} open
        </h2>
        {flags.length === 0 ? (
          <Panel className="p-5 text-sm text-ink-soft">Nothing waiting on you. The instructor hasn&apos;t raised anything.</Panel>
        ) : (
          <Panel className="divide-y divide-rule">
            {flags.map((f) => (
              <div key={f.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Flag size={14} className="text-amber-700" />
                    {f.learner}
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      {REASON_LABEL[f.reason] ?? f.reason}
                    </span>
                    {f.weekNumber != null && <span className="text-xs text-ink-faint">unit {f.weekNumber}</span>}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{f.note}</p>
                  <p className="mt-1 text-[11px] text-ink-faint">{new Date(f.createdAt).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  disabled={busy === f.id}
                  onClick={() => {
                    const note = window.prompt("What did you decide? One line (optional).") ?? "";
                    run(f.id, () => resolveFlagAction(f.id, note));
                  }}
                  className={buttonClass("secondary", "sm")}
                >
                  {busy === f.id ? "Saving…" : "Resolve"}
                </button>
              </div>
            ))}
          </Panel>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Sign-offs · {learners.length} learners
        </h2>
        {learners.length === 0 ? (
          <Panel className="p-5 text-sm text-ink-soft">No one is enrolled in an instructor-mode course yet.</Panel>
        ) : (
          <div className="space-y-3">
            {learners.map((l) => (
              <Panel key={`${l.studentId}-${l.trackSlug}`} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {l.name}
                    {l.industry && <span className="ml-2 text-xs font-normal text-ink-faint">{l.industry}</span>}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {l.trackSlug}
                    {l.openFlags > 0 && <span className="ml-2 text-amber-800">{l.openFlags} open flag{l.openFlags === 1 ? "" : "s"}</span>}
                  </p>
                </div>
                {(l.workflow || l.businessNumber) && (
                  <p className="mt-1 text-sm text-ink-soft">
                    {l.workflow}
                    {l.businessNumber && <span className="text-ink-faint"> · {l.businessNumber}</span>}
                  </p>
                )}
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {l.checkpoints.map((c) => {
                    const id = `${l.studentId}-${l.trackSlug}-${c.key}`;
                    const done = !!c.approvedAt;
                    return (
                      <li key={c.key} className="flex items-center justify-between gap-2 rounded-md border border-rule px-3 py-2">
                        <span className="flex items-center gap-2 text-sm">
                          {done ? <CheckCircle size={15} className="text-green-600" /> : <Circle size={15} className="text-ink-faint/60" />}
                          <span className={done ? "text-ink" : "text-ink-soft"}>{c.label}</span>
                          {c.score != null && <span className="text-xs text-ink-faint">{c.score}/27</span>}
                        </span>
                        <button
                          type="button"
                          disabled={busy === id}
                          onClick={() => {
                            if (done) {
                              if (!window.confirm(`Undo "${c.label}" for ${l.name}?`)) return;
                              run(id, () => revokeCheckpointAction({ studentId: l.studentId, trackSlug: l.trackSlug, key: c.key }));
                              return;
                            }
                            let score: number | null = null;
                            if (c.key === "capstone_scored") {
                              const raw = window.prompt("Rubric total out of 27:");
                              if (raw == null) return;
                              score = Number(raw);
                              if (!Number.isInteger(score)) return;
                            }
                            const note = window.prompt("Note (optional):") ?? "";
                            run(id, () =>
                              approveCheckpointAction({
                                studentId: l.studentId,
                                programId: l.programId,
                                trackSlug: l.trackSlug,
                                key: c.key,
                                note,
                                score,
                              }),
                            );
                          }}
                          className={buttonClass(done ? "secondary" : "primary", "sm")}
                        >
                          {busy === id ? "…" : done ? "Undo" : "Sign off"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
