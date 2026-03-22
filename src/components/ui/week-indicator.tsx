import { Check } from "lucide-react";

export function WeekIndicator({
  weekNumber,
  currentWeek,
  topic,
}: {
  weekNumber: number;
  currentWeek: number;
  topic?: string;
}) {
  const isPast = weekNumber < currentWeek;
  const isCurrent = weekNumber === currentWeek;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        isCurrent
          ? "border-primary bg-primary/5"
          : isPast
            ? "border-border bg-muted-bg/50 opacity-60"
            : "border-border"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          isCurrent
            ? "bg-primary text-white"
            : isPast
              ? "bg-accent/20 text-accent"
              : "bg-muted-bg text-muted"
        }`}
      >
        {isPast ? <Check size={16} /> : weekNumber}
      </div>
      <div>
        <p
          className={`text-sm font-medium ${isCurrent ? "text-primary" : "text-foreground"}`}
        >
          Week {weekNumber}
        </p>
        {topic && <p className="text-xs text-muted">{topic}</p>}
      </div>
    </div>
  );
}
