"use client";

import { useEffect, useMemo, useState } from "react";
import { SurveyDashboard } from "../surveys/[surveyId]/survey-dashboard";
import type { SurveyQuestion } from "@/components/survey-fields";
import type { BCCSurveyResponse } from "../actions";
import type { SurveyConfig } from "@/lib/programs/types";

interface Section {
  survey: SurveyConfig;
  schema: SurveyQuestion[] | null;
  responses: BCCSurveyResponse[];
}

interface Props {
  sections: Section[];
  programs: { slug: string; name: string }[];
  totalResponses: number;
  currentProgramSlug: string;
  currentProgramName: string;
  canViewAll: boolean;
}

const PALETTE = [
  "#E54D2E",
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
];

function colorFor(
  programs: { slug: string; name: string }[],
  slug: string,
): string {
  const idx = programs.findIndex((p) => p.slug === slug);
  return idx >= 0 ? PALETTE[idx % PALETTE.length] : "#6B7280";
}

export function InsightsDashboard({
  sections: allSections,
  programs,
  totalResponses: allTotalResponses,
  currentProgramSlug,
  currentProgramName,
  canViewAll,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  // Filter sections to the current program unless "All programs" is toggled.
  const sections = useMemo(() => {
    if (showAll) return allSections;
    return allSections
      .map((s) => ({
        ...s,
        responses: s.responses.filter(
          (r) => r.program_slug === currentProgramSlug,
        ),
      }))
      .filter((s) => s.responses.length > 0);
  }, [allSections, showAll, currentProgramSlug]);

  const totalResponses = showAll
    ? allTotalResponses
    : sections.reduce((sum, s) => sum + s.responses.length, 0);

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
  const maxCount = Math.max(...ledger.map((r) => r.count), 1);

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">
          No survey responses yet. Once a cohort starts answering, this page
          will come alive.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Scope toggle (super-admin only) */}
      {canViewAll && (
        <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 self-start w-fit">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              !showAll
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {currentProgramName}
          </button>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              showAll
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            All programs
          </button>
        </div>
      )}

      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={totalResponses} label="Responses" />
        <StatCard value={uniqueRespondents} label="Respondents" />
        <StatCard value={sections.length} label="Active surveys" />
      </div>

      {/* Response timeline */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
          Responses — last 8 weeks
        </p>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <Timeline responses={allResponses} />
        </div>
      </section>

      {/* Survey cards */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
          Surveys
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ledger.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => row.hasSchema && selectSurvey(row.id)}
              disabled={!row.hasSchema}
              className={`group rounded-xl border bg-white p-4 text-left transition-all ${
                activeId === row.id
                  ? "border-neutral-900 ring-1 ring-neutral-900"
                  : row.hasSchema
                    ? "border-neutral-200 hover:border-neutral-300 hover:shadow-sm"
                    : "cursor-not-allowed border-neutral-100 opacity-60"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {row.title}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {row.lastActivity
                      ? `Last response ${timeAgo(row.lastActivity)}`
                      : "No responses yet"}
                  </p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-neutral-900">
                  {row.count}
                </p>
              </div>

              {/* Volume bar — relative to the largest survey */}
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-neutral-900 transition-all"
                  style={{ width: `${(row.count / maxCount) * 100}%` }}
                />
              </div>

              {/* Program breakdown */}
              {row.programBreakdown.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
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
                  <span className="shrink-0 text-[10px] text-neutral-400">
                    {row.programBreakdown.length} program
                    {row.programBreakdown.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Program legend */}
      {programs.length > 1 && (
        <div className="flex flex-wrap gap-3">
          {programs.map((p) => (
            <span key={p.slug} className="flex items-center gap-1.5 text-xs text-neutral-500">
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

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-3xl font-bold tabular-nums text-neutral-900">
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-xs text-neutral-400">{label}</p>
    </div>
  );
}

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

  return (
    <div className="flex items-end gap-2" style={{ height: 96 }}>
      {weeks.map((w, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="relative w-full flex-1">
            <div
              className="absolute inset-x-0 bottom-0 rounded-t bg-neutral-900 transition-all"
              style={{
                height: `${(w.count / maxCount) * 100}%`,
                minHeight: w.count > 0 ? 4 : 0,
              }}
            />
          </div>
          <span className="text-[9px] tabular-nums text-neutral-400 whitespace-nowrap">
            {w.label}
          </span>
        </div>
      ))}
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
