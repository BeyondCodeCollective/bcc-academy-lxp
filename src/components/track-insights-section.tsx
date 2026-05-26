"use client";

import { useEffect, useMemo, useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { getTrackSurveyResponses, exportPublicSurveyResponsesByType } from "@/app/dashboard/admin/actions";

type SurveyConfig = { id: string; title: string };

type Props = {
  trackSlug: string;
  trackShortName: string;
  programSlug: string;
  enrolledStudentCount: number;
  surveyConfigs: SurveyConfig[];
  /**
   * Public surveys (no-login) tied to this track via the `publicSurveys` field
   * on TrackConfig. Counts are server-rendered; the Export CSV button pulls
   * the full responses on click. Empty array = no public surveys for this track.
   */
  trackPublicSurveys?: { id: string; title: string; count: number }[];
};

type SurveyCount = {
  id: string;
  title: string;
  responseCount: number;
  uniqueRespondents: number;
};

export function TrackInsightsSection({
  trackSlug,
  trackShortName,
  programSlug,
  enrolledStudentCount,
  surveyConfigs,
  trackPublicSurveys = [],
}: Props) {
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExportPublic(surveyId: string, title: string) {
    setExporting(surveyId);
    try {
      const rows = await exportPublicSurveyResponsesByType(surveyId);
      if (rows.length === 0) return;
      const allKeys = new Set<string>();
      for (const r of rows) Object.keys(r.responses).forEach((k) => allKeys.add(k));
      const headers = ["Name", "Email", "Completed At", ...Array.from(allKeys)];
      const csv = [
        headers,
        ...rows.map((r) => [
          r.full_name,
          r.email,
          r.completed_at ?? "",
          ...Array.from(allKeys).map((k) => {
            const v = r.responses[k];
            if (Array.isArray(v)) return v.join("; ");
            if (typeof v === "object" && v !== null) return JSON.stringify(v);
            return v == null ? "" : String(v);
          }),
        ]),
      ];
      const blob = new Blob(
        [csv.map((row) => row.map(escapeCsv).join(",")).join("\n")],
        { type: "text/csv;charset=utf-8" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${surveyId}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }
  const [surveyCounts, setSurveyCounts] = useState<SurveyCount[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Stable scalar key for the surveys list. If we depended on surveyConfigs
  // directly, every parent render with a fresh array prop ref would re-fire
  // the effect and refetch — a real-world loop trigger.
  const surveyKey = useMemo(
    () => surveyConfigs.map((s) => s.id).join(","),
    [surveyConfigs],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const responses = await Promise.all(
          surveyConfigs.map((s) => getTrackSurveyResponses(s.id, trackSlug)),
        );
        if (cancelled) return;
        setSurveyCounts(
          surveyConfigs.map((s, i) => {
            const rows = responses[i] ?? [];
            const emails = new Set<string>();
            for (const row of rows) {
              if (row.email) emails.add(row.email.toLowerCase());
            }
            return {
              id: s.id,
              title: s.title,
              responseCount: rows.length,
              uniqueRespondents: emails.size,
            };
          }),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // surveyKey (not surveyConfigs) keeps this stable across renders that
    // re-pass a structurally-identical array with a new reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programSlug, trackSlug, surveyKey]);

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-neutral-900">
          Surveys
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Scoped to {enrolledStudentCount} student
          {enrolledStudentCount === 1 ? "" : "s"} enrolled in {trackShortName}.
        </p>
      </div>

      {/* Auth-survey response counts. Hide surveys with zero responses
         from this track — they're program-wide surveys (e.g. Catalyst's
         Post-Survey) and a "0 / 0 unique" row looks duplicative with the
         Public surveys section right below, which often has real
         responses for the same conceptual survey.

         We deliberately render NOTHING while loading instead of a
         skeleton — the section often collapses to empty after the fetch,
         and showing an 80px placeholder that vanishes a moment later
         caused a visible layout shift on the per-track Insights view.
         The Reflections card above is always rendered, so it absorbs
         any perceived "loading" feedback. */}
      {(() => {
        if (loading || surveyCounts === null) return null;
        const withResponses = surveyCounts.filter((s) => s.responseCount > 0);
        if (withResponses.length === 0) return null;
        return (
          <div className="border border-rule bg-surface-elevated p-5">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                Survey responses
              </p>
              <p className="text-[11px] text-neutral-400">
                Program-wide surveys scoped to enrolled {trackShortName} students
              </p>
            </div>
            <ul className="divide-y divide-neutral-100">
              {withResponses.map((s) => (
                <li key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {s.title}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-3 text-right shrink-0">
                    <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                      {s.responseCount}
                    </span>
                    <span className="text-[11px] text-neutral-400 tabular-nums">
                      {s.uniqueRespondents} unique
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Public surveys tied to this track (network-plus-post, etc).
         Public-survey responses don't carry a student_id so the counts above
         miss them entirely — this card shows the totals and gives admins a
         direct CSV export. */}
      {trackPublicSurveys.length > 0 && (
        <div className="border border-rule bg-surface-elevated p-5">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
              Public surveys for {trackShortName}
            </p>
            <p className="text-[11px] text-neutral-400">
              Anyone with the link can submit — not scoped to enrolled students.
            </p>
          </div>
          <ul className="divide-y divide-neutral-100">
            {trackPublicSurveys.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {s.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 font-mono truncate">
                    /survey/{s.id}
                  </p>
                </div>
                <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                  {s.count}
                </span>
                <button
                  type="button"
                  onClick={() => handleExportPublic(s.id, s.title)}
                  disabled={s.count === 0 || exporting === s.id}
                  className="inline-flex items-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <DownloadSimple size={13} weight="bold" />
                  {exporting === s.id ? "Exporting…" : "Export CSV"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function escapeCsv(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
