import type { KpiCoverage } from "@/lib/mvp/kpi-coverage";

export function OverviewStat({ label, value, coverage, prominent = false }: {
  label: string; value: number | null; coverage?: KpiCoverage; prominent?: boolean;
}) {
  const partial = value === null && coverage !== undefined && coverage.evaluated < coverage.total;
  const shown = value ?? coverage?.value ?? null;
  return <div className="rounded-lg border border-rule bg-white p-5 text-black">
    <dt className="text-sm text-primary-hover">{label}</dt>
    <dd className={`mt-3 text-center font-semibold tabular-nums text-black ${shown === null ? "text-xl" : prominent ? "text-4xl" : "text-3xl"}`}>{shown === null ? "Unavailable" : shown.toLocaleString("en-US")}</dd>
    {partial && <p className="mt-2 text-center text-sm font-medium">{shown === null ? "Not yet evaluated" : "Partial total"}</p>}
    {coverage && <p className="mt-3 text-center text-xs text-ink-soft">
      {coverage.total === 0 ? "No courses in this scope." : `Evaluated ${coverage.evaluated} of ${coverage.total} courses.`}
      {partial && ` ${coverage.total - coverage.evaluated} not yet evaluated. ${shown === null ? "No results with sufficient evidence yet." : "Includes only courses with sufficient evidence; the full total is not yet known."}`}
    </p>}
  </div>;
}
