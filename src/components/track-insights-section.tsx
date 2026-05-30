"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DownloadSimple } from "@phosphor-icons/react";
import {
  getTrackSurveyResponses,
  exportPublicSurveyResponsesByType,
  type BCCSurveyResponse,
} from "@/app/dashboard/admin/actions";

type SurveyConfig = { id: string; title: string };

type Props = {
  trackSlug: string;
  trackShortName: string;
  programSlug: string;
  surveyConfigs: SurveyConfig[];
  trackPublicSurveys?: { id: string; title: string; count: number }[];
};

type SurveyWithResponses = {
  id: string;
  title: string;
  responses: BCCSurveyResponse[];
};

export function TrackInsightsSection({
  trackSlug,
  trackShortName,
  programSlug,
  surveyConfigs,
  trackPublicSurveys = [],
}: Props) {
  const [surveys, setSurveys] = useState<SurveyWithResponses[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);
  const [expandedRespondent, setExpandedRespondent] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const surveyKey = useMemo(
    () => surveyConfigs.map((s) => s.id).join(","),
    [surveyConfigs],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const results = await Promise.all(
          surveyConfigs.map((s) => getTrackSurveyResponses(s.id, trackSlug)),
        );
        if (cancelled) return;
        setSurveys(
          surveyConfigs
            .map((s, i) => ({ id: s.id, title: s.title, responses: results[i] ?? [] }))
            .filter((s) => s.responses.length > 0),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programSlug, trackSlug, surveyKey]);

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
          r.full_name, r.email, r.completed_at ?? "",
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

  if (loading) return null;

  const hasAnything = surveys.length > 0 || trackPublicSurveys.length > 0;
  if (!hasAnything) {
    return (
      <p className="text-sm text-neutral-400 py-8 text-center">
        No survey responses yet for this track.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Auth surveys — expandable rows */}
      {surveys.map((survey) => {
        const isOpen = expandedSurvey === survey.id;
        return (
          <div key={survey.id} className="border border-rule bg-surface-elevated overflow-hidden">
            <button
              onClick={() => {
                setExpandedSurvey(isOpen ? null : survey.id);
                setExpandedRespondent(null);
              }}
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors"
            >
              <p className="text-sm font-medium text-neutral-900">{survey.title}</p>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-neutral-400 tabular-nums">
                  {survey.responses.length} {survey.responses.length === 1 ? "response" : "responses"}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-neutral-100 divide-y divide-neutral-100">
                {survey.responses.map((r, i) => {
                  const key = `${survey.id}-${i}`;
                  const isExpanded = expandedRespondent === key;
                  return (
                    <div key={key}>
                      <button
                        onClick={() => setExpandedRespondent(isExpanded ? null : key)}
                        className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-neutral-50 transition-colors"
                      >
                        <div className="text-left">
                          <p className="text-sm text-neutral-900">{r.full_name}</p>
                          <p className="text-[11px] text-neutral-400">{r.email}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {r.completed_at && (
                            <span className="text-[11px] text-neutral-400">
                              {new Date(r.completed_at).toLocaleDateString()}
                            </span>
                          )}
                          <ChevronDown
                            size={13}
                            className={`text-neutral-300 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100 space-y-3">
                          {Object.entries(r.responses).map(([prompt, answer]) => (
                            <div key={prompt}>
                              <p className="text-[11px] font-medium text-neutral-400 mb-0.5">{prompt}</p>
                              <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                                {Array.isArray(answer)
                                  ? answer.join(", ")
                                  : typeof answer === "object" && answer !== null
                                    ? JSON.stringify(answer)
                                    : String(answer ?? "")}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Public surveys — count + export only (no student_id to link responses to) */}
      {trackPublicSurveys.map((s) => (
        <div key={s.id} className="border border-rule bg-surface-elevated flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900">{s.title}</p>
            <p className="text-[11px] text-neutral-400 font-mono">/survey/{s.id}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs text-neutral-400 tabular-nums">
              {s.count} {s.count === 1 ? "response" : "responses"}
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
          </div>
        </div>
      ))}
    </div>
  );
}

function escapeCsv(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
