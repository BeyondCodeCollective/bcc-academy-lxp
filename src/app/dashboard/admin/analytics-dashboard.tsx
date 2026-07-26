"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import type { EngagementAnalytics, EngagementLearner, EngagementTrends } from "./actions-analytics";
import { getEngagementTrends } from "./actions-analytics";
import { StatCard, type StatTrend } from "@/components/stats/stat-card";
import { METRIC_DEFS } from "@/lib/analytics/metric-defs";
import { RANGE_LABELS, type RangePreset, type Delta } from "@/lib/analytics/period";
import { buttonClass, DataTable, microLabel, Num, PersonCell } from "@/components/ui";
import { formatShortDate } from "@/lib/utils";

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
      {/* Range is a FILTER, not navigation — a select, so it can't read as a
         third row of tabs under the top tabs and the Analytics pills. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as RangePreset)}
          aria-label="Date range"
          className="rounded-lg border border-rule bg-white px-2.5 py-1.5 text-sm font-medium text-ink focus:border-ink-faint focus:outline-none"
        >
          {(Object.keys(RANGE_LABELS) as RangePreset[]).map((p) => (
            <option key={p} value={p}>{RANGE_LABELS[p]}</option>
          ))}
        </select>
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
export function AnalyticsDashboard({
  data,
  course,
}: {
  data: EngagementAnalytics;
  /** Shared Analytics scope — pre-select this course's track. */
  course?: string;
}) {
  const { funnel, learners, trackOptions } = data;
  // Name/email filter — the table runs to hundreds of rows (175+ at Upskill
  // scale), so an unfiltered wall is unusable. Match is case-insensitive across
  // both name and email.
  const [query, setQuery] = useState("");
  // Track filter — "" = all tracks. A program-scoped export silently blends
  // every track together, so "export Security+ zips" came back partial with no
  // signal why. Scoping the table AND the CSV to one track fixes that at source.
  // The shared Analytics scope (top-right) is the ONE course filter — no
  // second "All tracks" dropdown in the toolbar.
  const track = course ?? "";
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
  const trackName = trackOptions.find((t) => t.slug === track)?.name ?? null;
  const isFiltered = query.trim() !== "" || track !== "";
  // When a track is selected, show that track's activity, not the learner's
  // program-wide totals — otherwise a Security+ view counts their MASS/hangout
  // sessions too and over-reports the track.
  // A count column that is all zeros across the whole roster reads as broken
  // (live-session programs record no videos) — hide it instead of muting it.
  const showVideos = learners.some((l) => l.videosWatched > 0);
  const showAttended = learners.some((l) => l.attended > 0);
  const showSubmitted = learners.some((l) => l.submitted > 0);
  const totalCols =
    4 + [showVideos, showAttended, showSubmitted].filter(Boolean).length;
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

  const activatedPct = pctOf(funnel.activated, funnel.invited);
  const engagedPct = pctOf(funnel.engaged, funnel.activated);

  return (
    <div className="space-y-8">
      <TrendsRow />
      {/* Activation funnel — one quiet line. A second row of hero cards made
         the page read as six competing headlines. */}
      <section className="panel flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 py-3 text-sm">
        <FunnelStep value={funnel.invited} label="invited" />
        <span aria-hidden className="text-ink-faint">→</span>
        <FunnelStep
          value={funnel.activated}
          label="created account"
          pct={activatedPct === null ? undefined : `${activatedPct}% of invited`}
        />
        <span aria-hidden className="text-ink-faint">→</span>
        <FunnelStep
          value={funnel.engaged}
          label="engaged"
          pct={engagedPct === null ? undefined : `${engagedPct}% of accounts`}
        />
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={microLabel}>
            Per-learner activity ({isFiltered ? `${filtered.length} of ${learners.length}` : learners.length})
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or email…"
              className="w-48 rounded-lg border border-rule bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink-faint focus:outline-none sm:w-64"
            />
            <button
              type="button"
              onClick={() => downloadCsv(filtered, data.programName, track, trackName)}
              disabled={filtered.length === 0}
              className={buttonClass("secondary", "sm")}
            >
              Export CSV · {filtered.length}
            </button>
          </div>
        </div>
        <DataTable
          columns={[
            "Learner",
            "Signed up",
            "Last active",
            ...(showVideos ? [{ label: "Videos", align: "center" as const }] : []),
            ...(showAttended ? [{ label: "Attended", align: "center" as const }] : []),
            ...(showSubmitted ? [{ label: "Submitted", align: "center" as const }] : []),
            { label: "Surveys", align: "center" },
          ]}
        >
          {filtered.map((l) => {
            const open = openSurveys === l.email;
            const c = countsFor(l);
            return (
            <Fragment key={l.email}>
            <tr>
              <td className="px-4 py-2.5">
                <PersonCell name={l.name || null} email={l.email} />
              </td>
              <td className="px-4 py-2.5 text-ink-soft">{formatShortDate(l.signedUp)}</td>
              <td className="px-4 py-2.5 text-ink-soft">{formatShortDate(l.lastActive)}</td>
              {showVideos && <td className="px-4 py-2.5 text-center"><Num value={c.videosWatched} /></td>}
              {showAttended && <td className="px-4 py-2.5 text-center"><Num value={c.attended} /></td>}
              {showSubmitted && <td className="px-4 py-2.5 text-center"><Num value={c.submitted} /></td>}
              <td className="px-4 py-2.5 text-center">
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
                  <Num value={0} />
                )}
              </td>
            </tr>
            {open && (
              <tr className="bg-paper-tint">
                <td colSpan={totalCols} className="px-4 py-2.5">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                    Surveys completed by {l.name || l.email}
                  </p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {l.surveyList.map((sv, i) => (
                      <li key={`${sv.type}-${i}`} className="text-xs text-ink-soft">
                        <span className="font-medium text-ink">{surveyTitle(sv.type)}</span>
                        {sv.completedAt && (
                          <span className="text-ink-faint"> · {formatShortDate(sv.completedAt)}</span>
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
              <td colSpan={totalCols} className="px-4 py-8 text-center text-ink-faint">
                {learners.length === 0
                  ? "No learners in this program yet."
                  : "No learners match that filter."}
              </td>
            </tr>
          )}
        </DataTable>
        <p className="text-[11px] leading-relaxed text-ink-faint">
          &ldquo;Engaged&rdquo; = watched a video, attended a session, or submitted work.
          Logins-over-time, time-in-platform, and video&nbsp;% watched aren&rsquo;t tracked yet
          &mdash; coming with deeper event tracking.
        </p>
      </section>
    </div>
  );
}

// One step of the inline activation strip: count, quiet label, optional share.
function FunnelStep({ value, label, pct }: { value: number; label: string; pct?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-semibold tabular-nums text-ink">{value.toLocaleString()}</span>
      <span className="text-ink-soft">{label}</span>
      {pct && <span className="text-xs text-ink-faint">{pct}</span>}
    </span>
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
