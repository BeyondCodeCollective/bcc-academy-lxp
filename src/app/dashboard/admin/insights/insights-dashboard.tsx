"use client";

import { useEffect, useMemo, useState } from "react";
import { SurveyDashboard } from "../surveys/[surveyId]/survey-dashboard";
import type { SurveyQuestion } from "@/components/survey-fields";
import type { BCCSurveyResponse } from "../actions";
import type { SurveyConfig } from "@/lib/programs/types";
import { StatCard } from "@/components/stats/stat-card";

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

export function InsightsDashboard({
  sections,
  programs,
  totalResponses,
}: Props) {

  const ledger = useMemo(() => buildLedger(sections, programs), [sections, programs]);
  const uniqueRespondents = useMemo(() => {
    const emails = new Set<string>();
    for (const s of sections) {
      for (const r of s.responses) {
        if (r.email) emails.add(r.email.toLowerCase());
      }
    }
    return emails.size;
  }, [sections]);

  const initialId =
    ledger.find((row) => row.hasSchema)?.id ?? ledger[0]?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(initialId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromHash = window.location.hash.slice(1);
    if (fromHash && ledger.some((row) => row.id === fromHash)) {
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

  const active = sections.find((s) => s.survey.id === activeId) ?? null;
  const allResponses = useMemo(
    () => sections.flatMap((s) => s.responses),
    [sections],
  );

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
      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={totalResponses.toLocaleString()} label="Responses" />
        <StatCard value={uniqueRespondents.toLocaleString()} label="Respondents" />
        <StatCard value={sections.length.toLocaleString()} label="Surveys" />
      </div>

      {/* Response timeline */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Responses — last 8 weeks
        </p>
        <div className="panel p-4">
          <Timeline responses={allResponses} />
        </div>
      </section>

      {/* Survey cards */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Surveys
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ledger.map((row) => (
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

              {/* Per-program breakdown. Single bar with a clear inline
                 legend underneath — previous design had two bars (one
                 "volume vs largest survey", one "split by program") and no
                 key, so neither was readable. The count to the right
                 already tells the volume story; the bar shows the split. */}
              {row.programBreakdown.length > 0 ? (
                <>
                  <div className="mb-1.5 flex h-2 w-full overflow-hidden rounded-full bg-paper-tint">
                    {row.programBreakdown.map((seg) => (
                      <div
                        key={seg.slug}
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
                    {row.programBreakdown.map((seg, i) => (
                      <span key={seg.slug}>
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

function Timeline({ responses }: { responses: BCCSurveyResponse[] }) {
  const weeks = useMemo(() => {
    const now = new Date();
    const result: { label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      const count = responses.filter((r) => {
        if (!r.completed_at) return false;
        const d = new Date(r.completed_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      const mon = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      result.push({ label: mon, count });
    }
    return result;
  }, [responses]);

  const maxCount = Math.max(...weeks.map((w) => w.count), 1);
  const total = weeks.reduce((sum, w) => sum + w.count, 0);
  const peak = weeks.reduce((best, w) => (w.count > best.count ? w : best), weeks[0]);

  if (total === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-faint">
        No responses in the last 8 weeks.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: 96 }}>
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            {/* The count is the data — without it the bars are unreadable. */}
            <span className="text-[10px] font-semibold tabular-nums text-ink">
              {w.count > 0 ? w.count : ""}
            </span>
            <div className="relative w-full flex-1">
              <div
                className="absolute inset-x-0 bottom-0 rounded-t transition-all"
                style={{
                  height: `${(w.count / maxCount) * 100}%`,
                  minHeight: w.count > 0 ? 4 : 0,
                  backgroundColor: "var(--primary)",
                }}
              />
            </div>
            <span className="text-[9px] tabular-nums text-ink-faint whitespace-nowrap">
              {w.label}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-ink-faint">
        <span className="tabular-nums text-ink-soft">{total}</span> response
        {total === 1 ? "" : "s"} in the last 8 weeks
        {peak.count > 0 && (
          <>
            {" · busiest week of "}
            <span className="tabular-nums text-ink-soft">{peak.count}</span> on {peak.label}
          </>
        )}
      </p>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface LedgerRow {
  id: string;
  title: string;
  count: number;
  lastActivity: string | null;
  hasSchema: boolean;
  programBreakdown: { slug: string; name: string; count: number; color: string }[];
}

function buildLedger(
  sections: Section[],
  programs: { slug: string; name: string }[],
): LedgerRow[] {
  return sections
    .map((s) => {
      const byProgram = new Map<string, number>();
      for (const r of s.responses) {
        byProgram.set(r.program_slug, (byProgram.get(r.program_slug) ?? 0) + 1);
      }
      const programBreakdown = Array.from(byProgram.entries())
        .map(([slug, count]) => {
          const name =
            programs.find((p) => p.slug === slug)?.name ?? slug;
          return { slug, name, count, color: colorFor(programs, slug) };
        })
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
        programBreakdown,
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
