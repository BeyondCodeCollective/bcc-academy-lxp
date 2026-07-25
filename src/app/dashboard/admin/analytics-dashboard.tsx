"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import type { EngagementAnalytics, EngagementLearner, EngagementTrends } from "./actions-analytics";
import { getEngagementTrends } from "./actions-analytics";
import { StatCard, type StatTrend } from "@/components/stats/stat-card";
import { METRIC_DEFS } from "@/lib/analytics/metric-defs";
import { RANGE_LABELS, type RangePreset, type Delta } from "@/lib/analytics/period";

// Turn a period-over-period Delta into a StatCard trend chip. No chip when the
// prior window was zero — an "∞%" jump is noise, not signal, so we stay silent
// rather than fabricate a number. Up is good for every metric here (more
// activity is better).
function trendFor(d: Delta): StatTrend | undefined {
  if (d.pct === null) return undefined;
  return {
    dir: d.dir,
    text: `${Math.abs(d.pct)}%`,
    good: d.dir === "up",
    vs: d.prev.toLocaleString(),
  };
}

// Compare-to-previous headline row. Self-contained: owns the range preset and
// refetches period-compared metrics from the server action when it changes.
// Only event-timestamped metrics live here (see period.ts) — current-state
// counts stay in the funnel below, deltas would be dishonest.
function TrendsRow() {
  const [preset, setPreset] = useState<RangePreset>("90d");
  const [trends, setTrends] = useState<EngagementTrends | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    startTransition(async () => {
      const t = await getEngagementTrends(preset);
      if (live) setTrends(t);
    });
    return () => {
      live = false;
    };
  }, [preset]);

  // "Lessons watched" is intentionally omitted — we run live sessions, not
  // pre-recorded video, so a watched-lesson count is always ~0 and misleading.
  const cards: { key: keyof typeof METRIC_DEFS; label: string; d: Delta | null }[] = [
    { key: "activeMembers", label: "Active learners", d: trends?.activeLearners ?? null },
    { key: "activeStudents", label: "Sessions attended", d: trends?.attended ?? null },
    { key: "activeStudents", label: "Work submitted", d: trends?.submitted ?? null },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-rule bg-white p-0.5">
          {(Object.keys(RANGE_LABELS) as RangePreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              aria-pressed={preset === p}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                preset === p ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {RANGE_LABELS[p]}
            </button>
          ))}
        </div>
        {trends && (
          <span className="text-xs text-ink-faint">
            {trends.periodLabel} · vs previous period
          </span>
        )}
      </div>
      <div className={`grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-3 ${pending ? "opacity-50" : ""}`}>
        {cards.map((c, i) => (
          <StatCard
            key={i}
            value={c.d ? c.d.value.toLocaleString() : "—"}
            label={c.label}
            info={METRIC_DEFS[c.key]}
            trend={c.d ? trendFor(c.d) : undefined}
          />
        ))}
      </div>
    </section>
  );
}

// Program-level engagement: the activation funnel + a per-learner activity
// table. Scoped server-side to the current program, so it reflects the program
// switcher (Forte shows Upskill, Catalyst shows Catalyst, etc.).
export function AnalyticsDashboard({ data }: { data: EngagementAnalytics }) {
  const { funnel, learners, trackOptions } = data;
  // Name/email filter — the table runs to hundreds of rows (175+ at Upskill
  // scale), so an unfiltered wall is unusable. Match is case-insensitive across
  // both name and email.
  const [query, setQuery] = useState("");
  // Track filter — "" = all tracks. A program-scoped export silently blends
  // every track together, so "export Security+ zips" came back partial with no
  // signal why. Scoping the table AND the CSV to one track fixes that at source.
  const [track, setTrack] = useState("");
  // Which learner's survey list is expanded (by email). Lets the Surveys count
  // drill through to "which surveys did they take?" inline.
  const [openSurveys, setOpenSurveys] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return learners.filter((l) => {
      if (track && !l.tracks.includes(track)) return false;
      if (q && !(l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [learners, query, track]);
  // Only show tracks that actually have a learner here, so the dropdown never
  // offers an empty option that exports a blank file.
  const availableTracks = useMemo(() => {
    const present = new Set(learners.flatMap((l) => l.tracks));
    return trackOptions.filter((t) => present.has(t.slug));
  }, [learners, trackOptions]);
  const trackName = trackOptions.find((t) => t.slug === track)?.name ?? null;
  const isFiltered = query.trim() !== "" || track !== "";
  // When a track is selected, show that track's activity, not the learner's
  // program-wide totals — otherwise a Security+ view counts their MASS/hangout
  // sessions too and over-reports the track.
  const countsFor = (l: EngagementLearner) =>
    track
      ? l.byTrack[track] ?? { videosWatched: 0, attended: 0, submitted: 0 }
      : { videosWatched: l.videosWatched, attended: l.attended, submitted: l.submitted };
  // Step-wise funnel: each stage is a % of the PRIOR stage, not all against
  // "invited". Reading Engaged as "% of invited" put 13 next to 76% right beside
  // a "36" account count — three numbers that don't reconcile. As a funnel it's
  // honest: Created = % of invited, Engaged = % of those who created an account.
  // null when the base is 0 ("% of 0" is meaningless, e.g. cohorts added directly
  // rather than via an allowlist). Capped at 100 for the rare direct-add case
  // where a stage exceeds its base.
  const pctOf = (v: number, base: number): number | null =>
    base > 0 ? Math.min(100, Math.round((v / base) * 100)) : null;

  const cards = [
    { label: "Invited", sublabel: "received access", value: funnel.invited, pctLabel: null },
    {
      label: "Created account",
      sublabel: "& signed in",
      value: funnel.activated,
      pctLabel: pctOf(funnel.activated, funnel.invited) === null ? null : `${pctOf(funnel.activated, funnel.invited)}% of invited`,
    },
    {
      label: "Engaged",
      sublabel: "watched · attended · submitted",
      value: funnel.engaged,
      pctLabel: pctOf(funnel.engaged, funnel.activated) === null ? null : `${pctOf(funnel.engaged, funnel.activated)}% of accounts`,
    },
  ];

  return (
    <div className="space-y-8">
      <TrendsRow />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          return (
            <div key={c.label} className="rounded-xl border border-rule bg-white p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-ink">{c.value}</span>
                {c.pctLabel !== null && (
                  <span className="text-xs font-medium text-ink-faint">{c.pctLabel}</span>
                )}
              </div>
              <div className="mt-1 text-sm font-semibold text-ink">{c.label}</div>
              <div className="text-xs text-ink-faint">{c.sublabel}</div>
            </div>
          );
        })}
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Per-learner activity ({isFiltered ? `${filtered.length} of ${learners.length}` : learners.length})
          </h2>
          <div className="flex items-center gap-2">
            {availableTracks.length > 0 && (
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                aria-label="Filter by track"
                className="border border-rule bg-white px-2.5 py-1.5 text-sm text-ink focus:border-ink-faint focus:outline-none"
              >
                <option value="">All tracks</option>
                {availableTracks.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.name}</option>
                ))}
              </select>
            )}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or email…"
              className="w-48 border border-rule bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink-faint focus:outline-none sm:w-64"
            />
            <button
              type="button"
              onClick={() => downloadCsv(filtered, data.programName, track, trackName)}
              disabled={filtered.length === 0}
              className="border border-rule bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV · {filtered.length}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-rule">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="px-3 py-2 font-semibold">Learner</th>
                <th className="px-3 py-2 font-semibold">Signed up</th>
                <th className="px-3 py-2 font-semibold">Last active</th>
                <th className="px-3 py-2 text-center font-semibold">Videos</th>
                <th className="px-3 py-2 text-center font-semibold">Attended</th>
                <th className="px-3 py-2 text-center font-semibold">Submitted</th>
                <th className="px-3 py-2 text-center font-semibold">Surveys</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const open = openSurveys === l.email;
                const c = countsFor(l);
                return (
                <Fragment key={l.email}>
                <tr
                  className={`border-b border-rule/60 ${open ? "" : "last:border-0"} ${c.videosWatched + c.attended + c.submitted > 0 ? "bg-[#f3f8ff]" : ""}`}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{l.name || l.email}</div>
                    {l.name && <div className="text-xs text-ink-faint">{l.email}</div>}
                  </td>
                  <td className="px-3 py-2 text-ink-soft">{l.signedUp ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-soft">{l.lastActive ?? "—"}</td>
                  <td className="px-3 py-2 text-center text-ink">{c.videosWatched}</td>
                  <td className="px-3 py-2 text-center text-ink">{c.attended}</td>
                  <td className="px-3 py-2 text-center text-ink">{c.submitted}</td>
                  <td className="px-3 py-2 text-center text-ink">
                    {l.surveys > 0 ? (
                      <button
                        type="button"
                        onClick={() => setOpenSurveys(open ? null : l.email)}
                        aria-expanded={open}
                        className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {l.surveys}
                        <span aria-hidden className={`text-[9px] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
                      </button>
                    ) : (
                      <span className="text-ink">0</span>
                    )}
                  </td>
                </tr>
                {open && (
                  <tr className="border-b border-rule/60 bg-paper-tint">
                    <td colSpan={7} className="px-3 py-2.5">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                        Surveys completed by {l.name || l.email}
                      </p>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1">
                        {l.surveyList.map((sv, i) => (
                          <li key={`${sv.type}-${i}`} className="text-xs text-ink-soft">
                            <span className="font-medium text-ink">{surveyTitle(sv.type)}</span>
                            {sv.completedAt && (
                              <span className="text-ink-faint"> · {sv.completedAt.slice(0, 10)}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
                </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-ink-faint">
                    {learners.length === 0
                      ? "No learners in this program yet."
                      : "No learners match that filter."}
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

// Human label for a survey_type slug. A few known types get a clean name; the
// rest fall back to title-cased slug so a new survey never renders as a raw id.
const SURVEY_TITLES: Record<string, string> = {
  "bcc-learner-intake": "Learner Intake",
  "security-plus-application": "Security+ Application",
  "comptia-security-application": "Security+ Application",
  "comptia-security-agreement": "Security+ Participation Agreement",
  "comptia-security-pre": "Security+ Pre-Program Survey",
  "comptia-security-post": "Security+ Post-Program Survey",
  "network-plus-post": "Network+ Post-Program Survey",
  "catalyst-participation-agreement": "Catalyst Participation Agreement",
};
function surveyTitle(type: string): string {
  return (
    SURVEY_TITLES[type] ??
    type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// Client-side CSV of the (filtered) learner rows — lets staff hand off
// engagement data without re-running the export scripts. Quotes every field so
// commas/quotes in names don't break columns.
function downloadCsv(learners: EngagementLearner[], programName: string, track: string, trackName: string | null) {
  const header = ["Name", "Email", "ZIP", "State", "Birthday", "Age", "Signed up", "Last active", "Videos", "Attended", "Submitted", "Surveys"];
  const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  // Match the table: when a track is selected, export that track's counts, not
  // the learner's program-wide totals.
  const rows = learners.map((l) => {
    const c = track ? l.byTrack[track] ?? { videosWatched: 0, attended: 0, submitted: 0 } : l;
    return [l.name, l.email, l.zip, l.state, l.dateOfBirth, l.age, l.signedUp, l.lastActive, c.videosWatched, c.attended, c.submitted, l.surveys]
      .map(esc)
      .join(",");
  });
  const csv = [header.map(esc).join(","), ...rows].join("\n");
  // Name the file after the scope actually exported (program, or the selected
  // track) so a track-filtered download isn't mistaken for the whole program.
  const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = slugify(trackName || programName);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug || "program"}-engagement.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
