// The "did it work" block for a program's Insights tab: how far confidence
// moved, per statement, before → now.
//
// This existed only on /dashboard/insights, which is super-admin gated — so the
// people running a program could see every survey response and never the one
// number the program is judged on. Beyond the Game's mid-program survey asks
// before and now in a single response, so it carries a real +0.84 shift that
// nobody running Beyond the Game could reach.
//
// Presentational; all values are props.

import type { OutcomesData } from "@/lib/analytics/outcomes";

export function LearningShift({ outcomes }: { outcomes: OutcomesData }) {
  const d = outcomes.avgDelta;
  // Below ±0.05 on a 1–5 scale is noise. "Rose +-0.03" is worse than saying
  // nothing moved.
  const headline =
    d >= 0.05
      ? `Confidence rose +${d.toFixed(2)} on average`
      : d <= -0.05
        ? `Confidence dipped ${d.toFixed(2)} on average`
        : "Confidence held about steady";

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          What changed
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">{headline}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Across {outcomes.statementCount}{" "}
          {outcomes.statementCount === 1 ? "measure" : "measures"} ·{" "}
          {outcomes.respondents}{" "}
          {outcomes.respondents === 1 ? "learner" : "learners"} reporting before
          &amp; after
        </p>
      </div>

      {outcomes.groups.map((g) => (
        <div key={`${g.surveyId}-${g.label}`} className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{g.label}</p>
            <p className="text-xs text-ink-faint">{g.surveyTitle}</p>
          </div>

          <ul className="space-y-3">
            {[...g.rows]
              // Biggest movers first — that's the story, and on a long
              // statement list the tail is where nothing happened.
              .sort((a, b) => b.delta - a.delta)
              .map((r) => {
                const pct = (v: number) => Math.max(0, Math.min(100, (v / g.scaleMax) * 100));
                return (
                  <li key={r.statement} className="space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="min-w-0 flex-1 text-sm text-ink">{r.statement}</span>
                      <span
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          r.delta > 0 ? "text-primary" : r.delta < 0 ? "text-red-600" : "text-ink-faint"
                        }`}
                      >
                        {r.delta > 0 ? "+" : ""}
                        {r.delta.toFixed(2)}
                      </span>
                    </div>
                    {/* Before as a track, now as the fill: the gap between them
                        IS the gain, so it reads without a legend. */}
                    <div className="relative h-2 w-full rounded-full bg-paper-tint">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-ink-faint/40"
                        style={{ width: `${pct(r.before)}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-primary"
                        style={{ width: `${pct(r.now)}%`, opacity: 0.85 }}
                      />
                    </div>
                    <p className="text-[11px] text-ink-faint tabular-nums">
                      {g.beforeLabel} {r.before.toFixed(2)} → {g.nowLabel}{" "}
                      {r.now.toFixed(2)} · n={r.n}
                    </p>
                  </li>
                );
              })}
          </ul>

          {g.isCrossSurvey && (
            <p className="mt-3 text-[11px] text-ink-faint">
              Cohort-level: compares pre-survey respondents to post-survey
              respondents, not the same individuals paired.
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
