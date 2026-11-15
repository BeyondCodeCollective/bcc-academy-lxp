// Illustrative layout fixtures only; these are not stored commitments or
// approved partner relationships. Keep them separate from live summary data.
const PLACEHOLDER_COMMITMENTS = ["commitment-1", "commitment-2", "commitment-3"];
const LINKED_SCOPES = [
  { label: "Cohort", value: "[] cohort" },
  { label: "Course", value: "[] course" },
];

export function CommitmentGroups() {
  return <section className="panel min-w-0 p-5 sm:p-6" aria-labelledby="commitment-groups-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id="commitment-groups-heading" className="text-xl font-semibold text-ink">Funder and Partner Commitments</h2>
        <p className="mt-2 text-sm text-ink-soft">Commitment records are not available here yet. The examples below preview the layout.</p>
      </div>
      <span className="shrink-0 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Layout preview</span>
    </div>
    <ul className="mt-5 space-y-4" aria-label="Example commitments">
      {PLACEHOLDER_COMMITMENTS.map(id => <li key={id}>
        <article className="min-w-0 rounded-lg border border-rule bg-slate-50 p-4 sm:p-5" aria-labelledby={`${id}-heading`}>
          <p className="break-words text-sm font-semibold text-ink">[] partner</p>
          <h3 id={`${id}-heading`} className="mt-2 break-words text-lg font-semibold text-ink">commitment name</h3>
          <div className="mt-4">
            <p className="text-sm font-medium text-ink-soft">Linked Program</p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Linked cohorts and courses">
              {LINKED_SCOPES.map(scope => <li key={scope.label} className="min-w-0 basis-44 grow rounded bg-white px-3 py-2">
                <p className="text-xs font-medium text-ink-soft">{scope.label}</p>
                <p className="mt-1 break-words text-sm text-ink">{scope.value}</p>
              </li>)}
            </ul>
          </div>
        </article>
      </li>)}
    </ul>
    <p className="mt-4 text-xs text-ink-soft">Illustrative commitments and program links only—not approved commitments or organizational results.</p>
  </section>;
}
