import "server-only";

import { getAllPrograms } from "@/lib/programs";
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
};

export type InsightsData = {
  sections: InsightsSection[];
  programs: { slug: string; name: string }[];
  totalResponses: number;
};

/**
 * Assemble the Survey Insights data set for a resolved program scope. Shared by
 * the admin page (the on-screen dashboard) and the PDF export route so both read
 * the exact same surveys, responses, and program legend. Scoped to the passed
 * program ids — the caller resolves scope (current program / Catalyst aggregate).
 */
export async function buildInsightsData(
  programIds: string[],
  aggregatedSlugs: string[],
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

  const programSurveys: SurveyConfig[] = getAllPrograms().flatMap(
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
  const sections: InsightsSection[] = surveysWithData.map((survey) => ({
    survey,
    schema: getSurveySchema(survey.id),
    responses: allResponses[survey.id] ?? [],
  }));

  const visiblePrograms = getAllPrograms().filter((p) =>
    aggregatedSlugs.includes(p.slug),
  );

  return {
    sections,
    programs: visiblePrograms.map((p) => ({ slug: p.slug, name: p.name })),
    totalResponses: sections.reduce((sum, s) => sum + s.responses.length, 0),
  };
}
