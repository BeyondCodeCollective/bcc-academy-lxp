export function ProgressBar({
  currentWeek,
  totalWeeks,
}: {
  currentWeek: number;
  totalWeeks: number;
}) {
  const pct = Math.round((currentWeek / totalWeeks) * 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">
          Week {currentWeek} of {totalWeeks}
        </span>
        <span className="text-muted">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted-bg">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
