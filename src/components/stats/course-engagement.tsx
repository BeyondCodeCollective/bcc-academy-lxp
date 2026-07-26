// Admin-facing engagement snapshot for one course. The feedback loop on the
// learner streak cards: at a glance, who's active vs bounced, how much got
// watched, and when the cohort actually shows up. Composed from the stats kit
// (StatCard + DataBar + StreakHeatmap). Presentational; all values are props.

import { StatCard } from "@/components/stats/stat-card";
import { DataBar } from "@/components/stats/data-bar";
import { StreakHeatmap, type ProgressDay } from "@/components/stats/streak-heatmap";

export type CourseEngagementProps = {
  courseName: string;
  totalLearners: number;
  /** Had any activity in the last 7 days. */
  activeThisWeek: number;
  lessonsWatched: number;
  submissions: number;
  /** False when the track has no video content and none was ever watched. */
  showLessonsWatched: boolean;
  /** False when submissions are disabled and none were ever made. */
  showSubmissions: boolean;
  /** Live-session attendance. Null when nobody has ever checked in. */
  attendance: {
    sessionsHeld: number;
    /** Learners present at every held session — the certificate-eligible count. */
    perfect: number;
    unitLabel: string;
    perSession: {
      unit: number;
      session: number;
      present: number;
      /** When the room opened (earliest check-in). Null on legacy rows. */
      date: string | null;
    }[];
    /** Learners who missed at least one held session, most missed first. */
    absentees: {
      name: string;
      attended: number;
      missed: number;
      lastAttendedAt: string | null;
    }[];
  } | null;
  /** Learner status buckets — should sum to totalLearners. */
  status: {
    active: number; // active this week
    idle: number; // logged in + some activity, but not this week
    bounced: number; // logged in, never any activity
    neverLoggedIn: number;
  };
  /** Aggregate cohort activity, one cell per day (level = relative volume). */
  days: ProgressDay[];
  /** Course hasn't started: lead with enrollment, not an activity ratio.
   *  "3/16 active · 12 idle" on a course with zero sessions held reads as
   *  failure when it's actually a full roster waiting for day one. */
  upcoming?: boolean;
  /** Human start date ("Jul 15, 2026") for the upcoming headline; null = TBD. */
  startLabel?: string | null;
};

// Tailwind needs literal class names, so the column count can't be interpolated.
// "Jul 8" — short enough to sit inside a bar label without wrapping. UTC so
// the date matches the session everyone else is looking at, not the viewer's
// local midnight.
function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// A follow-up list stops being a follow-up list past a dozen names; the full
// picture lives in the attendance grid.
const ABSENTEE_LIMIT = 12;

const GRID_COLS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
};

export function CourseEngagement({
  totalLearners,
  activeThisWeek,
  lessonsWatched,
  submissions,
  showLessonsWatched,
  showSubmissions,
  attendance,
  status,
  days,
  upcoming = false,
  startLabel,
}: CourseEngagementProps) {
  const activePct = totalLearners > 0 ? Math.round((activeThisWeek / totalLearners) * 100) : 0;
  const unit = attendance?.unitLabel ?? "Week";
  // Mean turnout across held sessions — the one number that answers "how well
  // attended is this course", which per-session counts alone don't.
  const avgTurnout =
    attendance && attendance.perSession.length > 0 && totalLearners > 0
      ? Math.round(
          (attendance.perSession.reduce((sum, s) => sum + s.present, 0) /
            (attendance.perSession.length * totalLearners)) *
            100,
        )
      : 0;
  const tileCount =
    2 + (showLessonsWatched ? 1 : 0) + (showSubmissions ? 1 : 0) + (attendance ? 1 : 0);

  // Pre-start: the honest numbers are the roster and who's already been in.
  // Activity ratios, idle buckets, and attendance only exist once it's running.
  if (upcoming) {
    const signedIn = Math.max(0, totalLearners - status.neverLoggedIn);
    return (
      <section className="space-y-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Engagement
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            value={totalLearners}
            label="Enrolled"
            hint={startLabel ? `Starts ${startLabel}` : "Start date TBD"}
          />
          <StatCard
            value={`${signedIn}/${totalLearners}`}
            label="Signed in"
            hint="Been on the platform before day one"
          />
        </div>
        <div className="panel p-5 sm:p-6">
          <p className="mb-4 text-sm font-semibold text-ink">Early activity</p>
          <StreakHeatmap days={days} legendStreak={false} />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
        Engagement
      </h2>

      {/* Hero stat row */}
      <div className={`grid grid-cols-2 gap-3 ${GRID_COLS[tileCount] ?? "sm:grid-cols-4"}`}>
        <StatCard
          value={`${activeThisWeek}/${totalLearners}`}
          label="Active this week"
          hint={`${activePct}% of learners`}
        />
        {attendance && (
          <StatCard
            value={`${attendance.perfect}/${totalLearners}`}
            label="Full attendance"
            hint={`Attended all ${attendance.sessionsHeld} ${
              attendance.sessionsHeld === 1 ? unit.toLowerCase() : `${unit.toLowerCase()}s`
            }`}
          />
        )}
        {showLessonsWatched && (
          <StatCard value={lessonsWatched.toLocaleString()} label="Lessons watched" />
        )}
        {showSubmissions && (
          <StatCard value={submissions.toLocaleString()} label="Submissions" />
        )}
        <StatCard
          value={status.bounced + status.neverLoggedIn}
          label="Not started"
          hint="Signed up, no activity"
        />
      </div>

      {/* Per-session attendance — shows the shape a single rate would flatten. */}
      {attendance && (
        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              Attendance by {unit.toLowerCase()}
            </p>
            <p className="text-xs text-ink-faint">
              {avgTurnout}% average turnout · {totalLearners} enrolled
            </p>
          </div>
          {/* Bar width is turnout against the ROSTER, not against the best
              session — otherwise the thinnest week still renders near-full and
              a half-empty room looks like a good night. */}
          <DataBar
            items={attendance.perSession.map((s) => ({
              label: s.date
                ? `${unit.toLowerCase()} ${s.unit} · ${formatDay(s.date)}`
                : `${unit.toLowerCase()} ${s.unit}`,
              value: `${s.present}/${totalLearners}`,
              pct: totalLearners ? (s.present / totalLearners) * 100 : 0,
            }))}
          />
        </div>
      )}

      {/* Names, not just a rate. A turnout number says the room was thin; this
          says whom to call. */}
      {attendance && attendance.absentees.length > 0 && (
        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Who&apos;s missing class</p>
            <p className="text-xs text-ink-faint">
              {attendance.absentees.length} of {totalLearners} missed at least one
            </p>
          </div>
          <ul className="divide-y divide-rule/60">
            {attendance.absentees.slice(0, ABSENTEE_LIMIT).map((a) => (
              <li
                key={a.name}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2"
              >
                <span className="text-sm text-ink">{a.name}</span>
                <span className="text-xs text-ink-soft tabular-nums">
                  missed {a.missed} of {attendance.sessionsHeld} ·{" "}
                  {a.lastAttendedAt
                    ? `last here ${formatDay(a.lastAttendedAt)}`
                    : "never attended"}
                </span>
              </li>
            ))}
          </ul>
          {attendance.absentees.length > ABSENTEE_LIMIT && (
            <p className="mt-3 text-xs text-ink-faint">
              +{attendance.absentees.length - ABSENTEE_LIMIT} more — see Students
              → Attendance for the full grid.
            </p>
          )}
        </div>
      )}

      {/* Status distribution + cohort heatmap, side by side on wide screens */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel p-5 sm:p-6">
          <p className="mb-4 text-sm font-semibold text-ink">Where learners stand</p>
          <DataBar
            items={[
              { label: "active this week", value: status.active },
              { label: "idle", value: status.idle },
              { label: "never started", value: status.bounced },
              { label: "never logged in", value: status.neverLoggedIn },
            ]}
          />
        </div>

        <div className="panel p-5 sm:p-6">
          <p className="mb-4 text-sm font-semibold text-ink">When the cohort shows up</p>
          <StreakHeatmap days={days} legendStreak={false} />
        </div>
      </div>
    </section>
  );
}
