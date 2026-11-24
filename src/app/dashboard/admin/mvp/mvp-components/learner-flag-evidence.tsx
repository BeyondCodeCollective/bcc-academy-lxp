import type { LearnerCheckInFlag, LearnerFlagSupport } from "@/lib/mvp/learner-check-ins";

function EvidenceTimestamp({ at }: { at: string | null }) {
  if (!at || !/(Z|[+-]\d{2}:\d{2})$/.test(at) || !Number.isFinite(Date.parse(at))) return <>Timestamp unavailable</>;
  const date = new Date(at);
  return <time dateTime={date.toISOString()}>{date.toLocaleString("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  })}</time>;
}

function FlagSupport({ support }: { support: LearnerFlagSupport }) {
  switch (support.kind) {
    case "verified_absences":
      return <>
        <p>Verified absences: {support.count} · Flag threshold: {support.threshold}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5" aria-label="Supporting absences">{support.sessions.map(session =>
          <li key={`${session.weekNumber}:${session.sessionNumber}`}>Week {session.weekNumber} · Session {session.sessionNumber} · Verified absent</li>)}</ul>
      </>;
    case "overdue_required_submissions":
      return <>
        <p>Overdue required submissions: {support.count} · Flag threshold: {support.threshold}</p>
        <ul className="mt-2 space-y-3" aria-label="Supporting assignments">{support.assignments.map(assignment => <li key={assignment.assignmentId}>
          <p className="font-medium">{assignment.label} · Week {assignment.weekNumber}</p>
          <dl className="mt-1 space-y-1">
            <div><dt className="inline text-ink-soft">Due: </dt><dd className="inline"><EvidenceTimestamp at={assignment.dueAt} /></dd></div>
            <div><dt className="inline text-ink-soft">Grace period: </dt><dd className="inline">{assignment.graceDays} days</dd></div>
            <div><dt className="inline text-ink-soft">Grace ends: </dt><dd className="inline"><EvidenceTimestamp at={assignment.graceEndsAt} /></dd></div>
            <div><dt className="inline text-ink-soft">Submission: </dt><dd className="inline">No timestamp recorded</dd></div>
          </dl>
        </li>)}</ul>
      </>;
    case "required_video_checkpoint":
      return <>
        <dl className="space-y-1">
          <div><dt className="inline text-ink-soft">Checkpoint due: </dt><dd className="inline"><EvidenceTimestamp at={support.dueAt} /></dd></div>
          <div><dt className="inline text-ink-soft">Required minimum: </dt><dd className="inline">{support.minimumPercent}%</dd></div>
          <div><dt className="inline text-ink-soft">Recorded marks: </dt><dd className="inline">{support.markedCount}/{support.requiredCount} required weeks ({new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(support.recordedPercent)}%)</dd></div>
        </dl>
        <p className="mt-1 text-xs text-ink-soft">Marked-watched is a learner-recorded mark, not proof of viewing.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5" aria-label="Supporting video marks">{support.weeks.map(week =>
          <li key={week.weekNumber}>Week {week.weekNumber} · {week.state === "recorded" ? <EvidenceTimestamp at={week.markedWatchedAt} /> : "No timestamp recorded"}</li>)}</ul>
      </>;
    default:
      return <p>Supporting evidence unavailable. Not evaluated.</p>;
  }
}

export function LearnerFlagEvidence({ checkIn }: { checkIn: {
  attentionFlags: readonly LearnerCheckInFlag[]; unevaluatedRuleIds: readonly string[];
  evaluatedAt: string; unavailableReason: string | null;
} }) {
  const incomplete = checkIn.unevaluatedRuleIds.length > 0 || !!checkIn.unavailableReason;
  return <div className="mt-5">
    <h4 className="font-semibold text-ink">Flag explanations and supporting evidence</h4>
    <p className="mt-1 text-xs text-ink-soft">Server-evaluated flags for this enrollment. Times use Eastern Time.</p>
    <p className="mt-1 text-xs text-ink-soft">Evaluated: <EvidenceTimestamp at={checkIn.evaluatedAt} /></p>
    {incomplete && <p className="mt-2 text-sm text-ink-soft">Some rules: Not evaluated. {checkIn.unavailableReason || "Configuration or supporting evidence is insufficient."}</p>}
    {!checkIn.attentionFlags.length ? <p className="mt-2 text-sm text-ink-soft">No supported flags recorded. This alone does not establish that the learner is on track.</p>
      : <ul className="mt-2 space-y-4" aria-label="Check-in flags">{checkIn.attentionFlags.map(flag => <li key={flag.id} className="rounded-lg border border-rule p-3 text-sm">
        <p className="font-medium">{flag.explanation}</p>
        <p className="mt-1 text-xs text-ink-soft">Detected: <EvidenceTimestamp at={flag.detectedAt} /></p>
        <div className="mt-3"><FlagSupport support={flag.supportingEvidence} /></div>
      </li>)}</ul>}
  </div>;
}
