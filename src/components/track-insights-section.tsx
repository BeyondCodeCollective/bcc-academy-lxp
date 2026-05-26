"use client";

import { useEffect, useMemo, useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { getAllReflections, getTrackSurveyResponses, exportPublicSurveyResponsesByType } from "@/app/dashboard/admin/actions";

type SurveyConfig = { id: string; title: string };

type Props = {
  trackSlug: string;
  trackShortName: string;
  programSlug: string;
  totalWeeks: number;
  enrolledStudentCount: number;
  surveyConfigs: SurveyConfig[];
  /**
   * Public surveys (no-login) tied to this track via the `publicSurveys` field
   * on TrackConfig. Counts are server-rendered; the Export CSV button pulls
   * the full responses on click. Empty array = no public surveys for this track.
   */
  trackPublicSurveys?: { id: string; title: string; count: number }[];
};

type ReflectionWeek = {
  week: number;
  count: number;
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
  totalWeeks,
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
  const [reflectionsByWeek, setReflectionsByWeek] = useState<ReflectionWeek[] | null>(null);
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
        const [reflections, ...responses] = await Promise.all([
          getAllReflections(programSlug, trackSlug),
          ...surveyConfigs.map((s) => getTrackSurveyResponses(s.id, trackSlug)),
        ]);
        if (cancelled) return;

        const byWeek = new Map<number, number>();
        for (const r of reflections) {
          byWeek.set(r.week_number, (byWeek.get(r.week_number) ?? 0) + 1);
        }
        const weekRows: ReflectionWeek[] = [];
        for (let w = 1; w <= totalWeeks; w++) {
          weekRows.push({ week: w, count: byWeek.get(w) ?? 0 });
        }
        setReflectionsByWeek(weekRows);

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
  }, [programSlug, trackSlug, totalWeeks, surveyKey]);

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-neutral-900">
          Surveys &amp; reflections
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Scoped to {enrolledStudentCount} student
          {enrolledStudentCount === 1 ? "" : "s"} enrolled in {trackShortName}.
        </p>
      </div>

      {/* Reflections per week */}
      <div className="border border-rule bg-surface-elevated p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400 mb-4">
          Reflections by week
        </p>
        {loading || reflectionsByWeek === null ? (
          <div className="h-20 animate-pulse bg-neutral-100" />
        ) : reflectionsByWeek.every((w) => w.count === 0) ? (
          <p className="text-sm text-neutral-500">
            No reflections submitted yet for this track.
          </p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {reflectionsByWeek.map((w) => {
              const pct = enrolledStudentCount > 0
                ? Math.round((w.count / enrolledStudentCount) * 100)
                : 0;
              return (
                <div
                  key={w.week}
                  className="flex flex-col items-center border border-neutral-100 bg-neutral-50 p-3 text-center"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                    Wk {w.week}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                    {w.count}
                  </p>
                  {enrolledStudentCount > 0 && (
                    <p className="text-[10px] text-neutral-400 tabular-nums">
                      {pct}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Survey response counts */}
      <div className="border border-rule bg-surface-elevated p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400 mb-4">
          Survey responses
        </p>
        {loading || surveyCounts === null ? (
          <div className="h-20 animate-pulse bg-neutral-100" />
        ) : surveyCounts.length === 0 ? (
          <p className="text-sm text-neutral-500">No surveys configured.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {surveyCounts.map((s) => (
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
        )}
      </div>

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
