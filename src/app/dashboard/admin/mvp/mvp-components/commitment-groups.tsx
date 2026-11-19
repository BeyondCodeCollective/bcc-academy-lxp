"use client";

import { useState } from "react";
import { NewCommitment, type CommitmentDraft } from "./new-commitment";

type PreviewCommitment = { id: string; metrics: string[]; draft: CommitmentDraft };

export function CommitmentGroups() {
  const [commitments, setCommitments] = useState<PreviewCommitment[]>([]);
  const [notice, setNotice] = useState("");
  return <section className="panel min-w-0 p-5 sm:p-6" aria-labelledby="commitment-groups-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id="commitment-groups-heading" className="text-xl font-semibold text-ink">Funder and Partner Commitments</h2>
        <p className="mt-2 text-sm text-ink-soft">Create a preview commitment, then edit its details and metrics as needed.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="shrink-0 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Layout preview</span>
        <NewCommitment onCreate={draft => {
          setCommitments(current => [...current, { id: `commitment-${current.length + 1}`, metrics: draft.metrics.map((_, index) => `metric-${index + 1}`), draft }]);
          setNotice("Preview commitment added below. It will not be saved after a refresh.");
        }} />
      </div>
    </div>
    <p role="status" className="mt-3 text-sm text-ink-soft">{notice}</p>
    {commitments.length === 0 && <p className="mt-5 rounded-lg border border-rule p-5 text-sm text-ink-soft">No commitments yet. Select New commitment to create your first preview card.</p>}
    <ul className="mt-5 space-y-4" aria-label="Preview commitments">
      {commitments.map(({ id, metrics, draft }) => <li key={id}>
        <article className="min-w-0 rounded-lg border border-rule bg-slate-50 p-4 sm:p-5" aria-labelledby={`${id}-heading`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="break-words text-sm font-semibold text-ink">{draft.partner}</p>
            <NewCommitment editing initialDraft={draft} onCreate={updated => {
              setCommitments(current => current.map(commitment => commitment.id === id
                ? { ...commitment, draft: updated, metrics: updated.metrics.map((_, index) => `metric-${index + 1}`) }
                : commitment));
              setNotice("Preview commitment updated. Changes will not be saved after a refresh.");
            }} />
          </div>
          <h3 id={`${id}-heading`} className="mt-2 break-words text-lg font-semibold text-ink">{draft.name}</h3>
          <div className="mt-4">
            <p className="text-sm font-medium text-ink-soft">Linked Program</p>
            <p className="mt-1 break-words text-sm text-ink">{draft.program}</p>
          </div>
          <div className="mt-5">
            <h4 id={`${id}-metrics-heading`} className="text-sm font-semibold text-ink">{metrics.length === 1 ? "Metric" : "Metrics"}</h4>
            <ul className="mt-3 space-y-3" aria-labelledby={`${id}-metrics-heading`}>
              {metrics.map((metricId, index) => <li key={metricId} className="min-w-0 rounded-lg border border-rule bg-white p-4">
                <div className="flex min-w-0 flex-wrap items-start gap-x-6 gap-y-4">
                  <div className="min-w-0 grow basis-48">
                    <p className="text-xs text-ink-soft">Metric {index + 1}</p>
                    <h5 className="mt-1 break-words text-sm font-semibold text-ink">{draft.metrics[index]?.name}</h5>
                    <p className="mt-2 break-words text-xs text-ink-soft">Source: {draft.metrics[index]?.source || "Not specified"}</p>
                  </div>
                  <dl className="flex min-w-0 grow basis-72 flex-wrap gap-x-6 gap-y-4 text-sm">
                    <div className="min-w-0 grow basis-28">
                      <dt className="text-xs text-ink-soft">Actual / Target</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-ink"><span aria-label="Actual unavailable">—</span> / {draft?.metrics[index]?.target || <span aria-label="Target unavailable">—</span>}</dd>
                      <dd className="mt-1 text-xs text-ink-soft">Progress unavailable</dd>
                    </div>
                    <div className="min-w-0 grow basis-36">
                      <dt className="text-xs text-ink-soft">Reporting period</dt>
                      <dd className="mt-1 break-words text-ink">{draft.period || "Not specified"}</dd>
                      <dt className="mt-2 text-xs text-ink-soft">Deadline</dt>
                      <dd className="mt-1 break-words text-ink">{draft.deadline || "Not specified"}</dd>
                    </div>
                    <div className="min-w-0 grow basis-24">
                      <dt className="text-xs text-ink-soft">Owner</dt>
                      <dd className="mt-1 break-words text-ink">{draft.owner || "Not specified"}</dd>
                    </div>
                  </dl>
                  <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-ink-soft">Not evaluated</span>
                </div>
              </li>)}
            </ul>
          </div>
        </article>
      </li>)}
    </ul>
    <p className="mt-4 text-xs text-ink-soft">Preview only. Added commitments and edits are not saved after a refresh.</p>
  </section>;
}
