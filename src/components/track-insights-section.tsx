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
  // If this track has its own public surveys, skip the program-level auth
  // surveys — they're usually duplicates (e.g. Catalyst Post Survey showing
  // alongside the Network+ End-of-Cohort survey for the same cohort).
  const authSurveys = trackPublicSurveys.length > 0 ? [] : surveyConfigs;

  const all: { id: string; title: string; isPublic: boolean }[] = [
    ...authSurveys.map((s) => ({ id: s.id, title: s.title, isPublic: false })),
    ...trackPublicSurveys.map((s) => ({ id: s.id, title: s.title, isPublic: true })),
  ];

  if (all.length === 0) {
    return (
      <p className="text-sm text-ink-faint py-8 text-center">
        No surveys configured for this track.
      </p>
    );
  }

  const returnTo = encodeURIComponent(`/dashboard/admin?tab=${trackSlug}&view=surveys`);
  const returnLabel = encodeURIComponent(trackShortName);

  return (
    <div className="panel divide-y divide-neutral-100">
      {all.map((s) => {
        // Public surveys have no student_id — don't scope them to the track
        // or getTrackSurveyResponses will return 0. Auth surveys are scoped.
        const href = s.isPublic
          ? `/dashboard/admin/surveys/${s.id}?returnTo=${returnTo}&returnLabel=${returnLabel}`
          : `/dashboard/admin/surveys/${s.id}?returnTo=${returnTo}&returnLabel=${returnLabel}&trackSlug=${encodeURIComponent(trackSlug)}`;
        return (
          <Link
            key={s.id}
            href={href}
            className="flex items-center justify-between px-4 py-3 hover:bg-paper-tint-soft transition-colors group"
          >
            <p className="text-sm font-medium text-ink">{s.title}</p>
            <ArrowRight size={14} className="text-ink-faint group-hover:text-ink-soft transition-colors shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}
