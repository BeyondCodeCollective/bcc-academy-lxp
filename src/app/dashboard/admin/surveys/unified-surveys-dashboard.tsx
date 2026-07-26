"use client";

import { useEffect, useMemo, useState } from "react";
import { SurveyDashboard } from "./[surveyId]/survey-dashboard";
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
}

export function UnifiedSurveysDashboard({
  sections,
  programs,
  totalResponses,
}: Props) {
  const ledger = useMemo(() => buildLedger(sections), [sections]);

  // Default to the most recently active survey with a usable schema.
  const initialId = ledger.find((row) => row.hasSchema)?.id ?? ledger[0]?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(initialId);

  // Sync the URL hash so deep-linking (and the back button) keeps working.
  // The initial-mount setState is the documented "sync with external system"
  // pattern — the URL is the external system here, and it can't be read at
  // render time without breaking SSR hydration. Suppressing the rule.
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
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  }

  const active = sections.find((s) => s.survey.id === activeId) ?? null;
  const lede = composeLede(ledger, totalResponses);

  if (sections.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No survey responses yet. Once a cohort starts answering, this page will
        come alive.
      </p>
    );
  }

  return (
    <div className="space-y-12">
      {/* LEDE — editorial paragraph instead of a hero stat block. */}
      <p className="text-[17px] leading-[1.65] text-ink max-w-2xl tracking-[-0.005em]">
        {lede}
      </p>

      {/* Ledger — a table of every survey, click to focus. */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint mb-3">
          Surveys
        </p>
        <ul className="border-y border-rule">
          {ledger.map((row, i) => (
            <li
              key={row.id}
              className={i > 0 ? "border-t border-rule-soft" : ""}
            >
              <button
                type="button"
                onClick={() => selectSurvey(row.id)}
                disabled={!row.hasSchema}
                className={`group w-full grid grid-cols-[auto_1fr_auto_auto] items-baseline gap-x-6 gap-y-1 px-1 py-3 text-left transition-colors ${
                  activeId === row.id && row.hasSchema
                    ? "bg-paper-tint"
                    : row.hasSchema
                      ? "hover:bg-paper-tint"
                      : "opacity-60 cursor-not-allowed"
                }`}
              >
                <span
                  className={`text-[10px] font-mono tabular-nums tracking-tight px-2 ${
                    activeId === row.id && row.hasSchema
                      ? "text-ink"
                      : "text-ink-faint"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink truncate">
                    {row.title}
                  </p>
                  {row.programs && (
                    <p className="text-[11px] text-ink-soft mt-0.5 truncate">
                      {row.programs}
                    </p>
                  )}
                </div>
                <p className="text-2xl font-semibold text-ink tabular-nums leading-none">
                  {row.count}
                </p>
                <p className="text-[11px] text-ink-faint tabular-nums whitespace-nowrap min-w-[5rem] text-right">
                  {row.lastActivity ? lastActivityText(row.lastActivity) : "—"}
                </p>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-ink-faint mt-3">
          {ledger.filter((r) => !r.hasSchema).length > 0 && (
            <>
              Greyed-out rows have responses but no dashboard schema yet — add
              one in <code className="text-[10px] bg-paper-tint px-1 py-0.5 rounded">src/lib/surveys/schemas.ts</code> to visualize.
            </>
          )}
        </p>
      </div>

      {/* Detail — the active survey's full charts. */}
      {active && active.schema && (
        <div className="pt-2">
          <SurveyDashboard
            surveyId={active.survey.id}
            surveyTitle={active.survey.title}
            schema={active.schema}
            responses={active.responses}
            programs={programs}
            chrome="embedded"
          />
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface LedgerRow {
  id: string;
  title: string;
  programs: string;
  count: number;
  lastActivity: string | null;
  hasSchema: boolean;
}

function buildLedger(sections: Section[]): LedgerRow[] {
  return sections
    .map((s) => {
      const programNames = Array.from(
        new Set(s.responses.map((r) => r.program_name).filter(Boolean)),
      );
      const last = s.responses.reduce<string | null>((max, r) => {
        if (!r.completed_at) return max;
        if (!max) return r.completed_at;
        return r.completed_at > max ? r.completed_at : max;
      }, null);
      return {
        id: s.survey.id,
        title: s.survey.title,
        programs: programNames.join(" · "),
        count: s.responses.length,
        lastActivity: last,
        hasSchema: !!s.schema,
      };
    })
    .sort((a, b) => {
      // Most recently active first; surveys without activity at the bottom.
      if (!a.lastActivity && !b.lastActivity) return b.count - a.count;
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return b.lastActivity.localeCompare(a.lastActivity);
    });
}

function composeLede(ledger: LedgerRow[], total: number): string {
  const active = ledger.filter((r) => r.count > 0);
  if (active.length === 0) {
    return "No responses yet. Send a survey link to a cohort to get started.";
  }
  const top = active[0];
  const surveyWord = active.length === 1 ? "survey" : "surveys";

  const parts: string[] = [];
  parts.push(
    `${total} response${total === 1 ? "" : "s"} across ${active.length} ${surveyWord}.`,
  );
  if (top.lastActivity) {
    parts.push(
      `${top.title} is the most recent — ${top.count} response${top.count === 1 ? "" : "s"}, last completed ${lastActivityText(top.lastActivity)}.`,
    );
  } else {
    parts.push(
      `${top.title} leads with ${top.count} response${top.count === 1 ? "" : "s"}.`,
    );
  }
  if (active.length > 1) {
    parts.push("Pick a row below to read across cohorts.");
  }
  return parts.join(" ");
}

function lastActivityText(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / day);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
