"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SurveyDashboard } from "../surveys/[surveyId]/survey-dashboard";
import type { SurveyQuestion } from "@/components/survey-fields";
import type { BCCSurveyResponse } from "../actions";
import type { SurveyConfig } from "@/lib/programs/types";
import { StatCard } from "@/components/stats/stat-card";
import { normalizeCohortLabel } from "@/lib/surveys/cohort-labels";

interface Section {
  survey: SurveyConfig;
  schema: SurveyQuestion[] | null;
  responses: BCCSurveyResponse[];
}

interface Props {
  sections: Section[];
  programs: { slug: string; name: string }[];
  totalResponses: number;
}

// Program breakdown stays in the cobalt family — distinguishable by lightness,
// not by hue. No amber/purple/pink rainbow; the brand is one accent.
const PALETTE = [
  "#1D59FF", // cobalt — primary
  "#7CA0FF", // cobalt light
  "#1A2B6B", // deep navy
  "#4B5FA8", // muted indigo
  "#A7B6D9", // slate
  "#C9D4F0", // pale cobalt
];

function colorFor(
  programs: { slug: string; name: string }[],
  slug: string,
): string {
  const idx = programs.findIndex((p) => p.slug === slug);
  return idx >= 0 ? PALETTE[idx % PALETTE.length] : "#6B7280";
}

// Cohort = the program/track the respondent belongs to. Auth surveys stamp it
// from the student's enrollment (program_variant / _cohort_track); public
// surveys carry the respondent-selected program_variant. "Untagged" when
// neither is present (older responses from before cohort capture).
function cohortOf(r: BCCSurveyResponse): string {
  const raw = (r.responses?.program_variant ?? r.responses?._cohort_track) as unknown;
  // Normalize so a slug ("comptia-security") and its label ("Comptia Security+")
  // collapse to one cohort bucket instead of splitting.
  return typeof raw === "string" && raw.trim() ? normalizeCohortLabel(raw) : "Untagged";
}

function cohortColor(name: string, cohorts: string[]): string {
  if (name === "Untagged") return "#C9D4F0";
  const idx = cohorts.filter((c) => c !== "Untagged").indexOf(name);
  return idx >= 0 ? PALETTE[idx % PALETTE.length] : "#6B7280";
}

export function InsightsDashboard({
  sections,
  programs,
}: Props) {

  // Distinct cohorts across all responses — the dimension people actually search
  // by. Tagged cohorts first (alphabetical), "Untagged" last.
  const allCohorts = useMemo(() => {
    const set = new Set<string>();
    for (const s of sections) for (const r of s.responses) set.add(cohortOf(r));
    return Array.from(set).sort((a, b) =>
      a === "Untagged" ? 1 : b === "Untagged" ? -1 : a.localeCompare(b),
    );
  }, [sections]);
  const [cohortFilter, setCohortFilter] = useState<string>("all");

  // Selecting a cohort scopes the WHOLE page — hero stats, timeline, and the
  // survey cards — not just the detail panel. Anything narrower reads as "the
  // filter does nothing" because the big numbers up top never move.
  const visibleSections = useMemo(
    () =>
      cohortFilter === "all"
        ? sections
        : sections.map((s) => ({
            ...s,
            responses: s.responses.filter((r) => cohortOf(r) === cohortFilter),
          })),
    [sections, cohortFilter],
  );

  const ledger = useMemo(() => buildLedger(visibleSections, allCohorts), [visibleSections, allCohorts]);
  // Tie the survey grid to the cohort dropdown: when a cohort is selected, only
  // show surveys that actually have responses for it (otherwise the grid is a
  // wall of every survey, most with 0, which makes finding the cohort's data hard).
  const visibleLedger = useMemo(
    () => (cohortFilter === "all" ? ledger : ledger.filter((row) => row.count > 0)),
    [ledger, cohortFilter],
  );
  const uniqueRespondents = useMemo(() => {
    const emails = new Set<string>();
    for (const s of visibleSections) {
      for (const r of s.responses) {
        if (r.email) emails.add(r.email.toLowerCase());
      }
    }
    return emails.size;
  }, [visibleSections]);
  const shownResponses = useMemo(
    () => visibleSections.reduce((n, s) => n + s.responses.length, 0),
    [visibleSections],
  );
  const shownSurveys =
    cohortFilter === "all"
      ? sections.length
      : visibleSections.filter((s) => s.responses.length > 0).length;
  // One figure PER SURVEY for the cohort view, so a pre-survey, a post-survey
  // and an intake form are never summed into one meaningless "Responses" total.
  const perSurveyStats = useMemo(
    () =>
      visibleSections
        .filter((s) => s.responses.length > 0)
        .map((s) => ({ id: s.survey.id, title: s.survey.title, count: s.responses.length }))
        .sort((a, b) => b.count - a.count),
    [visibleSections],
  );

  // Cohort is deep-linkable via ?cohort=… so one URL opens straight on a cohort
  // (e.g. sharing the Digital Natives view). Read once on mount.
  const cohortInit = useRef(false);
  useEffect(() => {
    if (cohortInit.current || typeof window === "undefined") return;
    cohortInit.current = true;
    const c = new URLSearchParams(window.location.search).get("cohort");
    // Syncing initial state from the URL must happen after mount, not via a lazy
    // useState initializer — the server can't read window, so doing it in render
    // would hydration-mismatch. This is the legitimate "read external system on
    // mount" case the rule's perf guard doesn't apply to.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c && allCohorts.includes(c)) setCohortFilter(c);
  }, [allCohorts]);

  function changeCohort(value: string) {
    setCohortFilter(value);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete("cohort");
    else url.searchParams.set("cohort", value);
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const initialId =
    visibleLedger.find((row) => row.hasSchema)?.id ?? visibleLedger[0]?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(initialId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromHash = window.location.hash.slice(1);
    if (fromHash && ledger.some((row) => row.id === fromHash)) {
      // Same as above: reading location.hash is a post-mount external sync, not
      // a render-time value the server could produce.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId(fromHash);
    }
    function onHashChange() {
      const id = window.location.hash.slice(1);
      if (id && ledger.some((row) => row.id === id)) setActiveId(id);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [ledger]);

  function selectSurvey(id: string) {
    setActiveId(id);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  }

  const active = visibleSections.find((s) => s.survey.id === activeId) ?? null;
  if (sections.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-ink-soft">
          No survey responses yet. Once a cohort starts answering, this page
          will come alive.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero — across all cohorts, a roll-up overview. Inside one cohort, a
         figure PER SURVEY instead, because summing a pre-survey + post-survey +
         intake form into a single number means nothing. */}
      {cohortFilter === "all" ? (
        <div className="grid grid-cols-3 gap-3">
          <StatCard value={shownResponses.toLocaleString()} label="Responses" />
          <StatCard value={uniqueRespondents.toLocaleString()} label="Respondents" />
          <StatCard value={shownSurveys.toLocaleString()} label="Surveys" />
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {perSurveyStats.map((s) => (
              <StatCard key={s.id} value={s.count.toLocaleString()} label={s.title} />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            {cohortFilter} — {uniqueRespondents.toLocaleString()}{" "}
            {uniqueRespondents === 1 ? "person" : "people"} across {shownSurveys}{" "}
            survey{shownSurveys === 1 ? "" : "s"}. Each card is a separate survey,
            not a combined total.
          </p>
        </div>
      )}

      {/* Cohort filter (scope the page to one cohort) + PDF export of the
         current scope. Export always shows; the filter only when there's more
         than one cohort. */}
      <div className="flex items-center justify-between gap-2">
        {allCohorts.length > 1 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="cohort-filter" className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              Cohort
            </label>
            <select
              id="cohort-filter"
              value={cohortFilter}
              onChange={(e) => changeCohort(e.target.value)}
              className="border border-rule bg-white px-2.5 py-1.5 text-sm text-ink focus:border-ink-faint focus:outline-none"
            >
              <option value="all">All cohorts</option>
              {allCohorts.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <a
            href={`/api/insights/csv${cohortFilter !== "all" ? `?cohort=${encodeURIComponent(cohortFilter)}` : ""}`}
            className="border border-rule bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
          >
            Export CSV
          </a>
          <a
            href={`/api/insights/pdf${cohortFilter !== "all" ? `?cohort=${encodeURIComponent(cohortFilter)}` : ""}`}
            className="border border-rule bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
          >
            Export PDF
          </a>
        </div>
      </div>

      {/* Survey cards */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Surveys
        </p>
        {cohortFilter !== "all" && visibleLedger.length === 0 ? (
          <div className="border border-rule bg-surface-elevated p-6 text-center">
            <p className="text-sm text-ink-soft">
              No responses for{" "}
              <span className="font-semibold text-ink">{cohortFilter}</span> yet.{" "}
              <button
                type="button"
                onClick={() => changeCohort("all")}
                className="underline hover:text-ink"
              >
                View all cohorts
              </button>
            </p>
          </div>
        ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleLedger.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => row.hasSchema && selectSurvey(row.id)}
              disabled={!row.hasSchema}
              className={`group border bg-surface-elevated p-4 text-left transition-all ${
                activeId === row.id
                  ? "border-ink ring-1 ring-ink"
                  : row.hasSchema
                    ? "border-rule hover:border-rule hover:shadow-sm"
                    : "cursor-not-allowed border-rule-soft opacity-60"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {row.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {row.lastActivity
                      ? `Last response ${timeAgo(row.lastActivity)}`
                      : "No responses yet"}
                  </p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-ink">
                  {row.count}
                </p>
              </div>

              {/* Per-cohort breakdown — who actually took it (Digital Natives,
                 AI Fundamentals, …), not the umbrella program. Single bar with
                 an inline key; the count to the right tells volume. */}
              {row.cohortBreakdown.length > 0 ? (
                <>
                  <div className="mb-1.5 flex h-2 w-full overflow-hidden rounded-full bg-paper-tint">
                    {row.cohortBreakdown.map((seg) => (
                      <div
                        key={seg.name}
                        style={{
                          width: `${(seg.count / row.count) * 100}%`,
                          backgroundColor: seg.color,
                        }}
                        className="h-full"
                        title={`${seg.name}: ${seg.count}`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-ink-soft">
                    {row.cohortBreakdown.map((seg, i) => (
                      <span key={seg.name}>
                        {i > 0 && <span className="text-ink-faint"> · </span>}
                        <span
                          aria-hidden
                          className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                          style={{ backgroundColor: seg.color }}
                        />
                        {seg.name} <span className="tabular-nums text-ink">{seg.count}</span>
                      </span>
                    ))}
                  </p>
                </>
              ) : (
                <div className="h-2 w-full overflow-hidden rounded-full bg-paper-tint" />
              )}
            </button>
          ))}
        </div>
        )}
      </section>

      {/* Program legend */}
      {programs.length > 1 && (
        <div className="flex flex-wrap gap-3">
          {programs.map((p) => (
            <span key={p.slug} className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: colorFor(programs, p.slug) }}
              />
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Detail view */}
      {active && active.schema && (
        <section className="pt-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            {cohortFilter !== "all" ? (
              <p className="text-[12px] text-ink-soft">
                Showing <span className="font-semibold text-ink">{cohortFilter}</span> only —{" "}
                <button type="button" onClick={() => changeCohort("all")} className="underline hover:text-ink">
                  clear
                </button>
              </p>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {/* CSV export — raw data for your team */}
              <a
                href={`/api/insights/csv?survey=${encodeURIComponent(active.survey.id)}${cohortFilter !== "all" ? `&cohort=${encodeURIComponent(cohortFilter)}` : ""}`}
                className="shrink-0 border border-rule bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
              >
                Export CSV
              </a>
              {/* Per-question detailed PDF for THIS survey, honoring the cohort filter. */}
              <a
                href={`/api/insights/pdf?detailed=1&survey=${encodeURIComponent(active.survey.id)}${cohortFilter !== "all" ? `&cohort=${encodeURIComponent(cohortFilter)}` : ""}`}
                className="shrink-0 border border-rule bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
              >
                Detailed report ↓
              </a>
            </div>
          </div>
          <SurveyDashboard
            surveyId={active.survey.id}
            surveyTitle={active.survey.title}
            schema={active.schema}
            responses={active.responses}
            programs={programs}
            chrome="embedded"
          />
        </section>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────


// ── Helpers ──────────────────────────────────────────────────────────────────

interface LedgerRow {
  id: string;
  title: string;
  count: number;
  lastActivity: string | null;
  hasSchema: boolean;
  cohortBreakdown: { name: string; count: number; color: string }[];
}

function buildLedger(
  sections: Section[],
  allCohorts: string[],
): LedgerRow[] {
  return sections
    .map((s) => {
      const byCohort = new Map<string, number>();
      for (const r of s.responses) {
        const c = cohortOf(r);
        byCohort.set(c, (byCohort.get(c) ?? 0) + 1);
      }
      const cohortBreakdown = Array.from(byCohort.entries())
        .map(([name, count]) => ({ name, count, color: cohortColor(name, allCohorts) }))
        .sort((a, b) => b.count - a.count);

      const last = s.responses.reduce<string | null>((max, r) => {
        if (!r.completed_at) return max;
        if (!max) return r.completed_at;
        return r.completed_at > max ? r.completed_at : max;
      }, null);

      return {
        id: s.survey.id,
        title: s.survey.title,
        count: s.responses.length,
        lastActivity: last,
        hasSchema: !!s.schema,
        cohortBreakdown,
      };
    })
    .sort((a, b) => {
      if (!a.lastActivity && !b.lastActivity) return b.count - a.count;
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return b.lastActivity.localeCompare(a.lastActivity);
    });
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = Math.round(ms / (1000 * 60 * 60));
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const wks = Math.round(days / 7);
  return `${wks}w ago`;
}
