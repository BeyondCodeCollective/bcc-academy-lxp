import type { ExitSurveyResult } from "@/lib/exit-survey-results";
import { UNCLEAR_PROMPT, UNDERSTANDING_PROMPT } from "@/lib/exit-survey";

const SCALE = [5, 4, 3, 2, 1];

export function SessionReport({
  week,
  session,
  showSession,
  dateLabel,
  topic,
  rows,
  average,
  rated,
  answered,
  enrolled,
}: {
  week: number;
  session: number;
  showSession: boolean;
  dateLabel: string | null;
  topic?: string;
  rows: ExitSurveyResult[];
  average: number | null;
  rated: number;
  answered: number | null;
  enrolled: number | null;
}) {
  const counts = new Map<number, number>();
  for (const r of rows) if (r.understanding !== null) counts.set(r.understanding, (counts.get(r.understanding) ?? 0) + 1);
  const maxCount = Math.max(1, ...counts.values());
  // Lowest ratings first: the struggles are what a debrief is for.
  const comments = rows.filter((r) => r.unclear_text?.trim());
  const answeredPct = answered !== null && enrolled ? Math.round((answered / enrolled) * 100) : null;
  const heading = `Week ${week}${showSession ? `, session ${session}` : ""}`;
  const meta = [dateLabel, topic].filter(Boolean).join(" · ");

  return (
    <section className="panel overflow-hidden" aria-labelledby={`pulse-${week}-${session}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule-soft px-5 py-4 sm:px-6">
        <h2 id={`pulse-${week}-${session}`} className="text-xl font-semibold text-ink">
          {heading}
        </h2>
        {meta && <p className="text-sm text-ink-faint">{meta}</p>}
      </header>

      <div className="grid gap-8 px-5 py-6 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:gap-12">
        <div>
          {average !== null ? (
            <p className="font-display text-ink">
              <span className="text-6xl font-bold leading-none tracking-[-0.03em] tabular-nums">
                {average.toFixed(1)}
              </span>
              <span className="ml-1.5 text-lg font-medium text-ink-faint">/ 5</span>
            </p>
          ) : (
            <p className="text-sm text-ink-soft">No ratings for this session.</p>
          )}
          <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-ink-soft">
            Average agreement with &ldquo;{UNDERSTANDING_PROMPT}&rdquo;
          </p>

          {answered !== null && enrolled !== null && enrolled > 0 && (
            <div className="mt-6">
              <p className="text-sm text-ink">
                <span className="font-semibold tabular-nums">{answered}</span>
                <span className="text-ink-soft"> of {enrolled} enrolled answered</span>
              </p>
              <div
                className="mt-2 h-1.5 w-full max-w-[16rem] overflow-hidden rounded-full bg-[#f0f0f2]"
                role="img"
                aria-label={`${answeredPct}% answered`}
              >
                <div className="h-full rounded-full bg-cobalt" style={{ width: `${answeredPct}%` }} />
              </div>
            </div>
          )}
        </div>

        {rated > 0 && (
          <div>
            <h3 className="text-sm font-medium text-ink">
              How {rated} {rated === 1 ? "person" : "people"} rated it
            </h3>
            <p className="mt-0.5 text-xs text-ink-faint">5 is strongly agree, 1 is strongly disagree</p>
            <ul className="mt-4 space-y-3">
              {SCALE.map((score) => {
                const n = counts.get(score) ?? 0;
                return (
                  <li key={score} className="grid grid-cols-[1.25rem_minmax(0,1fr)_1.75rem] items-center gap-3">
                    <span className="text-sm font-medium tabular-nums text-ink-soft">{score}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#f0f0f2]">
                        {n > 0 && (
                          <div
                            className="h-full rounded-full bg-cobalt"
                            style={{ width: `${(n / maxCount) * 100}%`, opacity: 0.4 + (score / 5) * 0.6 }}
                          />
                        )}
                    </div>
                    <span className="text-right text-sm tabular-nums text-ink">{n}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-rule-soft px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-base font-semibold text-ink">{UNCLEAR_PROMPT}</h3>
          <p className="text-sm text-ink-faint">
            {comments.length === 0
              ? "No written answers"
              : `${comments.length} written ${comments.length === 1 ? "answer" : "answers"}, lowest rating first`}
          </p>
        </div>
        {comments.length > 0 && (
          <ul className="mt-4 divide-y divide-rule-soft">
            {comments.map((r, i) => (
              <li key={i} className="flex gap-4 py-4 first:pt-1 last:pb-0">
                <span
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-tint text-xs font-semibold tabular-nums text-ink-soft"
                  aria-label={r.understanding !== null ? `Rated ${r.understanding} of 5` : "No rating"}
                >
                  {r.understanding ?? "–"}
                </span>
                <div className="min-w-0">
                  <p className="max-w-[68ch] whitespace-pre-line text-base leading-relaxed text-ink">
                    {r.unclear_text}
                  </p>
                  {r.hours_text && (
                    <p className="mt-1 text-xs text-ink-faint">{r.hours_text} hrs outside sessions</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
