"use client";

import type { EngagementAnalytics } from "./actions-analytics";

// Program-level engagement: the activation funnel + a per-learner activity
// table. Scoped server-side to the current program, so it reflects the program
// switcher (Forte shows Upskill, Catalyst shows Catalyst, etc.).
export function AnalyticsDashboard({ data }: { data: EngagementAnalytics }) {
  const { funnel, learners } = data;
  // Scale bars to the largest stage — not "invited" — so a program with no
  // allowlist invites (students added directly, e.g. Beyond Code Centers) still
  // renders correctly instead of the activated bar overflowing past an empty
  // invited bar. Percentages are funnel conversion vs the invited top, shown
  // only when invited > 0 ("% of 0" is meaningless).
  const max = Math.max(funnel.invited, funnel.activated, funnel.engaged, 1);
  const pct = (v: number): number | null =>
    funnel.invited > 0 ? Math.round((v / funnel.invited) * 100) : null;

  const bars = [
    { label: "Invited (received access)", value: funnel.invited, color: "bg-[#1D59FF]" },
    { label: "Created account & signed in", value: funnel.activated, color: "bg-[#4D7DFF]" },
    { label: "Engaged (watched · attended · submitted)", value: funnel.engaged, color: "bg-[#E5454A]" },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <div className="w-60 shrink-0 text-sm font-medium text-ink-soft">{b.label}</div>
            <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-surface">
              <div
                className={`h-full rounded-lg ${b.color}`}
                style={{ width: `${b.value > 0 ? Math.max((b.value / max) * 100, 2) : 0}%` }}
              />
            </div>
            <div className="w-20 shrink-0 text-right text-sm font-bold text-ink">
              {b.value}
              {pct(b.value) !== null && (
                <span className="ml-1 text-xs font-medium text-ink-faint">{pct(b.value)}%</span>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Per-learner activity ({learners.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-rule">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="px-3 py-2 font-semibold">Learner</th>
                <th className="px-3 py-2 font-semibold">Signed up</th>
                <th className="px-3 py-2 font-semibold">Last active</th>
                <th className="px-3 py-2 text-center font-semibold">Videos</th>
                <th className="px-3 py-2 text-center font-semibold">Surveys</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((l) => (
                <tr
                  key={l.email}
                  className={`border-b border-rule/60 last:border-0 ${l.videosWatched > 0 ? "bg-[#f3f8ff]" : ""}`}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{l.name || l.email}</div>
                    {l.name && <div className="text-xs text-ink-faint">{l.email}</div>}
                  </td>
                  <td className="px-3 py-2 text-ink-soft">{l.signedUp ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-soft">{l.lastActive ?? "—"}</td>
                  <td className="px-3 py-2 text-center text-ink">{l.videosWatched}</td>
                  <td className="px-3 py-2 text-center text-ink">{l.surveys}</td>
                </tr>
              ))}
              {learners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-ink-faint">
                    No learners in this program yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] leading-relaxed text-ink-faint">
          &ldquo;Engaged&rdquo; = watched a video, attended a session, or submitted work.
          Logins-over-time, time-in-platform, and video&nbsp;% watched aren&rsquo;t tracked yet
          &mdash; coming with deeper event tracking.
        </p>
      </section>
    </div>
  );
}
