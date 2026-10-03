import type { MvpDemographicSummary } from "./types";

// These two instruments use identical household-income ranges in schemas.ts.
// Do not merge salary, individual earnings, or SBFT's economic-status labels.
export const MVP_INCOME_FIELDS: Record<string, string> = {
  "bcc-learner-intake": "household_income",
  "mid-program-spring-2026": "mid_household_income",
};
export const MVP_INCOME_RANGES = ["Under $20,000", "$20,000 – $39,999",
  "$40,000 – $59,999", "$60,000 – $79,999", "$80,000 or more", "Prefer not to say"];
export type MvpIncomeResponse = {
  id: string; student_id: string; survey_type: string;
  completed_at: string | null; responses: Record<string, unknown>;
};

// Latest completed income-bearing instrument wins per learner. A blank or
// invalid newer answer remains missing; an older answer is not silently reused.
export function calculateMvpIncome(learnerIds: string[], rows: MvpIncomeResponse[]): MvpDemographicSummary {
  const eligible = new Set(learnerIds);
  const latest = new Map<string, MvpIncomeResponse>();
  for (const row of rows) {
    if (!eligible.has(row.student_id) || !Object.hasOwn(MVP_INCOME_FIELDS, row.survey_type) ||
        !row.completed_at || !Number.isFinite(Date.parse(row.completed_at))) continue;
    const previous = latest.get(row.student_id);
    const time = Date.parse(row.completed_at);
    const previousTime = previous?.completed_at ? Date.parse(previous.completed_at) : -Infinity;
    if (!previous || time > previousTime || (time === previousTime && row.id > previous.id)) latest.set(row.student_id, row);
  }
  const counts = MVP_INCOME_RANGES.map(() => 0);
  let missing = 0;
  for (const id of eligible) {
    const row = latest.get(id);
    const raw = row?.responses?.[MVP_INCOME_FIELDS[row.survey_type]];
    const index = typeof raw === "string" ? MVP_INCOME_RANGES.indexOf(raw.trim()) : -1;
    if (index < 0) missing++; else counts[index]++;
  }
  return { id: "household-income", label: "Self-reported household income (not salary)", unit: "Unique learners",
    respondentCount: eligible.size - missing, missingCount: missing,
    groups: MVP_INCOME_RANGES.map((label, index) => ({ label, count: counts[index] })) };
}
