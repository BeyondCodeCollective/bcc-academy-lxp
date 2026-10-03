import { describe, expect, it } from "vitest";
import type { DualLikertQuestion } from "@/components/survey-fields";
import { calculateMvpSurveyOutcomes, type MvpSurveySubmission } from "./survey-outcomes";

// Synthetic survey fixtures contain no learner identities or production data.
const question: DualLikertQuestion = {
  type: "dual-likert", id: "confidence", label: "Confidence",
  statements: ["Explain a concept"], scale: ["1", "2", "3", "4", "5"],
  beforeLabel: "Before", nowLabel: "Now",
};
function submission(studentId: string, before: unknown, now: unknown,
  completedAt = "2026-10-01T12:00:00Z", id = studentId): MvpSurveySubmission {
  return { id, studentId, completedAt,
    responses: { confidence: { "Explain a concept": { before, now } } } };
}
const calculate = (rows: MvpSurveySubmission[]) =>
  calculateMvpSurveyOutcomes("impact", "Impact survey", [question], rows)[0];

describe("MVP retrospective survey outcomes", () => {
  it("uses matching respondents for both means", () => {
    expect(calculate([submission("a", 2, 4), submission("b", 1, null),
      submission("c", null, 5)])).toMatchObject({ beforeValue: 2, afterValue: 4,
      change: 2, respondentCount: 3, pairedRespondentCount: 1 });
  });
  it("does not pair answers from different learners", () => {
    expect(calculate([submission("a", 2, null), submission("b", null, 4)]))
      .toMatchObject({ beforeValue: null, afterValue: null, change: null, pairedRespondentCount: 0 });
  });
  it("keeps no responses unknown rather than zero growth", () => {
    expect(calculate([])).toMatchObject({ change: null, respondentCount: 0 });
  });
  it("uses latest completed response even when it is incomplete", () => {
    expect(calculate([submission("a", 2, 4), submission("a", 3, null, "2026-10-02T12:00:00Z", "new")]))
      .toMatchObject({ change: null, respondentCount: 1 });
  });
  it("ignores unfinished and invalid-date submissions", () => {
    expect(calculate([{ ...submission("a", 2, 4), completedAt: null }, submission("b", 2, 4, "bad")]).respondentCount).toBe(0);
  });
  it.each([0, 6, 2.5, NaN, Infinity, "", true, {}, []])("rejects invalid scale point %j", (value) => {
    expect(calculate([submission("a", value, 4)]).change).toBeNull();
  });
  it("accepts numeric strings and negative growth", () => {
    expect(calculate([submission("a", "5", "2")]).change).toBe(-3);
  });
  it("breaks timestamp ties consistently", () => {
    const rows = [submission("a", 1, 5, undefined, "a"), submission("a", 3, 4, undefined, "b")];
    expect(calculate(rows)).toEqual(calculate([...rows].reverse()));
    expect(calculate(rows).change).toBe(1);
  });
});
