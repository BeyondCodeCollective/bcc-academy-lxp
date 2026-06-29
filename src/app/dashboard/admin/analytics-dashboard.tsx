"use client";

import type { EngagementAnalytics } from "./actions-analytics";

// Program-level engagement: the activation funnel + a per-learner activity
// table. Scoped server-side to the current program, so it reflects the program
// switcher (Forte shows Upskill, Catalyst shows Catalyst, etc.).
export function AnalyticsDashboard({ data }: { data: EngagementAnalytics }) {
  const { funnel, learners } = data;
  // Funnel conversion vs the "invited" top — shown only when invited > 0
  // ("% of 0" is meaningless, e.g. Beyond Code Centers, where students were
  // added directly rather than via an allowlist).
  const pct = (v: number): number | null =>
    funnel.invited > 0 ? Math.round((v / funnel.invited) * 100) : null;

  const cards = [
    { label: "Invited", sublabel: "received access", value: funnel.invited, showPct: false },
    { label: "Created account", sublabel: "& signed in", value: funnel.activated, showPct: true },
    { label: "Engaged", sublabel: "watched · attended · submitted", value: funnel.engaged, showPct: true },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const p = c.showPct ? pct(c.value) : null;
          return (
            <div key={c.label} className="rounded-xl border border-rule bg-white p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-ink">{c.value}</span>
                {p !== null && (
                  <span className="text-xs font-medium text-ink-faint">{p}% of invited</span>
                )}
              </div>
              <div className="mt-1 text-sm font-semibold text-ink">{c.label}</div>
              <div className="text-xs text-ink-faint">{c.sublabel}</div>
            </div>
          );
        })}
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
