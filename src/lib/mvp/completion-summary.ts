// Only authorized, selected offerings belong in this input. Null means the
// course completion calculation is unavailable, not that nobody completed.
export type MvpOfferingCompletions = {
  programId: string;
  completedLearnerIds: string[] | null;
};

// Count people and learner/program pairs with at least one course completion.
// These pairs do not establish graduation from an entire multi-course program.
export function calculateMvpCompletionSummary(offerings: MvpOfferingCompletions[]) {
  if (offerings.some((offering) => offering.completedLearnerIds === null)) {
    return { uniqueLearnersCompleted: null, programParticipationsCompleted: null };
  }

  const people = new Set<string>();
  const participations = new Set<string>();
  for (const offering of offerings) {
    for (const learnerId of offering.completedLearnerIds ?? []) {
      people.add(learnerId);
      participations.add(JSON.stringify([offering.programId, learnerId]));
    }
  }
  return {
    uniqueLearnersCompleted: people.size,
    programParticipationsCompleted: participations.size,
  };
}
