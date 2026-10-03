import type { MvpDemographicSummary } from "./types";

// Ages describe the current filtered roster as of the supplied UTC date,
// not age at enrollment. Invalid, future and missing birth dates stay unknown.
export function calculateMvpAges(
  learners: Array<{ id: string; dateOfBirth: string | null }>,
  asOf: Date,
): MvpDemographicSummary {
  const bands = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65+"];
  const counts = bands.map(() => 0);
  let missing = 0;
  const today = asOf.toISOString().slice(0, 10);
  for (const learner of new Map(learners.map((item) => [item.id, item])).values()) {
    const dob = learner.dateOfBirth;
    const parsed = dob && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? new Date(`${dob}T00:00:00Z`) : null;
    if (!parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dob || dob! > today) {
      missing++;
      continue;
    }
    const age = asOf.getUTCFullYear() - parsed.getUTCFullYear() - (today.slice(5) < dob!.slice(5) ? 1 : 0);
    const index = age < 18 ? 0 : age < 25 ? 1 : age < 35 ? 2 : age < 45 ? 3 : age < 55 ? 4 : age < 65 ? 5 : 6;
    counts[index]++;
  }
  return { id: "age", label: `Age as of ${today} (current roster)`, unit: "Unique learners",
    respondentCount: counts.reduce((sum, count) => sum + count, 0), missingCount: missing,
    groups: bands.map((label, index) => ({ label, count: counts[index] })) };
}
