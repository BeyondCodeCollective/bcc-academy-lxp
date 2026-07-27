import "server-only";

import { getEveryProgramConfig } from "@/lib/programs";
import { createServiceClient } from "@/lib/supabase/server";
import type { SurveyConfig } from "@/lib/programs/types";
import type { SurveyQuestion } from "@/components/survey-fields";
import { getSurveySchema } from "@/lib/surveys/schemas";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import {
  getDashboardSurveyStats,
  getDashboardAllSurveyResponses,
  type BCCSurveyResponse,
} from "@/app/dashboard/admin/actions-surveys";

export type InsightsSection = {
  survey: SurveyConfig;
  schema: SurveyQuestion[] | null;
  responses: BCCSurveyResponse[];
  /** Course scope only: this survey's responses are anonymous, so they can't be
   *  narrowed to the course roster. Kept (the course declares the survey) and
   *  labelled rather than dropped. */
  unscopedPublic?: boolean;
};

export type InsightsData = {
  sections: InsightsSection[];
  programs: { slug: string; name: string }[];
  totalResponses: number;
  /** Set when the data is narrowed to one course. */
  trackSlug?: string;
  /** Enrolled learners in that course — the response-rate denominator. */
  enrolledCount?: number;
};

/**
 * Assemble the Survey Insights data set for a resolved program scope. Shared by
 * the admin page (the on-screen dashboard) and the PDF export route so both read
 * the exact same surveys, responses, and program legend. Scoped to the passed
 * program ids — the caller resolves scope (current program / Catalyst aggregate).
 *
 * Pass `trackSlug` to narrow everything to one course's enrolled learners. The
 * scoping lives HERE, not in the caller, so the screen and the CSV/PDF exports
 * can't drift — a course-scoped panel handing out program-wide rows is the one
 * failure mode that would go unnoticed.
 */
export async function buildInsightsData(
  programIds: string[],
  aggregatedSlugs: string[],
  trackSlug?: string,
): Promise<InsightsData> {
  if (programIds.length === 0) {
    return { sections: [], programs: [], totalResponses: 0 };
  }

  // Lead-capture forms (e.g. the homepage "Learn More" signup) aren't surveys —
  // keep them out of Survey Insights so the numbers reflect real responses.
  const EXCLUDED_FROM_INSIGHTS = new Set(["learn-more"]);
  const stats = (await getDashboardSurveyStats(programIds)).filter(
    (r) => !EXCLUDED_FROM_INSIGHTS.has(r.survey_type),
  );

  const programSurveys: SurveyConfig[] = getEveryProgramConfig().flatMap(
    (p) => p.surveys ?? [],
  );
  const allSurveysById = new Map<string, SurveyConfig>();
  for (const s of [
    ...Object.values(PLATFORM_AUTH_SURVEYS),
    ...Object.values(PLATFORM_PUBLIC_SURVEYS),
    ...programSurveys,
  ]) {
    if (!allSurveysById.has(s.id)) allSurveysById.set(s.id, s);
  }
  const configuredWithData = Array.from(allSurveysById.values()).filter((s) =>
    stats.some((r) => r.survey_type === s.id),
  );

  // Surveys with responses but no config entry — synthesize a minimal config so
  // real data is never silently hidden (getSurveySchema still resolves a real
  // schema when one exists).
  //
  // Title-casing the slug mangles acronyms ("comptia-security-agreement" →
  // "Comptia Security Agreement"). Override the known orphan slugs with proper
  // display titles here (display-only — no full SurveyConfig, so this can't make
  // an agreement surface as a fillable survey in the wizard/enrollment flow).
  const ORPHAN_TITLE_OVERRIDES: Record<string, string> = {
    "comptia-security-agreement": "CompTIA Security+ Agreement",
    "catalyst-participation-agreement": "Catalyst Participation Agreement",
  };
  const configuredIds = new Set(configuredWithData.map((s) => s.id));
  const orphanSurveys: SurveyConfig[] = Array.from(
    new Set(stats.map((r) => r.survey_type)),
  )
    .filter((id) => !configuredIds.has(id))
    .map((id) => ({
      id,
      title:
        ORPHAN_TITLE_OVERRIDES[id] ??
        id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: "",
      required: false,
    }));
  const surveysWithData = [...configuredWithData, ...orphanSurveys].sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  const allResponses = await getDashboardAllSurveyResponses(
    surveysWithData.map((s) => s.id),
    programIds,
  );
  let sections: InsightsSection[] = surveysWithData.map((survey) => ({
    survey,
    schema: getSurveySchema(survey.id),
    responses: allResponses[survey.id] ?? [],
  }));

  const visiblePrograms = getEveryProgramConfig().filter((p) =>
    aggregatedSlugs.includes(p.slug),
  );

  let enrolledCount: number | undefined;
  if (trackSlug) {
    const scoped = await scopeSectionsToTrack(sections, trackSlug);
    sections = scoped.sections;
    enrolledCount = scoped.enrolledCount;
  }

  return {
    sections,
    programs: visiblePrograms.map((p) => ({ slug: p.slug, name: p.name })),
    totalResponses: sections.reduce((sum, s) => sum + s.responses.length, 0),
    ...(trackSlug ? { trackSlug, enrolledCount } : {}),
  };
}

/**
 * Narrow assembled sections to one course.
 *
 * Authenticated responses join to the roster by email — the only identifier a
 * BCCSurveyResponse carries. Staff are excluded so a rate isn't measured against
 * facilitators sitting in the course (same filter the completion rate uses).
 *
 * Public responses are anonymous: there is no enrollment to filter on. Dropping
 * them would blank the panel for courses whose post-survey IS the public form
 * (Network+ end-of-cohort), so responses to a survey the course itself declares
 * in `publicSurveys` are kept and flagged `unscopedPublic` for the UI to label.
 */
async function scopeSectionsToTrack(
  sections: InsightsSection[],
  trackSlug: string,
): Promise<{ sections: InsightsSection[]; enrolledCount: number }> {
  const svc = createServiceClient();
  const { data: enrollRows } = await svc
    .from("student_tracks")
    .select("students(email, role, is_staff)")
    .eq("track_slug", trackSlug);

  type Learner = { email: string; role: string; is_staff: boolean | null };
  const emails = new Set<string>();
  for (const row of (enrollRows ?? []) as unknown as {
    students: Learner | Learner[] | null;
  }[]) {
    const s = Array.isArray(row.students) ? row.students[0] : row.students;
    if (!s?.email || s.role !== "student" || s.is_staff) continue;
    emails.add(s.email.toLowerCase());
  }

  const declaredPublic = new Set(
    getEveryProgramConfig()
      .flatMap((p) => p.tracks)
      .filter((t) => t.slug === trackSlug)
      .flatMap((t) => t.publicSurveys ?? []),
  );

  const scoped = sections
    .map((section) => {
      const isDeclaredPublic = declaredPublic.has(section.survey.id);
      const responses = section.responses.filter((r) =>
        r.source === "public"
          ? isDeclaredPublic
          : emails.has((r.email ?? "").toLowerCase()),
      );
      return {
        ...section,
        responses,
        unscopedPublic: responses.some((r) => r.source === "public"),
      };
    })
    .filter((s) => s.responses.length > 0);

  return { sections: scoped, enrolledCount: emails.size };
}
