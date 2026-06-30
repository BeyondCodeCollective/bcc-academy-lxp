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
  /** Learner status buckets — should sum to totalLearners. */
  status: {
    active: number; // active this week
    idle: number; // logged in + some activity, but not this week
    bounced: number; // logged in, never any activity
    neverLoggedIn: number;
  };
  /** Aggregate cohort activity, one cell per day (level = relative volume). */
  days: ProgressDay[];
};

export function CourseEngagement({
  totalLearners,
  activeThisWeek,
  lessonsWatched,
  submissions,
  status,
  days,
}: CourseEngagementProps) {
  const activePct = totalLearners > 0 ? Math.round((activeThisWeek / totalLearners) * 100) : 0;

  return (
    <section className="space-y-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
        Engagement
      </h2>

      {/* Hero stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          value={`${activeThisWeek}/${totalLearners}`}
          label="Active this week"
          hint={`${activePct}% of learners`}
        />
        <StatCard value={lessonsWatched.toLocaleString()} label="Lessons watched" />
        <StatCard value={submissions.toLocaleString()} label="Submissions" />
        <StatCard
          value={status.bounced + status.neverLoggedIn}
          label="Not started"
          hint="Signed up, no activity"
        />
      </div>

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
