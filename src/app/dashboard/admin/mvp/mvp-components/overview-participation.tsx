import type { MvpDashboardData } from "@/lib/mvp/types";

// Render the server's scoped projection; survey sample diagnostics stay in
// Programs, and unknown results remain distinct from zero.
export function OverviewParticipation({ data }: { data: MvpDashboardData["overviewParticipation"] }) {
  const attendance = data?.attendance;
  const number = (value: number | null | undefined) => value == null ? "Unavailable" :
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
  return <section className="panel min-w-0 p-6">
    <h2 className="text-xl font-semibold">Participation &amp; learner outcomes</h2>
    <p className="mt-2 text-sm text-ink-soft">Attendance from selected active offerings; outcomes stay course-specific.</p>
    <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
      <h3 className="font-medium">Active-program attendance · recorded check-ins</h3>
      <span className="text-ink-soft">{number(attendance?.total)} learner/course roster participations</span>
    </div>
    {attendance?.percent != null ? <>
      <div role="img" aria-label={`${number(attendance.percent)}% meet 80% recorded attendance; ${number(100 - attendance.percent)}% not yet verified at 80%.`}
        className="mt-4 flex h-7 w-full overflow-hidden rounded-md border border-primary/15">
        <div className="h-full shrink-0 bg-primary-hover" style={{ width: `${attendance.percent}%` }} />
        <div className="h-full shrink-0 bg-primary/15" style={{ width: `${100 - attendance.percent}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-3 text-sm">
        <p className="flex items-start gap-2 text-primary-hover"><span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-primary-hover" /><span>≥80% recorded attendance: {number(attendance.qualified)} / {number(attendance.total)} ({number(attendance.percent)}%)</span></p>
        <p className="flex items-start gap-2 text-ink-soft"><span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-sm border border-primary/20 bg-primary/15" /><span>Not yet verified at 80%: {number(attendance.notVerified)} / {number(attendance.total)} ({number(100 - attendance.percent)}%)</span></p>
      </div>
    </> : <>
      <div aria-hidden="true" className="mt-4 h-7 w-full rounded-md border border-dashed border-rule bg-black/5" />
      <p className="mt-3 text-sm text-ink-soft">Attendance breakdown unavailable: roster or attendance evidence is incomplete, or this selection has no active roster participations.</p>
    </>}
    <p className="mt-5 border-t border-rule pt-5 text-sm text-ink-soft">Up to three programs with the lowest recorded attendance rates, using each program’s lowest-attendance active course. This is a review priority, not a risk score.</p>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Programs ordered by lowest recorded attendance; Total is active learners out of the named course roster, and Result is the active percentage</caption>
        <thead className="bg-primary/5"><tr><th scope="col" className="p-3">Program</th><th scope="col" className="p-3">Total</th><th scope="col" className="p-3">Result</th></tr></thead>
        <tbody>{data?.attention.map(row => <tr key={row.id} className="border-b border-rule align-top">
          <th scope="row" className="p-3 font-normal"><p className="font-semibold">{row.programName}</p><p className="mt-1 text-ink-soft">{row.courseName ?? "Course"}</p></th>
          <td className="p-3 tabular-nums">{number(row.activeLearners)} / {number(row.totalLearners)}<span className="block text-xs text-ink-soft">active / total learners in this course</span></td>
          <td className="p-3 font-medium tabular-nums">{row.activePercent == null ? "Unavailable" : `${number(row.activePercent)}%`}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {!data?.attention.length && <p className="mt-3 text-sm text-ink-soft">No active programs with a calculable attendance rate.</p>}
    {!!data?.unavailableOfferingCount && <p className="mt-3 text-xs text-ink-soft">{data.unavailableOfferingCount} active offerings could not be ranked. Unknown attendance is not zero.</p>}
  </section>;
}
