import type { MvpLearnerFilter } from "./types";
import type { MvpCheckInEvaluation } from "./check-ins";

// These milestones overlap; none is an inferred inverse of active status.
export function parseMvpLearnerFilter(value: string | null): MvpLearnerFilter {
  const options = ["all", "enrolled", "started", "active", "completed", "needs_check_in"] as const;
  if (value === null) return "all";
  if (!options.includes(value as MvpLearnerFilter)) throw new Error("Invalid learner status filter.");
  return value as MvpLearnerFilter;
}

// Unknown evidence never becomes a negative status. Report exclusions by
// learner/offering participation, since one person can qualify in another course.
export function selectMvpLearners(filter: MvpLearnerFilter, roster: string[], evidence: {
  active: ReadonlyMap<string, boolean | null>;
  started: string[] | null;
  completed: string[] | null;
  upcoming: boolean | null;
  checkIns: MvpCheckInEvaluation[];
}): { ids: string[]; unknownCount: number } {
  let unknownCount = 0;
  const ids = [...new Set(roster)].filter((id) => {
    let matches: boolean | null;
    switch (filter) {
      case "all": return true;
      case "enrolled": matches = evidence.upcoming; break;
      case "started": matches = evidence.started === null ? null : evidence.started.includes(id); break;
      case "completed": matches = evidence.completed === null ? null : evidence.completed.includes(id); break;
      case "active": matches = evidence.active.get(id) ?? null; break;
      case "needs_check_in": {
        const checkIn = evidence.checkIns.find((item) => item.learnerId === id);
        matches = !checkIn || checkIn.checkInStatus === "not_evaluated" ? null : checkIn.checkInStatus === "flagged";
        break;
      }
    }
    if (matches === null) unknownCount++;
    return matches === true;
  });
  return { ids, unknownCount };
}
