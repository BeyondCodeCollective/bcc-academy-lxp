"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SurveyQuestion } from "@/components/survey-fields";
import type { BCCSurveyResponse } from "../actions";
import type { SurveyConfig } from "@/lib/programs/types";
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

// Grant-critical columns. The export flattens survey answers, so a blank here
// ships an incomplete grant file. We flag only a field the survey actually
// collects (some response filled it), then count the rows that left it empty —
// so a partial CSV can't go out unnoticed, the way the early intake rows did.
const GRANT_FIELDS: { id: string; label: string }[] = [
  { id: "full_name", label: "name" },
  { id: "zip_code", label: "ZIP" },
  { id: "date_of_birth", label: "DOB" },
  { id: "intake_consent", label: "consent" },
];

function grantFieldValue(r: BCCSurveyResponse, id: string): string | null {
  const raw = id === "full_name" ? (r.responses?.full_name ?? r.full_name) : r.responses?.[id];
  const s = raw == null ? "" : String(raw).trim();
  return s.length ? s : null;
}

function grantCompleteness(responses: BCCSurveyResponse[]): { label: string; count: number }[] {
  return GRANT_FIELDS
    .filter((f) => responses.some((r) => grantFieldValue(r, f.id) != null))
    .map((f) => ({ label: f.label, count: responses.filter((r) => grantFieldValue(r, f.id) == null).length }))
    .filter((m) => m.count > 0);
}

export function InsightsDashboard({ sections, programs }: Props) {
  // Distinct cohorts across all responses — needed to color the per-survey
  // breakdown consistently.
  const allCohorts = useMemo(() => {
    const set = new Set<string>();
    for (const s of sections) for (const r of s.responses) set.add(cohortOf(r));
    return Array.from(set).sort((a, b) =>
      a === "Untagged" ? 1 : b === "Untagged" ? -1 : a.localeCompare(b),
    );
  }, [sections]);

  const ledger = useMemo(() => buildLedger(sections, allCohorts), [sections, allCohorts]);

  // Roll-up stats for the three tiles (scoped to this program, like the page).
  const totalResponses = useMemo(
    () => sections.reduce((n, s) => n + s.responses.length, 0),
    [sections],
  );
  const uniqueRespondents = useMemo(() => {
    const emails = new Set<string>();
    for (const s of sections)
      for (const r of s.responses) if (r.email) emails.add(r.email.toLowerCase());
    return emails.size;
  }, [sections]);

  // Survey is the PRIMARY selector. Default to the most recent survey with a
  // real schema, else the first one.
  const initialId =
    ledger.find((row) => row.hasSchema)?.id ?? ledger[0]?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(initialId);

  // Deep-link a survey via #id (share a URL that opens straight on it).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromHash = window.location.hash.slice(1);
    if (fromHash && ledger.some((row) => row.id === fromHash)) {
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
    setCohortFilter("all");
    if (typeof window !== "undefined") history.replaceState(null, "", `#${id}`);
  }

  const activeRow = ledger.find((row) => row.id === activeId) ?? null;
  const activeSection = sections.find((s) => s.survey.id === activeId) ?? null;

  // Cohort is a SUB-filter of the selected survey, shown only when the survey
  // genuinely spans more than one real (non-Untagged) cohort.
  const surveyCohorts = (activeRow?.cohortBreakdown ?? []).filter(
    (c) => c.name !== "Untagged",
  );
  const multiCohort = surveyCohorts.length > 1;
  const [cohortFilter, setCohortFilter] = useState<string>("all");

  const scopedResponses = useMemo(() => {
    if (!activeSection) return [];
    if (!multiCohort || cohortFilter === "all") return activeSection.responses;
    return activeSection.responses.filter((r) => cohortOf(r) === cohortFilter);
  }, [activeSection, multiCohort, cohortFilter]);

  const scopedCount = scopedResponses.length;
  const series = useMemo(() => responseSeries(scopedResponses), [scopedResponses]);
  const shownCohorts =
    multiCohort && cohortFilter !== "all"
      ? surveyCohorts.filter((c) => c.name === cohortFilter)
      : surveyCohorts;

  const isAgreement = !!activeId && /agreement/i.test(activeId);
  const cohortParam =
    multiCohort && cohortFilter !== "all"
      ? `&cohort=${encodeURIComponent(cohortFilter)}`
      : "";
  const grantGaps = activeSection ? grantCompleteness(activeSection.responses) : [];

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
    <div className="space-y-8">
      {/* Roll-up tiles — each links somewhere useful. */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile value={totalResponses} label="Responses" href="/api/insights/csv" download />
        <StatTile value={uniqueRespondents} label="Respondents" href="/dashboard/admin?tab=students" />
        <StatTile value={sections.length} label="Surveys" href="/dashboard/admin/surveys" />
      </div>

      {/* One fused component: the survey selector IS the card header, and its
         summary swaps in place. No separate dropdown floating above a card. */}
      <div className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Form</span>
              <select
                value={activeId ?? ""}
                onChange={(e) => selectSurvey(e.target.value)}
                className="min-w-[16rem] rounded-lg border border-rule bg-white px-3 py-2 text-sm font-semibold text-ink focus:border-ink-faint focus:outline-none"
              >
                {ledger.map((row) => (
                  <option key={row.id} value={row.id}>{row.title}</option>
                ))}
              </select>
            </label>
            {multiCohort && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Cohort</span>
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value)}
                  className="rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink focus:border-ink-faint focus:outline-none"
                >
                  <option value="all">All cohorts</option>
                  {surveyCohorts.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="text-right text-3xl font-bold tabular-nums leading-none text-ink sm:text-4xl">
            {scopedCount.toLocaleString()}
            <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Responses
            </span>
          </p>
        </div>

        {/* Responses over time — value on each bar, date under it. Granularity
           (day vs week) adapts to the collection window and is labeled so a
           weekly bucket is never misread as a single day. */}
        {series.bars.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Responses over time{" "}
              <span className="font-medium normal-case text-ink-faint">· by {series.granularity}</span>
            </p>
            <ResponsesChart bars={series.bars} />
          </div>
        )}

        {/* Cohort pills (only when meaningful) + last response. */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-faint">
          {shownCohorts.map((c) => (
            <span
              key={c.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-paper-tint-soft px-2.5 py-1 text-xs font-semibold text-ink"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
              {multiCohort && <span className="tabular-nums text-ink-soft">{c.count}</span>}
            </span>
          ))}
          <span>Last response {activeRow?.lastActivity ? timeAgo(activeRow.lastActivity) : "—"}</span>
        </div>

        {grantGaps.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Heads up before you export:{" "}
            {grantGaps
              .map((g) => `${g.count} ${g.count === 1 ? "response is" : "responses are"} missing ${g.label}`)
              .join(" · ")}
            . Those cells will be blank in the CSV.
          </div>
        )}

        {/* Exports — the full question-by-question detail lives here, not on the
           page (keeps this fast to scan, per the redesign). */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
          {activeRow?.hasSchema && (
            <a
              href={`/api/insights/pdf?detailed=1&survey=${encodeURIComponent(activeId ?? "")}${cohortParam}`}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Detailed report ↓
            </a>
          )}
          <a
            href={`/api/insights/csv?survey=${encodeURIComponent(activeId ?? "")}${cohortParam}`}
            className="rounded-lg border border-rule bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
          >
            Export CSV
          </a>
          <a
            href={`/api/insights/pdf?survey=${encodeURIComponent(activeId ?? "")}${cohortParam}`}
            className="rounded-lg border border-rule bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
          >
            Export PDF
          </a>
          {isAgreement && (
            <Link
              href="/dashboard/admin/agreements"
              className="ml-auto text-sm font-medium text-primary hover:underline"
            >
              Who has signed &rarr;
            </Link>
          )}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Every question, answer, and free-text response is in the detailed report —
        kept off the page to keep this fast to scan.
      </p>

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
    </div>
  );
}

// The three roll-up tiles, as links. `download` for the CSV route; internal
// nav otherwise. Hover reveals a ↗ so it reads as clickable.
function StatTile({
  value,
  label,
  href,
  download,
}: {
  value: number;
  label: string;
  href: string;
  download?: boolean;
}) {
  const inner = (
    <>
      <span className="absolute right-4 top-4 text-ink-faint opacity-0 transition group-hover:opacity-100 group-hover:text-primary">
        ↗
      </span>
      <p className="text-3xl font-bold tabular-nums text-ink sm:text-4xl">
        {value.toLocaleString()}
      </p>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
    </>
  );
  const cls =
    "group relative block panel p-5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm";
  return download ? (
    <a href={href} className={cls}>{inner}</a>
  ) : (
    <Link href={href} className={cls}>{inner}</Link>
  );
}

// Weekly responses bar chart — the count sits ON each bar, the week date under
// it, so every bar reads at a glance without hovering.
function ResponsesChart({ bars }: { bars: SeriesBar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.count));
  return (
    <>
      <div className="flex items-end gap-1">
        {bars.map((b, i) => (
          <div
            key={i}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            title={b.tip}
          >
            <span className="text-[10px] font-semibold tabular-nums text-ink-faint">{b.count}</span>
            <div
              className="w-full rounded-t bg-primary"
              style={{ height: `${Math.max((b.count / max) * 44, 3)}px`, opacity: 0.45 + 0.55 * (b.count / max) }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 text-center text-[10px] tabular-nums text-ink-faint">{b.label}</div>
        ))}
      </div>
    </>
  );
}

type SeriesBar = { label: string; count: number; tip: string };
type SeriesData = { bars: SeriesBar[]; granularity: "day" | "week" };

// Responses over time, derived from completed_at. Granularity adapts to the
// collection window: a form that's open a short while (applications, agreements)
// buckets by DAY so the real daily shape shows — a Mon–Sun weekly bucket labeled
// "Jul 20" reads as "17 on the 20th" when really they trickled in across the
// week. Long-running surveys bucket by week so the chart stays legible.
function responseSeries(responses: BCCSurveyResponse[]): SeriesData {
  const times = responses
    .map((r) => r.completed_at)
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime())
    .filter((t) => !Number.isNaN(t));
  if (times.length === 0) return { bars: [], granularity: "day" };
  const DAY = 86_400_000;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const daily = Math.round((max - min) / DAY) <= 14;
  const step = daily ? DAY : 7 * DAY;
  const bucket = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    if (!daily) d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
    return d.getTime();
  };
  const counts = new Map<number, number>();
  for (const t of times) {
    const b = bucket(t);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  const bars: SeriesBar[] = [];
  for (let b = bucket(min); b <= bucket(max); b += step) {
    const label = new Date(b).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const count = counts.get(b) ?? 0;
    const noun = count === 1 ? "response" : "responses";
    bars.push({ label, count, tip: `${daily ? "" : "Week of "}${label} · ${count} ${noun}` });
  }
  const cap = daily ? 14 : 8;
  return { bars: bars.length > cap ? bars.slice(-cap) : bars, granularity: daily ? "day" : "week" };
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
