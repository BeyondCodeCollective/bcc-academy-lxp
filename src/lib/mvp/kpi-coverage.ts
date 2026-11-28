import type { MvpOfferingStarts } from "./start-summary";
import type { MvpOfferingCompletions } from "./completion-summary";
import type { MvpProgramStatus } from "./types";

export type KpiCoverage = { value: number | null; evaluated: number; total: number };

// Inputs have already passed authorization and scope filters. Learner IDs stay
// server-side. Partial values are lower bounds, never complete totals.
export function buildKpiCoverage(starts: MvpOfferingStarts[], completions: MvpOfferingCompletions[],
  rows: { status: MvpProgramStatus; enrolledBeforeStart: number | null }[]) {
  function people(offerings: { programId: string; ids: string[] | null }[]) {
    const known = offerings.filter(row => row.ids !== null);
    const learners = new Set<string>();
    const pairs = new Set<string>();
    for (const row of known) for (const id of row.ids!) {
      learners.add(id); pairs.add(JSON.stringify([row.programId, id]));
    }
    const count = (value: number): KpiCoverage => ({ value: known.length || !offerings.length ? value : null,
      evaluated: known.length, total: offerings.length });
    return { unique: count(learners.size), participations: count(pairs.size) };
  }
  const started = people(starts.map(row => ({ programId: row.programId, ids: row.startedLearnerIds })));
  const completed = people(completions.map(row => ({ programId: row.programId, ids: row.completedLearnerIds })));
  const known = rows.filter(row => row.status !== "unknown" && (row.status !== "starting_soon" ||
    (row.enrolledBeforeStart !== null && Number.isSafeInteger(row.enrolledBeforeStart) && row.enrolledBeforeStart >= 0)));
  return {
    uniqueLearnersStarted: started.unique, programParticipationsStarted: started.participations,
    uniqueLearnersCompleted: completed.unique, programParticipationsCompleted: completed.participations,
    upcomingEnrollments: { value: known.length || !rows.length ? known.reduce((sum, row) =>
      sum + (row.status === "starting_soon" ? row.enrolledBeforeStart! : 0), 0) : null,
      evaluated: known.length, total: rows.length } satisfies KpiCoverage,
  };
}
