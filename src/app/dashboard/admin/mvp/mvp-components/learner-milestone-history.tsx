import type { LearnerWeeklyMilestones } from "@/lib/mvp/learner-activity";

function MilestoneTimestamp({ activity }: { activity: LearnerWeeklyMilestones["submission"] }) {
  if (activity.state === "none_recorded") return <>No timestamp recorded</>;
  if (activity.state !== "recorded" || !activity.at || !/(Z|[+-]\d{2}:\d{2})$/.test(activity.at) || !Number.isFinite(Date.parse(activity.at))) return <>Timestamp unavailable</>;
  const date = new Date(activity.at);
  return <time dateTime={date.toISOString()}>{date.toLocaleString("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  })}</time>;
}

export function LearnerMilestoneHistory({ weeks }: { weeks: readonly LearnerWeeklyMilestones[] }) {
  return <div className="mt-5">
    <h4 className="font-semibold text-ink">Weekly milestone timestamps</h4>
    <p className="mt-1 text-xs text-ink-soft">Latest recorded timestamp for each milestone, in Eastern Time. Marked-watched is a learner-recorded mark, not proof of viewing. Missing timestamps alone do not establish overdue work.</p>
    {weeks.length === 0 ? <p className="mt-2 text-sm text-ink-soft">No milestone activity recorded in this scope.</p>
      : <ul className="mt-2 divide-y divide-rule" aria-label="Weekly milestones">
        {[...weeks].sort((a, b) => (a.weekNumber ?? Infinity) - (b.weekNumber ?? Infinity)).map(week => <li key={week.weekNumber ?? "unlinked"} className="py-3 text-sm">
          <p className="font-medium">{week.weekNumber === null ? "Week not linked" : `Week ${week.weekNumber}`}</p>
          {week.weekNumber === null && <p className="mt-1 text-xs text-ink-soft">These records are not linked to a specific course week.</p>}
          <dl className="mt-2 space-y-2">{([
            ["Submission", week.submission], ["Reflection", week.reflection], ["Marked-watched", week.markedWatched],
          ] as const).map(([label, activity]) => <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <dt className="text-ink-soft">{label}</dt><dd><MilestoneTimestamp activity={activity} /></dd>
          </div>)}</dl>
        </li>)}
      </ul>}
  </div>;
}
