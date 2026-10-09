import "server-only";
import { getMvpDashboardData } from "./queries";

// Every drill-down reloads authorized data; a row/learner ID from the browser
// is a selector, never permission. Sensitive summaries remain opt-in.
export async function getMvpProgramDetail(
  params: Record<string, string | string[] | undefined>,
  options: { includeDemographics?: boolean; includeLocations?: boolean; includeEvents?: boolean } = {},
) {
  if (typeof params.programId !== "string" || !params.programId.trim()) throw new Error("Choose one program for details.");
  const data = await getMvpDashboardData(params, options);
  return { programId: params.programId, programName: data.scopeLabel,
    appliedFilters: data.appliedFilters, freshness: data.freshness,
    summary: data.programSummaries?.find(row => row.programId === params.programId) ?? null,
    offerings: data.programs, outcomes: data.surveyOutcomes ?? [],
    definitions: data.metricDefinitions, cohortCoverage: data.cohortCoverage,
    ...(options.includeEvents && { events: data.events }),
    ...(options.includeLocations && { geography: data.geography }),
    ...(options.includeDemographics && { demographics: data.demographics }),
  };
}

// Supporting references and unavailable rules are scoped to one offering and
// the selected current roster. Raw answers, contact details and files are not read.
export async function getMvpCheckInEvidence(
  params: Record<string, string | string[] | undefined>, learnerId: string,
) {
  if (typeof params.programId !== "string" || !params.programId.trim() ||
      typeof params.courseSlug !== "string" || !params.courseSlug.trim() ||
      typeof learnerId !== "string" || !learnerId.trim()) throw new Error("Choose a program, course, and learner for evidence.");
  const data = await getMvpDashboardData(params);
  const offering = data.programs.find(row => row.programId === params.programId && row.courseSlug === params.courseSlug);
  const evaluation = offering && data.checkInEvaluations?.find(row => row.programRowId === offering.id && row.learnerId === learnerId);
  if (!offering || !evaluation) throw new Error("The selected evidence is unavailable.");
  return { offering: { id: offering.id, programName: offering.programName, courseName: offering.courseName },
    appliedFilters: data.appliedFilters, freshness: data.freshness, evaluation };
}
