"use client";

import { protectDirectoryCharts, attendanceLabels, milestoneLabels, chartSelectionKey, type ChartSelection, type DirectoryCharts } from "@/lib/mvp/learner-chart-selection";

const unavailable = { state: "unavailable" } as const;
export function LearnerDirectoryCharts({ charts: input, selection = "", onSelect, state = "ready" }: {
  charts?: DirectoryCharts; selection?: string; onSelect?: (selection: ChartSelection) => void;
  state?: "disconnected" | "loading" | "error" | "ready";
}) {
  const charts = input ? protectDirectoryCharts(input) : undefined;
  const button = (s: ChartSelection, label: string, count: number, total: number) => <button type="button"
    key={s.measure} disabled={!onSelect || count === 0} aria-pressed={selection === chartSelectionKey(s)}
    aria-label={`Show learners: ${label}, ${count}`}
    onClick={() => onSelect?.(s)}
    className="min-h-11 min-w-0 rounded-lg border border-rule p-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-primary/10">
    <span className="flex flex-wrap justify-between gap-2"><span>{label}</span><strong>{count}</strong></span>
    <span aria-hidden="true" className="mt-2 block h-2 overflow-hidden rounded bg-slate-100"><span className="block h-full bg-primary" style={{ width: `${total ? count / total * 100 : 0}%` }} /></span>
  </button>;
  return <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">{(["attendance", "milestones"] as const).map(kind => {
    const data = charts?.[kind] ?? unavailable;
    return <section key={kind} className="panel min-w-0 p-5" aria-label={kind === "attendance" ? "Attendance by session" : "Weekly milestones"}>
      <h2 className="text-xl font-semibold text-ink">{kind === "attendance" ? "Attendance by session" : "Weekly milestones"}</h2>
      <p className="mt-2 text-sm text-ink-soft">Select a count to filter learners below. Charts show the full search and filter population before chart selection.</p>
      {state !== "ready" || data.state !== "ready" ? <p role="status" className="mt-4 text-sm text-ink-soft">{state === "loading" ? "Loading charts…" : state === "error" ? "Charts unavailable. Retry loading learners below." : data.state === "suppressed" ? "Chart hidden to protect small groups." : data.state === "empty" ? "No chart records in this scope." : "Chart data unavailable."}</p> :
        <div className="mt-4 space-y-5">{kind === "attendance" && charts?.attendance.state === "ready" ? charts.attendance.rows.map(row =>
          <div key={JSON.stringify([row.programId, row.courseSlug, row.weekNumber, row.sessionNumber])}>
            <h3 className="break-words text-sm font-semibold">{row.programId} / {row.courseSlug} · Week {row.weekNumber} · Session {row.sessionNumber}</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{(Object.keys(attendanceLabels) as (keyof typeof attendanceLabels)[]).map(measure =>
              button({ kind: "attendance", programId: row.programId, courseSlug: row.courseSlug, weekNumber: row.weekNumber, sessionNumber: row.sessionNumber, measure }, attendanceLabels[measure], row.counts[measure], row.total))}</div>
          </div>) : charts?.milestones.state === "ready" ? charts.milestones.rows.map(row =>
          <div key={JSON.stringify([row.programId, row.courseSlug, row.weekNumber])}>
            <h3 className="break-words text-sm font-semibold">{row.programId} / {row.courseSlug} · Week {row.weekNumber}</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{(Object.keys(milestoneLabels) as (keyof typeof milestoneLabels)[]).map(measure =>
              button({ kind: "milestone", programId: row.programId, courseSlug: row.courseSlug, weekNumber: row.weekNumber, measure }, milestoneLabels[measure], row[measure], row.total))}</div>
          </div>) : null}</div>}
    </section>;
  })}</div>;
}
