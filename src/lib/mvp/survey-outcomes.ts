import type { DualLikertQuestion } from "@/components/survey-fields";
import type { MvpOutcomeMeasure } from "./types";

// Inputs must already be scoped to one authorized offering and survey.
// These are retrospective self-reports, not evidence of causal program impact.
export type MvpSurveySubmission = {
  id: string;
  studentId: string;
  completedAt: string | null;
  responses: Record<string, unknown>;
};

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

// Accept only actual numeric scale points; missing and malformed values
// remain unknown instead of becoming zero or an invented scale position.
function score(value: unknown, scale: number[]): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && scale.includes(number) ? number : null;
}

export function calculateMvpSurveyOutcomes(
  surveyId: string,
  sourceLabel: string,
  questions: DualLikertQuestion[],
  submissions: MvpSurveySubmission[],
): MvpOutcomeMeasure[] {
  // Count each learner once using their latest completed submission.
  // A stable ID tie-break makes results independent of database row order.
  const latest = new Map<string, MvpSurveySubmission>();
  for (const submission of submissions) {
    if (!submission.studentId || !submission.completedAt ||
        !Number.isFinite(Date.parse(submission.completedAt))) continue;
    const previous = latest.get(submission.studentId);
    const time = Date.parse(submission.completedAt);
    const previousTime = previous?.completedAt ? Date.parse(previous.completedAt) : -Infinity;
    if (!previous || time > previousTime ||
        (time === previousTime && submission.id > previous.id)) {
      latest.set(submission.studentId, submission);
    }
  }

  // Both means and their change use exactly the same paired respondents.
  // Partial answers count as respondents but cannot contribute to growth.
  return questions.flatMap((question) => {
    const scale = question.scale.map(Number);
    if (question.scale.some((point) => !point.trim()) ||
        scale.length < 2 || scale.some((point) => !Number.isFinite(point))) return [];
    return question.statements.map((statement): MvpOutcomeMeasure => {
      let respondents = 0;
      let pairs = 0;
      let beforeTotal = 0;
      let afterTotal = 0;
      for (const submission of latest.values()) {
        const answer = object(object(submission.responses[question.id])[statement]);
        const before = score(answer.before, scale);
        const after = score(answer.now, scale);
        if (before !== null || after !== null) respondents++;
        if (before !== null && after !== null) {
          pairs++;
          beforeTotal += before;
          afterTotal += after;
        }
      }
      return {
        id: JSON.stringify([surveyId, question.id, statement]),
        label: statement,
        sourceLabel,
        unit: `Self-reported scale points (${question.scale.join(", ")})`,
        beforeValue: pairs ? beforeTotal / pairs : null,
        afterValue: pairs ? afterTotal / pairs : null,
        change: pairs ? (afterTotal - beforeTotal) / pairs : null,
        respondentCount: respondents,
        pairedRespondentCount: pairs,
      };
    });
  });
}
