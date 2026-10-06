import type {
  MvpLearnerRow,
  MvpProgramRow,
  MvpSummary,
} from "./types";

// Coverage tells the calculation whether its input is complete.
// Missing data produces null instead of a misleading zero.
export type MvpMetricCoverage = {
  startsComplete: boolean;
  completionsComplete: boolean;
  upcomingEnrollmentsComplete: boolean;
};

// Milestone timestamps must be valid before they count as evidence.
// A completed learner can count as served even if their start is unavailable.
function hasTimestamp(value: string | null): boolean {
  return value !== null && Number.isFinite(Date.parse(value));
}

// Calculates totals from already-authorized and already-filtered records.
// One program participation is one learner within one program, even when
// that learner appears in multiple courses or cohorts under that program.
export function calculateMvpSummary(
  learners: MvpLearnerRow[],
  programs: MvpProgramRow[],
  coverage: MvpMetricCoverage,
): MvpSummary {
  const programByRowId = new Map(
    programs.map((program) => [program.id, program]),
  );

  const startedLearners = new Set<string>();
  const completedLearners = new Set<string>();
  const startedParticipations = new Set<string>();
  const completedParticipations = new Set<string>();

  for (const learner of learners) {
    const program = programByRowId.get(learner.programRowId);

    if (!program) {
      throw new Error(
        "A learner record does not match the supplied program scope.",
      );
    }

    const participationKey = JSON.stringify([
      program.programId,
      learner.learnerId,
    ]);

    if (hasTimestamp(learner.startedAt)) {
      startedLearners.add(learner.learnerId);
      startedParticipations.add(participationKey);
    }

    if (hasTimestamp(learner.completedAt)) {
      completedLearners.add(learner.learnerId);
      completedParticipations.add(participationKey);
    }
  }

  // Upcoming enrollment is a count of offering enrollments, not unique
  // people. Unknown lifecycle or enrollment data prevents a complete total.
  const upcomingPrograms = programs.filter(
    (program) => program.status === "starting_soon",
  );

  const upcomingCountsKnown = upcomingPrograms.every(
    (program) => program.enrolledBeforeStart !== null,
  );

  const lifecycleKnown = programs.every(
    (program) => program.status !== "unknown",
  );

  const upcomingEnrollments =
    coverage.upcomingEnrollmentsComplete &&
    upcomingCountsKnown &&
    lifecycleKnown
      ? upcomingPrograms.reduce(
          (total, program) => total + (program.enrolledBeforeStart ?? 0),
          0,
        )
      : null;

  return {
    uniqueLearnersStarted: coverage.startsComplete
      ? startedLearners.size
      : null,

    uniqueLearnersCompleted: coverage.completionsComplete
      ? completedLearners.size
      : null,

    programParticipationsStarted: coverage.startsComplete
      ? startedParticipations.size
      : null,

    programParticipationsCompleted: coverage.completionsComplete
      ? completedParticipations.size
      : null,

    upcomingEnrollments,
  };
}

// Shared rate calculation uses the 0–100 convention in types.ts.
// Invalid or unavailable inputs remain unavailable; zero is a real result.
export function calculateMvpPercentage(
  numerator: number | null,
  denominator: number | null,
): number | null {
  if (
    numerator === null ||
    denominator === null ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator < 0 ||
    denominator <= 0 ||
    numerator > denominator
  ) {
    return null;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
}