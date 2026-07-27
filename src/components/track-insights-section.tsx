"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";

type SurveyConfig = { id: string; title: string };

type Props = {
  trackSlug: string;
  trackShortName: string;
  programSlug: string;
  surveyConfigs: SurveyConfig[];
  trackPublicSurveys?: { id: string; title: string; count: number }[];
  /** Enrolled learners in this course — the response-rate denominator. */
  enrolledCount?: number;
  /** survey id → distinct learners from this course who answered it. */
  respondentsBySurvey?: Record<string, number>;
};

// This is a follow-up list, so the colour marks what needs chasing. Under half
// the class is where a survey stops being a data source.
function rateTone(pct: number): string {
  if (pct >= 75) return "text-success-text";
  if (pct >= 50) return "text-ink-soft";
  return "text-warning-text";
}

export function TrackInsightsSection({
  trackSlug,
  trackShortName,
  surveyConfigs,
  trackPublicSurveys = [],
  enrolledCount = 0,
  respondentsBySurvey = {},
}: Props) {
  // If this track has its own public surveys, skip the program-level auth
  // surveys — they're usually duplicates (e.g. Catalyst Post Survey showing
  // alongside the Network+ End-of-Cohort survey for the same cohort).
  const authSurveys = trackPublicSurveys.length > 0 ? [] : surveyConfigs;

  const all: { id: string; title: string; isPublic: boolean; count?: number }[] = [
    ...authSurveys.map((s) => ({ id: s.id, title: s.title, isPublic: false })),
    ...trackPublicSurveys.map((s) => ({
      id: s.id,
      title: s.title,
      isPublic: true,
      count: s.count,
    })),
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
    <div className="space-y-2">
      <div className="panel divide-y divide-neutral-100">
        {all.map((s) => {
          // Public surveys have no student_id — don't scope them to the track
          // or getTrackSurveyResponses will return 0. Auth surveys are scoped.
          const href = s.isPublic
            ? `/dashboard/admin/surveys/${s.id}?returnTo=${returnTo}&returnLabel=${returnLabel}`
            : `/dashboard/admin/surveys/${s.id}?returnTo=${returnTo}&returnLabel=${returnLabel}&trackSlug=${encodeURIComponent(trackSlug)}`;

          // The rate is what this list was missing. A title alone can't tell you
          // a cohort answered the pre-survey and never came back for the post —
          // AI Fundamentals sat at 15-of-16 vs 1-of-16 for weeks and nothing on
          // any screen said so.
          const respondents = s.isPublic ? (s.count ?? 0) : (respondentsBySurvey[s.id] ?? 0);
          const pct =
            !s.isPublic && enrolledCount > 0
              ? Math.round((respondents / enrolledCount) * 100)
              : null;

          return (
            <Link
              key={s.id}
              href={href}
              className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-paper-tint-soft"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{s.title}</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {s.isPublic ? (
                    // Anonymous responses carry no enrollment, so a rate here
                    // would need a made-up denominator. Say what it is instead.
                    <>
                      {respondents} {respondents === 1 ? "response" : "responses"} · not
                      scoped to this course
                    </>
                  ) : respondents === 0 ? (
                    // "Nobody answered" and "no survey assigned" are different
                    // problems — one is follow-up, one is config. They used to
                    // render identically: as a bare title.
                    "Assigned — nobody has answered yet"
                  ) : (
                    <>
                      {respondents} of {enrolledCount} answered
                      {pct !== null && (
                        <span className={`ml-1.5 font-semibold ${rateTone(pct)}`}>
                          {pct}%
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <ArrowRight
                size={14}
                className="shrink-0 text-ink-faint transition-colors group-hover:text-ink-soft"
              />
            </Link>
          );
        })}
      </div>
      <p className="px-1 text-micro leading-relaxed text-ink-faint">
        Response rate counts enrolled learners only — staff on the course roster
        aren&apos;t in the denominator.
      </p>
    </div>
  );
}
