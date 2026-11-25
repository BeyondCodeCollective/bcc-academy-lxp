import type { MvpOfferingStarts } from "./start-summary";
import type { MvpOfferingCompletions } from "./completion-summary";
import type { MvpProgramStatus } from "./types";

export type VerifiedCount = { value: number | null; evaluated: number; total: number };

// Only authorized, already filtered inputs belong here. These are lower-bound
// observations, not substitutes for the strict organization totals or exports.
export function buildVerifiedOverview(
  starts: MvpOfferingStarts[], completions: MvpOfferingCompletions[],
  rows: { status: MvpProgramStatus; enrolledBeforeStart: number | null }[],
) {
  function people(offerings: { programId: string; ids: string[] | null }[]) {
    const known = offerings.filter(row => row.ids !== null);
    const ids = new Set<string>();
    const pairs = new Set<string>();
    for (const row of known) for (const id of row.ids!) {
      ids.add(id); pairs.add(JSON.stringify([row.programId, id]));
    }
    const count = (value: number): VerifiedCount => ({
      value: known.length || !offerings.length ? value : null,
      evaluated: known.length, total: offerings.length,
    });
    return { unique: count(ids.size), participations: count(pairs.size) };
  }
  const started = people(starts.map(row => ({ programId: row.programId, ids: row.startedLearnerIds })));
  const completed = people(completions.map(row => ({ programId: row.programId, ids: row.completedLearnerIds })));
  const knownUpcoming = rows.filter(row => row.status !== "unknown" && (row.status !== "starting_soon" ||
    (row.enrolledBeforeStart !== null && Number.isSafeInteger(row.enrolledBeforeStart) && row.enrolledBeforeStart >= 0)));
  return {
    uniqueLearnersStarted: started.unique, programParticipationsStarted: started.participations,
    uniqueLearnersCompleted: completed.unique, programParticipationsCompleted: completed.participations,
    upcomingEnrollments: {
      value: knownUpcoming.length || !rows.length ? knownUpcoming.reduce((sum, row) => sum + (row.status === "starting_soon" ? row.enrolledBeforeStart! : 0), 0) : null,
      evaluated: knownUpcoming.length, total: rows.length,
    } satisfies VerifiedCount,
  };
}
