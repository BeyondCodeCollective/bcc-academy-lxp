"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SurveyQuestion } from "@/components/survey-fields";
import type { BCCSurveyResponse } from "../actions";
import type { SurveyConfig } from "@/lib/programs/types";
import { normalizeCohortLabel } from "@/lib/surveys/cohort-labels";
import { COBALT_FAMILY as PALETTE } from "@/components/stats/palette";
import { StatCard } from "@/components/stats/stat-card";
import { buttonClass, microLabel } from "@/components/ui";
import { formatRelativeDate } from "@/lib/utils";
import {
  type ShiftGroup,
  type ShiftResponse,
  surveyCarriesShift,
  groupsFromSurvey,
  crossSurveyGroups,
  CROSS_SURVEY_PAIRS,
} from "@/lib/analytics/shift";
import { getSurveySchema } from "@/lib/surveys/schemas";
import { LearningShift } from "@/components/stats/learning-shift";

interface Section {
  survey: SurveyConfig;
  schema: SurveyQuestion[] | null;
  responses: BCCSurveyResponse[];
  /** Course scope: these responses are anonymous, so they aren't narrowed to
   *  the roster. Labelled, not hidden. */
  unscopedPublic?: boolean;
}

interface Props {
  sections: Section[];
  programs: { slug: string; name: string }[];
  totalResponses: number;
  /** Course scope. When set, the sections are already narrowed to this course's
   *  enrolled learners and every link/export carries the slug so a CSV can't
   *  come back program-wide. */
  scope?: { trackSlug: string; trackName: string; enrolledCount: number; returnTo: string };
}

// Program breakdown stays in the cobalt family (shared palette) —
// distinguishable by lightness, not by hue. No rainbow; the brand is one accent.

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

// Course-first: no shared course scope here — the Cohort selector below is
// this view's own (and only) course-level cut.
// Sentinel for "every form" in the Form select. A real survey id can never
// collide with it.
const ALL_FORMS = "__all__";

export function InsightsDashboard({ sections, programs, scope }: Props) {
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

  // Survey is the PRIMARY selector, and it now includes an ALL option so the
  // page opens on the whole picture and narrows from there — the controls tell
  // you what you're looking at instead of sitting under a summary that ignores
  // them.
  const [activeId, setActiveId] = useState<string | null>(ALL_FORMS);

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

  const isAllForms = activeId === ALL_FORMS;
  const activeRow = ledger.find((row) => row.id === activeId) ?? null;
  const activeSection = sections.find((s) => s.survey.id === activeId) ?? null;

  // Cohort is a SUB-filter of the selected survey, shown only when the survey
  // genuinely spans more than one real (non-Untagged) cohort.
  // Across ALL forms the cohort list is every cohort that answered anything;
  // for one form it's that form's own breakdown.
  const surveyCohorts = isAllForms
    ? allCohorts
        .filter((name) => name !== "Untagged")
        .map((name) => ({
          name,
          count: sections.reduce(
            (n, sec) => n + sec.responses.filter((r) => cohortOf(r) === name).length,
            0,
          ),
          color: cohortColor(name, allCohorts),
        }))
    : (activeRow?.cohortBreakdown ?? []).filter((c) => c.name !== "Untagged");
  const multiCohort = surveyCohorts.length > 1;
  // The form dictates the cohort, never the reverse: a cohort is a slice of
  // ONE form's respondents, so filtering "All forms" by cohort produced
  // numbers with no nameable survey behind them. No form, no cohort filter.
  const cohortSelectable = !isAllForms && multiCohort;
  const [cohortFilter, setCohortFilter] = useState<string>("all");

  const scopedResponses = useMemo(() => {
    const pool = isAllForms
      ? sections.flatMap((sec) => sec.responses)
      : (activeSection?.responses ?? []);
    if (!cohortSelectable || cohortFilter === "all") return pool;
    return pool.filter((r) => cohortOf(r) === cohortFilter);
  }, [isAllForms, sections, activeSection, cohortSelectable, cohortFilter]);

  const scopedCount = scopedResponses.length;
  // The tiles describe the CURRENT selection. A summary that ignores the
  // controls above it is just a number you have to mentally discount.
  const scopedRespondents = useMemo(() => {
    const emails = new Set<string>();
    for (const r of scopedResponses) if (r.email) emails.add(r.email.toLowerCase());
    return emails.size;
  }, [scopedResponses]);
  const scopedCohortCount = useMemo(
    () => new Set(scopedResponses.map((r) => cohortOf(r))).size,
    [scopedResponses],
  );
  const scopedFormCount = useMemo(
    () =>
      isAllForms
        ? sections.filter((sec) => sec.responses.length > 0).length
        : activeSection && activeSection.responses.length > 0
          ? 1
          : 0,
    [isAllForms, sections, activeSection],
  );
  const series = useMemo(() => responseSeries(scopedResponses), [scopedResponses]);
  const shownCohorts =
    cohortSelectable && cohortFilter !== "all"
      ? surveyCohorts.filter((c) => c.name === cohortFilter)
      : surveyCohorts;

  // "What changed" for exactly what's selected above. It used to be computed
  // server-side over the whole program and rendered below the panel, so
  // narrowing to a cohort of 3 still showed a shift across all 5 respondents —
  // the section ignored the controls it sat under.
  //
  // Cohort narrows BOTH sides of a pre→post pair: picking "AI Fundamentals for
  // Digital Natives" compares that cohort's pre-survey answers to its own post
  // ones, not to the whole program's.
  const scopedShift = useMemo(() => {
    const inScope = (rows: ShiftResponse[]) =>
      cohortSelectable && cohortFilter !== "all"
        ? rows.filter((r) => cohortOf(r as unknown as BCCSurveyResponse) === cohortFilter)
        : rows;
    const bySurvey = new Map<string, ShiftResponse[]>();
    for (const sec of sections) bySurvey.set(sec.survey.id, inScope(sec.responses));

    const groups: ShiftGroup[] = [];
    // A single form can carry its own before/now (the mid-program check-in).
    for (const [id, rows] of bySurvey) {
      if (!isAllForms && id !== activeId) continue;
      if (rows.length === 0) continue;
      const schema = getSurveySchema(id);
      if (!schema || !surveyCarriesShift(schema)) continue;
      groups.push(...groupsFromSurvey(id, schema, rows));
    }
    // Cross-survey pre→post pairs. Included when viewing all forms, or when the
    // selected form is either half of the pair — picking the post-survey should
    // show you the shift it's half of, not an empty section.
    for (const pair of CROSS_SURVEY_PAIRS) {
      if (!isAllForms && activeId !== pair.before && activeId !== pair.after) continue;
      const before = bySurvey.get(pair.before) ?? [];
      const after = bySurvey.get(pair.after) ?? [];
      if (before.length === 0 || after.length === 0) continue;
      groups.push(...crossSurveyGroups(pair, before, after));
    }
    const MIN_SHIFT_N = 3;
    const sampled = groups
      .map((g) => ({ ...g, rows: g.rows.filter((r) => r.n >= MIN_SHIFT_N) }))
      .filter((g) => g.rows.length > 0);
    // A pre→post pair that exists but sits under the floor is the common case on
    // a small course, and silently rendering nothing reads as broken. Report it
    // so the absence has a reason attached.
    if (sampled.length === 0) {
      return { outcomes: null, belowFloor: groups.length > 0, minN: MIN_SHIFT_N };
    }
    const allRows = sampled.flatMap((g) => g.rows);
    return {
      outcomes: {
        groups: sampled,
        avgDelta: allRows.reduce((n, r) => n + r.delta, 0) / allRows.length,
        statementCount: new Set(allRows.map((r) => r.statement)).size,
        respondents: Math.max(...sampled.map((g) => Math.max(...g.rows.map((r) => r.n)))),
        pathway: [],
        archetype: [],
      },
      belowFloor: false,
      minN: MIN_SHIFT_N,
    };
  }, [sections, isAllForms, activeId, cohortSelectable, cohortFilter]);

  const isAgreement = !!activeId && /agreement/i.test(activeId);
  // Every export and drill-down link below appends this. Course scope that the
  // screen honours but a CSV forgets is worse than no scope at all — the file
  // looks like this course's data and isn't.
  const scopeParam = scope ? `&trackSlug=${encodeURIComponent(scope.trackSlug)}` : "";
  const cohortParam =
    (cohortSelectable && cohortFilter !== "all"
      ? `&cohort=${encodeURIComponent(cohortFilter)}`
      : "") + scopeParam;
  const grantGaps = activeSection ? grantCompleteness(activeSection.responses) : [];

  if (sections.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-ink-soft">
          {scope
            ? `Nobody enrolled in ${scope.trackName} has answered a survey yet. The forms assigned to this course are listed below.`
            : "No survey responses yet. Once a cohort starts answering, this page will come alive."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Controls first: what you pick here decides everything below it —
         the tiles, the chart, the cohort pills, and the exports. */}
      <div className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={microLabel}>Form</span>
              <select
                value={activeId ?? ""}
                onChange={(e) => selectSurvey(e.target.value)}
                className="min-w-[16rem] rounded-lg border border-rule bg-white px-3 py-2 text-sm font-semibold text-ink focus:border-ink-faint"
              >
                <option value={ALL_FORMS}>All forms</option>
                {ledger.map((row) => (
                  <option key={row.id} value={row.id}>{row.title}</option>
                ))}
              </select>
            </label>
            {cohortSelectable && (
              <label className="flex flex-col gap-1.5">
                <span className={microLabel}>Cohort</span>
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value)}
                  className="rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink focus:border-ink-faint"
                >
                  <option value="all">All cohorts</option>
                  {surveyCohorts.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        {/* Tiles describe the selection above them, so changing Form or Cohort
           moves these numbers too. */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatCard
            value={scopedCount.toLocaleString()}
            label="Responses"
            href={`/api/insights/csv${isAllForms ? "" : `?survey=${encodeURIComponent(activeId ?? "")}${cohortParam}`}`}
            download
          />
          <StatCard
            value={
              scope
                ? `${scopedRespondents.toLocaleString()} of ${scope.enrolledCount}`
                : scopedRespondents.toLocaleString()
            }
            label={scope ? "Respondents enrolled" : "Respondents"}
            href={
              scope
                ? `/dashboard/admin?tab=${encodeURIComponent(scope.trackSlug)}&view=students`
                : "/dashboard/admin?tab=students"
            }
          />
          <StatCard
            value={(isAllForms ? scopedFormCount : scopedCohortCount).toLocaleString()}
            label={isAllForms ? "Forms answered" : "Cohorts"}
            href={isAllForms ? "/dashboard/admin/surveys" : undefined}
          />
        </div>

        {/* Responses over time — value on each bar, date under it. Granularity
           (day vs week) adapts to the collection window and is labeled so a
           weekly bucket is never misread as a single day. */}
        {series.bars.length > 0 && (
          <div className="mt-5">
            <p className={`mb-2 ${microLabel}`}>
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
          <span>Last response {formatRelativeDate(activeRow?.lastActivity)}</span>
        </div>

        {/* Say what the scope is, on screen and in the same place the numbers
           are. A panel that looks program-wide but isn't is the whole risk. */}
        {scope && (
          <p className="mt-3 text-sm text-ink-faint">
            {scope.trackName} only — {scope.enrolledCount} enrolled learner
            {scope.enrolledCount === 1 ? "" : "s"}, staff excluded. Exports from
            this panel carry the same scope.
            {activeSection?.unscopedPublic && (
              <>
                {" "}
                This form is answered anonymously, so its responses can&apos;t be
                narrowed to the roster.
              </>
            )}
          </p>
        )}

        {grantGaps.length > 0 && (
          <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-text">
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
          {!isAllForms && activeRow?.hasSchema && (
            <a
              href={`/api/insights/pdf?detailed=1&survey=${encodeURIComponent(activeId ?? "")}${cohortParam}`}
              className={buttonClass("primary", "sm")}
            >
              Detailed report ↓
            </a>
          )}
          <a
            href={`/api/insights/csv?survey=${encodeURIComponent(activeId ?? "")}${cohortParam}`}
            className={buttonClass("secondary", "sm")}
          >
            Export CSV
          </a>
          <a
            href={`/api/insights/pdf?survey=${encodeURIComponent(activeId ?? "")}${cohortParam}`}
            className={buttonClass("secondary", "sm")}
          >
            Export PDF
          </a>
          {!isAllForms && isAgreement ? (
            <Link
              href="/dashboard/admin/agreements"
              className="ml-auto text-sm font-medium text-primary hover:underline"
            >
              Who has signed &rarr;
            </Link>
          ) : (
            !isAllForms &&
            activeId &&
            activeRow?.hasSchema && (
              // The question-by-question detail existed only as a PDF download,
              // so the page dead-ended: you could see that 16 people answered
              // and never what they said without leaving the app.
              <Link
                href={
                  scope
                    ? `/dashboard/admin/surveys/${encodeURIComponent(activeId)}?returnTo=${encodeURIComponent(scope.returnTo)}&returnLabel=${encodeURIComponent(scope.trackName)}&trackSlug=${encodeURIComponent(scope.trackSlug)}`
                    : `/dashboard/admin/surveys/${encodeURIComponent(activeId)}?returnTo=${encodeURIComponent("/dashboard/admin?tab=insights")}&returnLabel=${encodeURIComponent("Insights")}`
                }
                className="ml-auto text-sm font-medium text-primary hover:underline"
              >
                See the responses &rarr;
              </Link>
            )
          )}
        </div>
      </div>

      {scopedShift.outcomes && <LearningShift outcomes={scopedShift.outcomes} />}

      {scopedShift.belowFloor && (
        <p className="text-sm text-ink-faint">
          There&apos;s a before-and-after pair here, but fewer than{" "}
          {scopedShift.minN} learners answered both sides — too few to report a
          shift from. It appears once {scopedShift.minN} have.
        </p>
      )}

      <p className="text-micro leading-relaxed text-ink-faint">
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
            <span className="text-micro font-semibold tabular-nums text-ink-faint">{b.count}</span>
            <div
              className="w-full rounded-t bg-primary"
              style={{ height: `${Math.max((b.count / max) * 44, 3)}px`, opacity: 0.45 + 0.55 * (b.count / max) }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 text-center text-micro tabular-nums text-ink-faint">{b.label}</div>
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
