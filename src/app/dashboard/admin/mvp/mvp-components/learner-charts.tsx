"use client";

import { useId, useState } from "react";
import { BarChart3, ShieldCheck } from "lucide-react";
import type { AttendanceChartRow, LearnerChartData, MilestoneChartRow } from "@/lib/mvp/learner-chart-data";

const NOT_CONNECTED = { state: "unavailable" } as const;
const attendanceSeries = [
  { key: "present", label: "Verified present", color: "bg-emerald-600" },
  { key: "absent", label: "Verified absent", color: "bg-amber-600" },
  { key: "unrecorded", label: "Unrecorded", color: "bg-slate-400" },
] as const;
const milestoneSeries = [
  { key: "submissions", label: "Submissions", color: "#2454ff", dash: undefined },
  { key: "reflections", label: "Reflections", color: "#7c3aed", dash: "6 4" },
  { key: "markedWatched", label: "Marked watched", color: "#047857", dash: "2 4" },
] as const;

function ChartMessage({ state }: { state: "unavailable" | "empty" | "suppressed" }) {
  return <div className="mt-5 flex min-h-60 flex-col items-center justify-center rounded-lg border border-dashed border-rule bg-slate-50 px-6 text-center">
    <BarChart3 aria-hidden="true" size={28} className="mb-3 text-ink-soft" />
    <p className="text-sm font-medium text-ink">{state === "suppressed" ? "Data withheld for privacy" : state === "empty" ? "No records in this selection" : "Chart data unavailable"}</p>
    <p className="mt-2 max-w-sm text-xs text-ink-soft">{state === "suppressed"
      ? "Small groups and related counts are hidden. No chart selections are available."
      : state === "empty" ? "Try a broader selection when data is connected."
      : "Verified learner data is not connected to this chart yet. No sample counts are shown."}</p>
  </div>;
}

// Only privacy-processed aggregates belong in these props. No learner IDs,
// contacts, raw answers, or hidden counts. Selection currently inspects a safe
// aggregate; directory drill-down will require a separately authorized loader.
export function LearnerCharts({ attendance = NOT_CONNECTED, milestones = NOT_CONNECTED }: {
  attendance?: LearnerChartData<AttendanceChartRow>;
  milestones?: LearnerChartData<MilestoneChartRow>;
}) {
  const id = useId();
  const [selection, setSelection] = useState<{ source: string; label: string; count: number } | null>(null);
  // A changed/suppressed dataset must never leave a previous count visible.
  const source = JSON.stringify({ attendance, milestones });
  const selected = selection?.source === source ? selection : null;
  const select = (label: string, count: number) => setSelection({ source, label, count });
  const buttonStyle = "rounded px-2 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:bg-primary/10";
  return <section className="mt-6" aria-label="Learner activity charts">
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
      <section className="panel min-w-0 p-5 sm:p-6" aria-labelledby={`${id}-attendance`}>
        <h2 id={`${id}-attendance`} className="text-xl font-semibold text-ink">Attendance by session</h2>
        <p className="mt-2 text-sm text-ink-soft">Verified attendance for eligible learners, grouped by course session.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-soft">{attendanceSeries.map(s => <span key={s.key} className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${s.color}`} />{s.label}</span>)}</div>
        {attendance.state !== "ready" ? <ChartMessage state={attendance.state} /> : <div className="mt-5 overflow-x-auto">
          <p className="mb-2 text-xs text-ink-soft">Learners · select a segment to inspect its count</p>
          <div className="flex min-w-full items-end gap-5 border-b border-rule" style={{ height: 240 }}>
            {attendance.rows.map(row => <div key={row.id} className="flex h-full min-w-24 flex-1 flex-col justify-end">
              <div className="mx-auto flex w-14 flex-col-reverse" style={{ height: `${row.eligible / Math.max(1, ...attendance.rows.map(r => r.eligible)) * 100}%` }}>
                {attendanceSeries.map(s => row[s.key] > 0 ? <button key={s.key} type="button"
                  className={`${s.color} w-full focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
                  style={{ height: `${row[s.key] / row.eligible * 100}%` }}
                  title={`${row.label} · ${s.label}: ${row[s.key]}`}
                  aria-label={`${row.label} · ${s.label}: ${row[s.key]} learners`}
                  onClick={() => select(`${row.label} · ${s.label}`, row[s.key])} /> : null)}
              </div>
            </div>)}
          </div>
          <div className="flex gap-5">{attendance.rows.map(row => <span key={row.id} className="min-w-24 flex-1 py-2 text-center text-xs text-ink-soft">{row.label}</span>)}</div>
          <details className="mt-3 text-sm"><summary className="cursor-pointer">View attendance counts</summary>
            <table className="mt-3 w-full text-left text-xs"><caption className="sr-only">Attendance by session</caption><thead><tr><th scope="col">Session</th>{attendanceSeries.map(s => <th key={s.key} scope="col">{s.label}</th>)}</tr></thead>
              <tbody>{attendance.rows.map(row => <tr key={row.id}><th scope="row">{row.label}</th>{attendanceSeries.map(s => <td key={s.key}><button type="button" className={buttonStyle} onClick={() => select(`${row.label} · ${s.label}`, row[s.key])}>{row[s.key]}</button></td>)}</tr>)}</tbody>
            </table>
          </details>
        </div>}
        <p className="mt-4 text-xs text-ink-soft">Unrecorded means evidence is missing—not that a learner was absent.</p>
      </section>
      <section className="panel min-w-0 p-5 sm:p-6" aria-labelledby={`${id}-milestones`}>
        <h2 id={`${id}-milestones`} className="text-xl font-semibold text-ink">Weekly milestone activity</h2>
        <p className="mt-2 text-sm text-ink-soft">Distinct learners with recorded milestones in each course week.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-soft">{milestoneSeries.map(s => <span key={s.key} className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />{s.label}</span>)}</div>
        {milestones.state !== "ready" ? <ChartMessage state={milestones.state} /> : <div className="mt-5 overflow-x-auto">
          <svg viewBox="0 0 480 240" className="h-60 w-full" role="img" aria-label="Weekly recorded activity. Exact counts are available in the table below.">
            {[30, 90, 150, 210].map(y => <line key={y} x1="25" y1={y} x2="455" y2={y} stroke="#e2e8f0" />)}
            {milestoneSeries.map(s => {
              const max = Math.max(1, ...milestones.rows.flatMap(row => milestoneSeries.map(series => row[series.key])));
              const point = (row: MilestoneChartRow, index: number) => ({ x: milestones.rows.length === 1 ? 240 : 25 + index * 430 / (milestones.rows.length - 1), y: 210 - row[s.key] / max * 180 });
              return <g key={s.key}>
                <polyline fill="none" stroke={s.color} strokeWidth="3" strokeDasharray={s.dash} points={milestones.rows.map((row, index) => { const p = point(row, index); return `${p.x},${p.y}`; }).join(" ")} />
                {milestones.rows.map((row, index) => { const p = point(row, index); return <circle key={row.id} cx={p.x} cy={p.y} r="4" fill={s.color}><title>{`${row.label} · ${s.label}: ${row[s.key]}`}</title></circle>; })}
              </g>;
            })}
          </svg>
          <table className="w-full text-left text-xs"><caption className="mb-3 text-left text-ink-soft">Select a count to inspect recorded activity.</caption>
            <thead><tr><th scope="col">Course week</th>{milestoneSeries.map(s => <th key={s.key} scope="col">{s.label}</th>)}</tr></thead>
            <tbody>{milestones.rows.map(row => <tr key={row.id}><th scope="row">{row.label}</th>{milestoneSeries.map(s => <td key={s.key}><button type="button" className={buttonStyle} onClick={() => select(`${row.label} · ${s.label}`, row[s.key])}>{row[s.key]}</button></td>)}</tr>)}</tbody>
          </table>
        </div>}
        <p className="mt-4 text-xs text-ink-soft">Marked watched is a recorded action, not measured viewing time. Activity types can overlap.</p>
      </section>
    </div>
    <div role="status" className="mt-3 text-sm text-ink">{selected && <>{selected.label}: {selected.count} learners. <button type="button" className="min-h-11 px-2 text-primary underline" onClick={() => setSelection(null)}>Clear chart selection</button></>}</div>
    <p className="mt-2 flex items-start gap-2 text-xs text-ink-soft"><ShieldCheck aria-hidden="true" size={16} className="shrink-0" />Small groups and related counts must be withheld before chart data is loaded. Suppressed charts have no count tooltips or selection targets.</p>
  </section>;
}
