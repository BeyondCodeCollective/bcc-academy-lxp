import type { MvpDashboardData } from "@/lib/mvp/types";

// Contacts arrive only through the opt-in authorized Programs loader. Keep
// each course participation separate; this is not a cross-course learner score.
export function ProgramParticipants({ participants, programSelected, loading = false }: {
  participants: MvpDashboardData["participants"]; programSelected: boolean; loading?: boolean;
}) {
  return <section aria-label="Participant activity" aria-busy={loading} className="panel min-w-0 p-5 sm:p-6">
    <h2 className="text-xl font-semibold text-ink">Participant activity</h2>
    <p className="mt-2 text-sm text-ink-soft">Current roster for the applied filters · progress by course</p>
    {loading && <p role="status" className="mt-3 text-sm text-ink-soft">Updating participants…</p>}
    <div className="mt-5 overflow-x-auto rounded-xl border border-rule focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          role="region" aria-label="Participant activity table" tabIndex={0}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Filtered learner/course participations. Caught up is separate from active status and certificates. Last activity uses submitted work, reflections and recorded video watches.</caption>
          <thead className="bg-gray-50 text-xs uppercase tracking-widest text-ink-soft"><tr>
            <th scope="col" className="px-5 py-4 font-semibold">Student</th>
            <th scope="col" className="px-5 py-4 text-center font-semibold">Learner Progress</th>
            <th scope="col" className="px-5 py-4 text-right font-semibold">Last Active</th>
          </tr></thead>
          <tbody className={loading ? "opacity-60" : undefined}>{!programSelected || !participants?.length ? <tr>
            <td colSpan={3} className="px-5 py-6 text-ink-soft">{!programSelected ? "Choose a program and apply filters to view participants."
              : participants === undefined ? "Participant details are unavailable." : "No participants match the applied filters."}</td>
          </tr> : participants.map(participant => {
            const progress = participant.caughtUp;
            const known = progress.percent !== null && Number.isFinite(progress.percent) && progress.percent >= 0 && progress.percent <= 100;
            // Never round an incomplete value up to 100%.
            const percent = known ? Math.floor(progress.percent! * 10) / 10 : null;
            const activity = participant.lastActivity;
            const date = activity.at ? new Date(activity.at) : null;
            return <tr key={`${participant.programRowId}:${participant.learnerId}`} className="border-t border-rule">
              <th scope="row" className="min-w-48 px-5 py-5 font-normal">
                <p className="font-semibold text-ink">{participant.name || "Name unavailable"}</p>
                <p className="mt-1 break-all text-xs text-ink-soft">{participant.email || "Email unavailable"}</p>
                <p className="mt-1 text-xs text-ink-soft">{participant.courseName || participant.courseSlug}</p>
              </th>
              <td className="min-w-40 px-5 py-5 text-center">
                {percent === null ? <span className="text-ink-soft" title={progress.unavailableReason ?? undefined}>Unavailable</span>
                  : <span className="text-lg tabular-nums text-ink" title={`${progress.completedSessions} / ${progress.applicableSessions} applicable sessions caught up`}>{percent}%</span>}
              </td>
              <td className="min-w-44 px-5 py-5 text-right text-ink-soft">
                {activity.status === "recorded" && date && Number.isFinite(date.getTime())
                  ? <time dateTime={date.toISOString()}>{new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York",
                    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date)}</time>
                  : activity.status === "none_recorded" ? "No recorded activity" : "Unavailable"}
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    {programSelected && !!participants?.length && <p className="mt-3 text-xs text-ink-soft">Last activity: submissions, reflections, and video watches; excludes staff attendance edits. Caught up is not certificate eligibility.</p>}
  </section>;
}
