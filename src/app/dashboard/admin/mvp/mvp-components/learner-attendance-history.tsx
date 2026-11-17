import type { MvpAttendanceSessionState } from "@/lib/mvp/attendance-verification";

const sessionLabels: Record<MvpAttendanceSessionState["state"], { label: string; explanation: string }> = {
  verified_present: { label: "Verified present", explanation: "Attendance verified by staff review." },
  verified_absent: { label: "Verified absent", explanation: "Absence verified by staff review." },
  excused: { label: "Excused", explanation: "Excused by staff review; not a verified absence. Attendance calculation requires an approved denominator policy." },
  unrecorded: { label: "Unrecorded", explanation: "No attendance check-in or staff review recorded for this session. This is not a verified absence." },
  unresolved: { label: "Unresolved", explanation: "Attendance evidence is incomplete or conflicting. This is not a verified absence." },
  not_eligible: { label: "Not eligible", explanation: "Explicitly ineligible by staff review; not a verified absence. Attendance calculation requires an approved denominator policy." },
};

export function LearnerAttendanceHistory({ sessions, unavailableReason }: {
  sessions: readonly MvpAttendanceSessionState[] | null;
  unavailableReason: string | null;
}) {
  return <div className="mt-5">
    <h4 className="font-semibold text-ink">Attendance history</h4>
    <p className="mt-1 text-xs text-ink-soft">Required sessions verified as held in this course. Unrecorded and unresolved attendance are not verified absences.</p>
    {unavailableReason && <p className="mt-2 text-sm text-ink-soft">Attendance calculation: Not evaluated. {unavailableReason}</p>}
    {sessions === null ? <p className="mt-2 text-sm text-ink-soft">Attendance history unavailable.</p>
      : sessions.length === 0 ? <p className="mt-2 text-sm text-ink-soft">No verified held required sessions in this scope.</p>
      : <ul className="mt-2 divide-y divide-rule" aria-label="Attendance sessions">
        {[...sessions].sort((a, b) => a.weekNumber - b.weekNumber || a.sessionNumber - b.sessionNumber).map(session => {
          const display = sessionLabels[session.state];
          return <li key={`${session.weekNumber}:${session.sessionNumber}`} className="py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">Week {session.weekNumber} · Session {session.sessionNumber}</p>
              <span className="rounded-full border border-rule px-2 py-1 text-xs font-medium text-ink">{display.label}</span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">{display.explanation}</p>
          </li>;
        })}
      </ul>}
  </div>;
}
