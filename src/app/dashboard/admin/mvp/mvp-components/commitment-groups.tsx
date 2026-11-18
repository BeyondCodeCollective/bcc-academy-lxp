"use client";

import { useState } from "react";
import { NewCommitment, type CommitmentDraft } from "./new-commitment";

// Illustrative layout fixtures only; these are not stored commitments or
// approved partner relationships. Keep them separate from live summary data.
const PLACEHOLDER_COMMITMENTS: { id: string; metrics: string[]; draft?: CommitmentDraft }[] = [
  { id: "commitment-1", metrics: ["metric-1"] },
  { id: "commitment-2", metrics: ["metric-1"] },
  { id: "commitment-3", metrics: ["metric-1"] },
];
const LINKED_SCOPES = [
  { label: "Cohort", value: "[] cohort" },
  { label: "Course", value: "[] course" },
];

export function CommitmentGroups() {
  const [commitments, setCommitments] = useState(PLACEHOLDER_COMMITMENTS);
  const [notice, setNotice] = useState("");
  return <section className="panel min-w-0 p-5 sm:p-6" aria-labelledby="commitment-groups-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id="commitment-groups-heading" className="text-xl font-semibold text-ink">Funder and Partner Commitments</h2>
        <p className="mt-2 text-sm text-ink-soft">Commitment records are not available here yet. The examples below preview the layout.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="shrink-0 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Layout preview</span>
        <NewCommitment onCreate={draft => {
          setCommitments(current => [...current, { id: `commitment-${current.length + 1}`, metrics: ["metric-1"], draft }]);
          setNotice("Preview commitment added below. It will not be saved after a refresh.");
        }} />
      </div>
    </div>
    <p role="status" className="mt-3 text-sm text-ink-soft">{notice}</p>
    <ul className="mt-5 space-y-4" aria-label="Example commitments">
      {commitments.map(({ id, metrics, draft }) => <li key={id}>
        <article className="min-w-0 rounded-lg border border-rule bg-slate-50 p-4 sm:p-5" aria-labelledby={`${id}-heading`}>
          <p className="break-words text-sm font-semibold text-ink">{draft?.partner || "[] partner"}</p>
          <h3 id={`${id}-heading`} className="mt-2 break-words text-lg font-semibold text-ink">{draft?.name || "commitment name"}</h3>
          <div className="mt-4">
            <p className="text-sm font-medium text-ink-soft">Linked Program</p>
            {draft && <p className="mt-1 break-words text-sm text-ink">{draft.program || "Not specified"}</p>}
            {!draft && <ul className="mt-3 flex flex-wrap gap-2" aria-label="Linked cohorts and courses">
              {LINKED_SCOPES.map(scope => <li key={scope.label} className="min-w-0 basis-44 grow rounded bg-white px-3 py-2">
                <p className="text-xs font-medium text-ink-soft">{scope.label}</p>
                <p className="mt-1 break-words text-sm text-ink">{scope.value}</p>
              </li>)}
            </ul>}
          </div>
          <div className="mt-5">
            <h4 id={`${id}-metrics-heading`} className="text-sm font-semibold text-ink">Metric</h4>
            <ul className="mt-3 space-y-3" aria-labelledby={`${id}-metrics-heading`}>
              {metrics.map((metricId, index) => <li key={metricId} className="min-w-0 rounded-lg border border-rule bg-white p-4">
                <div className="flex min-w-0 flex-wrap items-start gap-x-6 gap-y-4">
                  <div className="min-w-0 grow basis-48">
                    <p className="text-xs text-ink-soft">Metric {index + 1}</p>
                    <h5 className="mt-1 break-words text-sm font-semibold text-ink">{draft?.metric || "[] metric name"}</h5>
                    <p className="mt-2 break-words text-xs text-ink-soft">Source: {draft ? draft.source || "Not specified" : "[] data source"}</p>
                  </div>
                  <dl className="flex min-w-0 grow basis-72 flex-wrap gap-x-6 gap-y-4 text-sm">
                    <div className="min-w-0 grow basis-28">
                      <dt className="text-xs text-ink-soft">Actual / Target</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-ink"><span aria-label="Actual unavailable">—</span> / {draft?.target || <span aria-label="Target unavailable">—</span>}</dd>
                      <dd className="mt-1 text-xs text-ink-soft">Progress unavailable</dd>
                    </div>
                    <div className="min-w-0 grow basis-36">
                      <dt className="text-xs text-ink-soft">Reporting period</dt>
                      <dd className="mt-1 break-words text-ink">{draft ? draft.period || "Not specified" : "[] reporting period"}</dd>
                      <dt className="mt-2 text-xs text-ink-soft">Deadline</dt>
                      <dd className="mt-1 break-words text-ink">{draft ? draft.deadline || "Not specified" : "[] deadline"}</dd>
                    </div>
                    <div className="min-w-0 grow basis-24">
                      <dt className="text-xs text-ink-soft">Owner</dt>
                      <dd className="mt-1 break-words text-ink">{draft ? draft.owner || "Not specified" : "[] owner"}</dd>
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
    <p className="mt-4 text-xs text-ink-soft">Illustrative commitments and program links only—not approved commitments or organizational results.</p>
  </section>;
}
