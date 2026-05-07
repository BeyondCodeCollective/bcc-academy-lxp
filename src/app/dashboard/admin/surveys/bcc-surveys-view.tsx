"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Loader2, Trash2 } from "lucide-react";
import { getDashboardSurveyResponses, deletePublicSurveyResponse } from "../actions";
import type { BCCSurveyStat, BCCSurveyResponse } from "../actions";
import type { SurveyConfig } from "@/lib/programs/types";

interface Props {
  surveys: SurveyConfig[];
  stats: BCCSurveyStat[];
  allPrograms: { slug: string; name: string }[];
}

export function BCCSurveysView({ surveys, stats, allPrograms }: Props) {
  return (
    <div className="space-y-4">
      {surveys.map((survey) => {
        const surveyStats = stats.filter((s) => s.survey_type === survey.id);
        const total = surveyStats.reduce((sum, s) => sum + s.count, 0);
        return (
          <SurveyPanel
            key={survey.id}
            survey={survey}
            stats={surveyStats}
            total={total}
            allPrograms={allPrograms}
          />
        );
      })}
    </div>
  );
}

function SurveyPanel({
  survey,
  stats,
  total,
  allPrograms,
}: {
  survey: SurveyConfig;
  stats: BCCSurveyStat[];
  total: number;
  allPrograms: { slug: string; name: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [filterProgram, setFilterProgram] = useState("all");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [responses, setResponses] = useState<BCCSurveyResponse[]>([]);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadResponses() {
    if (loaded) return;
    setLoading(true);
    try {
      const data = await getDashboardSurveyResponses(survey.id);
      setResponses(data);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next) loadResponses();
  }

  async function handleDelete(email: string, programSlug: string) {
    setDeleting(email);
    try {
      await deletePublicSurveyResponse(email, survey.id, programSlug);
      setResponses((prev) => prev.filter((r) => r.email !== email));
    } finally {
      setDeleting(null);
    }
  }

  async function downloadCsv() {
    if (!loaded) await loadResponses();
    const data = loaded ? responses : await getDashboardSurveyResponses(survey.id);
    const visible = filterProgram === "all"
      ? data
      : data.filter((r) => r.program_slug === filterProgram);
    if (visible.length === 0) return;

    const allKeys = new Set<string>();
    visible.forEach((r) => Object.keys(r.responses).forEach((k) => allKeys.add(k)));
    const headers = ["Name", "Email", "Program", "Source", "Completed At", ...Array.from(allKeys)];
    const rows = visible.map((r) => [
      r.full_name,
      r.email,
      r.program_name,
      r.source,
      r.completed_at ?? "",
      ...Array.from(allKeys).map((k) => formatCsvValue(r.responses[k])),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `bcc-${survey.id}-${filterProgram}.csv`;
    a.click();
  }

  const programsWithData = allPrograms.filter((p) =>
    stats.some((s) => s.program_slug === p.slug),
  );

  const visibleResponses = filterProgram === "all"
    ? responses
    : responses.filter((r) => r.program_slug === filterProgram);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-900">{survey.title}</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {total} response{total !== 1 ? "s" : ""}
              {stats.length > 0 && (
                <span className="ml-1.5">
                  ·{" "}
                  {stats.map((s) => (
                    <span key={`${s.source}-${s.program_slug}`} className="mr-1.5">
                      {s.count} {s.program_name} ({s.source})
                    </span>
                  ))}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/dashboard/admin/surveys/${survey.id}`}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              View dashboard
            </Link>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={total === 0 || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <Loader2 size={12} className="animate-spin" />
                : <Download size={12} />}
              CSV
            </button>
            <button
              type="button"
              onClick={handleExpand}
              disabled={total === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <Loader2 size={12} className="animate-spin" />
                : <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />}
              {expanded ? "Hide" : "Responses"}
            </button>
          </div>
        </div>

        {/* Per-program breakdown pills */}
        {stats.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {stats.map((s) => (
              <span
                key={`${s.source}-${s.program_slug}`}
                className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600"
              >
                {s.program_name} · {s.count} {s.source === "authenticated" ? "enrolled" : "public"}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded respondent list */}
      {expanded && (
        <div className="border-t border-neutral-100">
          {/* Filter bar */}
          {programsWithData.length > 1 && (
            <div className="flex items-center gap-2 px-5 py-3 border-b border-neutral-100 bg-neutral-50">
              <span className="text-xs text-neutral-500">Filter:</span>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilterProgram("all")}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    filterProgram === "all"
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                  }`}
                >
                  All ({total})
                </button>
                {programsWithData.map((p) => {
                  const count = stats
                    .filter((s) => s.program_slug === p.slug)
                    .reduce((sum, s) => sum + s.count, 0);
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => setFilterProgram(p.slug)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        filterProgram === p.slug
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                      }`}
                    >
                      {p.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="divide-y divide-neutral-100">
            {visibleResponses.length === 0 && !loading && (
              <p className="px-5 py-4 text-xs text-neutral-400">No responses.</p>
            )}
            {visibleResponses.map((r) => (
              <div key={`${r.email}-${r.source}`}>
                <div className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-neutral-50">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedEmail(
                        expandedEmail === r.email ? null : r.email,
                      )
                    }
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-xs font-medium text-neutral-800 truncate">
                      {r.full_name}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {r.email}
                      <span className="mx-1.5">·</span>
                      {r.program_name}
                      <span className="mx-1.5">·</span>
                      <span className={r.source === "authenticated" ? "text-neutral-500" : "text-neutral-400"}>
                        {r.source === "authenticated" ? "enrolled" : "public"}
                      </span>
                      {r.completed_at && (
                        <>
                          <span className="mx-1.5">·</span>
                          {new Date(r.completed_at).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEmail(
                          expandedEmail === r.email ? null : r.email,
                        )
                      }
                      className="rounded p-1 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                    >
                      <ChevronDown
                        size={13}
                        className={`transition-transform ${expandedEmail === r.email ? "rotate-180" : ""}`}
                      />
                    </button>
                    {r.source === "public" && (
                      <button
                        type="button"
                        onClick={() => handleDelete(r.email, r.program_slug)}
                        disabled={deleting === r.email}
                        className="rounded p-1 text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete response"
                      >
                        {deleting === r.email
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                {expandedEmail === r.email && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-3 space-y-2">
                    {Object.entries(r.responses)
                      .filter(([, val]) => val !== null && val !== undefined && val !== "")
                      .map(([key, val]) => (
                        <div key={key}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                            {key.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-neutral-700 mt-0.5">
                            {formatValue(val)}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(val: unknown): string {
  if (Array.isArray(val)) return val.join(", ");
  if (val === true) return "Yes";
  if (val === false) return "No";
  if (typeof val === "object" && val !== null) {
    return Object.entries(val as Record<string, unknown>)
      .map(([stmt, rating]) => {
        if (typeof rating === "object" && rating !== null) {
          const r = rating as Record<string, string>;
          return `${stmt}: before ${r.before ?? "—"} → now ${r.now ?? "—"}`;
        }
        return `${stmt}: ${String(rating)}`;
      })
      .join(" · ");
  }
  return String(val);
}

function formatCsvValue(val: unknown): string {
  if (Array.isArray(val)) return val.join("; ");
  if (val === true) return "Yes";
  if (val === false) return "No";
  if (typeof val === "object" && val !== null) {
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => {
        if (typeof v === "object" && v !== null) {
          const r = v as Record<string, string>;
          return `${k}: before ${r.before ?? ""} now ${r.now ?? ""}`;
        }
        return `${k}: ${String(v)}`;
      })
      .join("; ");
  }
  return String(val ?? "");
}
