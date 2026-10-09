// Profile text is not a verified city. Do not geocode or combine similarly
// named locations without an authoritative city field or mapping.
export type MvpLocationSummary = {
  uniqueLearners: number; knownLocationLearners: number; missingLocationLearners: number;
  distinctReportedLocations: number; citiesRepresented: null; unavailableReason: string;
  groups: Array<{ label: string; count: number }>;
};
export function calculateMvpLocations(learners: Array<{ id: string; location: string | null }>): MvpLocationSummary {
  const byLearner = new Map<string, Set<string>>();
  for (const learner of learners) {
    const values = byLearner.get(learner.id) ?? new Set<string>();
    values.add(learner.location?.trim() ?? "");
    byLearner.set(learner.id, values);
  }
  const counts = new Map<string, number>();
  let missing = 0;
  for (const values of byLearner.values()) {
    const label = [...values][0];
    if (values.size !== 1 || !label) { missing++; continue; }
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return { uniqueLearners: byLearner.size, knownLocationLearners: byLearner.size - missing,
    missingLocationLearners: missing, distinctReportedLocations: counts.size, citiesRepresented: null,
    unavailableReason: "Locations are self-reported text; verified city counts are unavailable.",
    groups: [...counts].sort(([a], [b]) => a.localeCompare(b, "en-US")).map(([label, count]) => ({ label, count })) };
}
