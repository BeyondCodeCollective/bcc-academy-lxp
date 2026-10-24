import type { MvpSurveyOutcomeGroup } from "./survey-queries";
import type { MvpDashboardData } from "./types";

export const MVP_MINIMUM_GROUP_SIZE = 5;
export const MVP_SUPPRESSION_REASON = "Results hidden to protect groups with fewer than 5 learners.";
export const isSmallMvpCount = (count: number | null | undefined): boolean =>
  typeof count === "number" && count > 0 && count < MVP_MINIMUM_GROUP_SIZE;

// Keep raw calculations internal. Null is withheld, never a replacement zero.
export function protectMvpSurvey(group: MvpSurveyOutcomeGroup): MvpSurveyOutcomeGroup {
  const hidden = group.measures.some(measure => isSmallMvpCount(measure.pairedRespondentCount) ||
    isSmallMvpCount(measure.respondentCount) || (measure.respondentCount !== null && measure.pairedRespondentCount !== null &&
      isSmallMvpCount(measure.respondentCount - measure.pairedRespondentCount)));
  const eligible = group.participation?.[0]?.eligibleLearners;
  const anyRespondents = typeof group.anySurveyResponseRate === "number" && eligible !== undefined
    ? Math.round(group.anySurveyResponseRate / 100 * eligible) : null;
  const hideParticipation = hidden || isSmallMvpCount(anyRespondents) ||
    (anyRespondents !== null && anyRespondents > 0 && eligible !== undefined && isSmallMvpCount(eligible - anyRespondents)) ||
    group.participation?.some(row => isSmallMvpCount(row.respondents) ||
    (row.respondents > 0 && isSmallMvpCount(row.eligibleLearners - row.respondents)));
  return { ...group,
    // Suppress the whole related survey group to avoid reconstructing a small
    // paired sample from respondent totals, related measures, or response rates.
    measures: hidden ? group.measures.map(measure => ({ ...measure, beforeValue: null, afterValue: null,
      change: null, respondentCount: null, pairedRespondentCount: null })) : group.measures,
    participation: hideParticipation ? [] : group.participation,
    anySurveyResponseRate: hideParticipation ? null : group.anySurveyResponseRate,
    unavailableReason: hidden || hideParticipation ? MVP_SUPPRESSION_REASON : group.unavailableReason,
  };
}

export function protectMvpGeography(data: MvpDashboardData): MvpDashboardData {
  const distributions = data.geography ? [data.geography.locations, data.geography.postalCodes, data.geography.states] : [];
  const hidden = distributions.some(distribution => isSmallMvpCount(distribution.respondentCount) ||
    isSmallMvpCount(distribution.missingCount) || distribution.groups.some(group => isSmallMvpCount(group.count))) ||
    (data.locations && (isSmallMvpCount(data.locations.missingLocationLearners) ||
      data.locations.groups.some(group => isSmallMvpCount(group.count))));
  if (!hidden) return data;
  // Hide all alternate geography projections and their totals together. Merely
  // replacing a single cell would expose it by subtraction from known totals.
  const { geography: _geography, locations: _locations, ...safe } = data;
  void _geography; void _locations;
  return { ...safe, metricDefinitions: [...data.metricDefinitions, {
    key: "geographyPrivacy", label: "Geographic privacy", denominator: null,
    definition: "Geographic distributions are withheld when a nonzero group or missing category is below 5.",
    unavailableReason: MVP_SUPPRESSION_REASON,
  }] };
}
