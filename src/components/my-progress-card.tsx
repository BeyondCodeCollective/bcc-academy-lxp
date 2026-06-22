// Learner-facing "My Progress" card. Composed from the BCC stats kit —
// hero stats + the single-hue StreakHeatmap — rendered in the editorial
// system. Existing fonts untouched; green only as the streak marker.
import { StreakHeatmap, type ProgressDay } from "@/components/stats/streak-heatmap";

export type { ProgressDay };

export type MyProgressCardProps = {
  lessonsWatched: number;
  dayStreak: number;
  longestStreak: number;
  /** Pre-formatted, e.g. "Today", "2 days ago", "Never". */
  lastActiveLabel: string;
  /** Chronological, oldest → newest, aligned to Sun→Sat weeks. */
  days: ProgressDay[];
};

function Stat({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-3xl font-semibold leading-none text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft truncate">{hint}</p>}
    </div>
  );
}

export function MyProgressCard({
  lessonsWatched,
  dayStreak,
  longestStreak,
  lastActiveLabel,
  days,
}: MyProgressCardProps) {
  return (
    <section className="panel p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">My progress</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {dayStreak > 0
              ? `You're on a ${dayStreak}-day streak — keep it going.`
              : "Watch a lesson today to start your streak."}
          </p>
        </div>
        {dayStreak > 0 && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink"
            style={{ backgroundColor: "var(--highlight)" }}
          >
            {dayStreak} day{dayStreak === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Hero stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-rule pt-5">
        <Stat value={String(lessonsWatched)} label="Lessons watched" />
        <Stat
          value={String(dayStreak)}
          label="Day streak"
          hint={`Longest ${longestStreak}`}
        />
        <Stat value={lastActiveLabel} label="Last active" />
      </div>

      {/* Streak heatmap */}
      <div className="mt-6 border-t border-rule pt-5">
        <StreakHeatmap days={days} />
      </div>
    </section>
  );
}
