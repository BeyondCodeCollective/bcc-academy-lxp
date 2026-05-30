"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

type SurveyConfig = { id: string; title: string };

type Props = {
  trackSlug: string;
  trackShortName: string;
  programSlug: string;
  surveyConfigs: SurveyConfig[];
  trackPublicSurveys?: { id: string; title: string; count: number }[];
};

export function TrackInsightsSection({
  trackSlug,
  trackShortName,
  surveyConfigs,
  trackPublicSurveys = [],
}: Props) {
  const all = [
    ...surveyConfigs.map((s) => ({ id: s.id, title: s.title })),
    ...trackPublicSurveys.map((s) => ({ id: s.id, title: s.title })),
  ];

  if (all.length === 0) {
    return (
      <p className="text-sm text-neutral-400 py-8 text-center">
        No surveys configured for this track.
      </p>
    );
  }

  const returnTo = encodeURIComponent(
    `/dashboard/admin?tab=${trackSlug}&view=surveys`
  );

  return (
    <div className="border border-rule bg-surface-elevated divide-y divide-neutral-100">
      {all.map((s) => (
        <Link
          key={s.id}
          href={`/dashboard/admin/surveys/${s.id}?returnTo=${returnTo}&returnLabel=${encodeURIComponent(trackShortName)}`}
          className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors group"
        >
          <p className="text-sm font-medium text-neutral-900">{s.title}</p>
          <ArrowRight size={14} className="text-neutral-300 group-hover:text-neutral-500 transition-colors shrink-0" />
        </Link>
      ))}
    </div>
  );
}
