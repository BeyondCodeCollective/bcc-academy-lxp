import { expect, it } from "vitest";
import { calculateMvpIncome, type MvpIncomeResponse } from "./household-income";

// Synthetic responses exercise deduplication and missing-versus-declined data.
const row = (id: string, answer: unknown, time = "2026-10-01T00:00:00Z"): MvpIncomeResponse => ({
  id, student_id: "a", survey_type: "bcc-learner-intake", completed_at: time,
  responses: { household_income: answer },
});
it("counts repeated learners once and uses the latest answer", () => {
  const result = calculateMvpIncome(["a", "a"], [row("1", "Under $20,000"), row("2", "$80,000 or more", "2026-10-02T00:00:00Z")]);
  expect(result.respondentCount).toBe(1);
  expect(result.groups[4].count).toBe(1);
});
it("keeps declined responses distinct from missing", () => {
  const result = calculateMvpIncome(["a", "b"], [row("1", "Prefer not to say")]);
  expect(result).toMatchObject({ respondentCount: 1, missingCount: 1 });
  expect(result.groups[5].count).toBe(1);
});
it("does not reuse an older answer when the newest answer is invalid", () => {
  expect(calculateMvpIncome(["a"], [row("1", "Under $20,000"), row("2", "", "2026-10-02T00:00:00Z")]).missingCount).toBe(1);
});
it("ignores incomplete, out-of-scope and unsupported instruments", () => {
  expect(calculateMvpIncome(["a"], [{ ...row("1", "Under $20,000"), completed_at: null },
    { ...row("2", "Under $20,000"), student_id: "other" },
    { ...row("3", "Under $20,000"), survey_type: "salary" }]).respondentCount).toBe(0);
});
it("supports the mid-program field without changing its ranges", () => {
  const response = { ...row("1", null), survey_type: "mid-program-spring-2026", responses: { mid_household_income: "Under $20,000" } };
  expect(calculateMvpIncome(["a"], [response]).groups[0].count).toBe(1);
});
