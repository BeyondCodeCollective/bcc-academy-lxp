"use client";

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
  const withSchema = sections.filter((s) => s.schema);
  const withoutSchema = sections.filter((s) => !s.schema);

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">No survey responses yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top stat strip */}
      <div className="rounded-xl bg-[#1a1a1a] text-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Total responses across all surveys
        </p>
        <p className="text-4xl font-bold mt-1 tabular-nums">{totalResponses}</p>
        <p className="text-xs text-neutral-400 mt-1">
          {withSchema.length} survey{withSchema.length === 1 ? "" : "s"} with data
        </p>
      </div>

      {/* Sticky table of contents */}
      {withSchema.length > 1 && (
        <nav className="sticky top-0 z-10 -mx-5 px-5 py-2.5 bg-white/95 backdrop-blur border-b border-neutral-200">
          <div className="flex flex-wrap gap-1">
            {withSchema.map((s) => (
              <a
                key={s.survey.id}
                href={`#${s.survey.id}`}
                className="text-[11px] font-medium text-neutral-600 hover:text-neutral-900 px-2 py-1 rounded-md hover:bg-neutral-100 transition-colors"
              >
                {s.survey.title}{" "}
                <span className="text-neutral-400 tabular-nums">
                  ({s.responses.length})
                </span>
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* Per-survey sections */}
      {withSchema.map((s, i) => (
        <section
          key={s.survey.id}
          id={s.survey.id}
          className={`scroll-mt-20 ${i > 0 ? "pt-8 border-t border-neutral-200" : ""}`}
        >
          <SurveyDashboard
            surveyId={s.survey.id}
            surveyTitle={s.survey.title}
            schema={s.schema as SurveyQuestion[]}
            responses={s.responses}
            programs={programs}
          />
        </section>
      ))}

      {/* Surveys with responses but no dashboard schema (defensive) */}
      {withoutSchema.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Surveys without dashboard schema
          </p>
          <p className="text-xs text-amber-800 mt-1">
            These surveys have responses but no entry in
            {" "}<code className="text-[10px]">src/lib/surveys/schemas.ts</code>.
            Add one to visualize them.
          </p>
          <ul className="mt-2 text-xs text-amber-900 space-y-0.5">
            {withoutSchema.map((s) => (
              <li key={s.survey.id}>
                <span className="font-medium">{s.survey.title}</span>
                <span className="text-amber-700">
                  {" "}· {s.responses.length} response{s.responses.length === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
