// These IDs remain server-side. Null marks an offering whose start mapping
// is unavailable; an empty list is a verified zero recorded starts.
export type MvpOfferingStarts = {
  programId: string;
  startedLearnerIds: string[] | null;
};

// Deduplicate people across the selected scope and participations within a
// program. Do not present a known subset as a complete organization total.
export function calculateMvpStartSummary(offerings: MvpOfferingStarts[]) {
  if (offerings.some((offering) => offering.startedLearnerIds === null)) {
    return { uniqueLearnersStarted: null, programParticipationsStarted: null };
  }

  const people = new Set<string>();
  const participations = new Set<string>();
  for (const offering of offerings) {
    for (const learnerId of offering.startedLearnerIds ?? []) {
      people.add(learnerId);
      participations.add(JSON.stringify([offering.programId, learnerId]));
    }
  }
  return {
    uniqueLearnersStarted: people.size,
    programParticipationsStarted: participations.size,
  };
}
