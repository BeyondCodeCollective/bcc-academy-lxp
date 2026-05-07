"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface DemographicGroup {
  id: string;
  counts: { option: string; count: number }[];
}

interface SurveySummary {
  id: string;
  title: string;
  total: number;
  perProgram: { slug: string; name: string; count: number }[];
  hasSchema: boolean;
}

interface Props {
  surveys: SurveySummary[];
  totalResponses: number;
  demographics: DemographicGroup[];
}

const ACCENT = "#E54D2E";

const DEMOGRAPHIC_LABELS: Record<string, string> = {
  gender: "Gender",
  race_ethnicity: "Race / Ethnicity",
  languages: "Languages spoken at home",
  first_gen_college: "First-generation college",
  employment_status: "Employment status",
  household_income: "Household income",
  disability: "Disability",
  education_level: "Education level",
};

export function AllSurveysView({ surveys, totalResponses, demographics }: Props) {
  return (
    <div className="space-y-6">
      {/* Top stat */}
      <div className="rounded-xl bg-[#1a1a1a] text-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Total responses across all surveys
        </p>
        <p className="text-4xl font-bold mt-1">{totalResponses}</p>
        <p className="text-xs text-neutral-400 mt-1">
          {surveys.length} survey{surveys.length === 1 ? "" : "s"} with data
        </p>
      </div>

      {/* Surveys list */}
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
          Surveys
        </h2>
        <div className="space-y-2">
          {surveys.length === 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
              <p className="text-sm text-neutral-500">No survey responses yet.</p>
            </div>
          )}
          {surveys.map((s) => (
            <Link
              key={s.id}
              href={s.hasSchema ? `/dashboard/admin/surveys/${s.id}` : `/dashboard/admin/surveys`}
              className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">
                    {s.title}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {s.perProgram.map((p) => (
                      <span
                        key={p.slug}
                        className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600"
                      >
                        {p.name} · {p.count}
                      </span>
                    ))}
                    {!s.hasSchema && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 text-[11px]">
                        no dashboard schema
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-2xl font-bold text-neutral-900 tabular-nums">
                    {s.total}
                  </p>
                  <ArrowRight size={16} className="text-neutral-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Demographic rollup */}
      {demographics.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
            Combined demographics
          </h2>
          <p className="text-xs text-neutral-500 mb-3">
            Pooled across every response in every survey. Multi-select fields can sum to more than the response count.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {demographics.map((d) => {
              const total = d.counts.reduce((sum, c) => sum + c.count, 0);
              const max = Math.max(1, ...d.counts.map((c) => c.count));
              return (
                <div key={d.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    {DEMOGRAPHIC_LABELS[d.id] ?? d.id}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5 tabular-nums">
                    {total} total
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {d.counts.map((c) => {
                      const pct = total === 0 ? 0 : Math.round((c.count / total) * 100);
                      return (
                        <div key={c.option}>
                          <div className="flex justify-between gap-2 text-[11px] text-neutral-700">
                            <span className="truncate">{c.option}</span>
                            <span className="text-neutral-500 shrink-0 tabular-nums">
                              {c.count} · {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 mt-0.5 rounded-full bg-neutral-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(c.count / max) * 100}%`,
                                backgroundColor: ACCENT,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
