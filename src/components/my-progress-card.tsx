// Learner-facing "My Progress" card. Composed from the BCC stats kit —
// hero stats + the single-hue StreakHeatmap — rendered in the editorial
// system. Existing fonts untouched; green only as the streak marker.
//
// Collapsed by default. It sits ABOVE the schedule so learners know it exists,
// but a full heatmap of mostly-empty squares was pushing the thing they came
// for (their next session) below the fold. The closed row carries the three
// numbers at a glance; opening it reveals the heatmap. Native <details> —
// no JS, keyboard-accessible, and it starts closed on every visit.
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
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

/** The one-line summary shown while collapsed: "3 lessons · 0-day streak · active today". */
function summaryLine({
  lessonsWatched,
  dayStreak,
  lastActiveLabel,
}: Pick<MyProgressCardProps, "lessonsWatched" | "dayStreak" | "lastActiveLabel">) {
  const lessons = `${lessonsWatched} lesson${lessonsWatched === 1 ? "" : "s"}`;
  const streak = `${dayStreak}-day streak`;
  const active = `active ${lastActiveLabel.toLowerCase()}`;
  return `${lessons} · ${streak} · ${active}`;
}

export function MyProgressCard({
  lessonsWatched,
  dayStreak,
  longestStreak,
  lastActiveLabel,
  days,
}: MyProgressCardProps) {
  return (
    <details className="panel group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 sm:px-7 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">My progress</h2>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {summaryLine({ lessonsWatched, dayStreak, lastActiveLabel })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {dayStreak > 0 && (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink"
              style={{ backgroundColor: "var(--highlight)" }}
            >
              {dayStreak} day{dayStreak === 1 ? "" : "s"}
            </span>
          )}
          <CaretDown
            size={16}
            aria-hidden
            className="text-ink-faint transition-transform group-open:rotate-180"
          />
        </div>
      </summary>

      <div className="border-t border-rule px-6 pb-6 sm:px-7">
        <p className="pt-4 text-sm text-ink-soft">
          {dayStreak > 0
            ? `You're on a ${dayStreak}-day streak — keep it going.`
            : "Watch a lesson today to start your streak."}
        </p>

        {/* Hero stats */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
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
      </div>
    </details>
  );
}
