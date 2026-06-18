// Pure aggregation helpers for survey response JSON. Shared by the per-survey
// dashboard (src/app/dashboard/admin/surveys/[surveyId]/survey-dashboard.tsx)
// and the admin Outcomes dashboard so both read the same numbers from the same
// code path. No React, no I/O — just response[] in, stats out.
//
// Response JSON shapes (keyed by question id, then by the full statement text):
//   likert:       responses[qid][statement] = "4"
//   dual-likert:  responses[qid][statement] = { before: "2", now: "5" }

import type { SurveyQuestion } from "@/components/survey-fields";

/** Anything with a `responses` bag — both BCCSurveyResponse and the survey
 *  dashboard's filtered rows satisfy this. */
type HasResponses = { responses: Record<string, unknown> };

export type DualLikertStat = {
  statement: string;
  /** Mean of the "before" answers (0 when nobody answered). */
  before: number;
  /** Mean of the "now" answers (0 when nobody answered). */
  now: number;
  /** now − before. */
  delta: number;
  /** Respondents who answered both sides. */
  n: number;
};

export type LikertMeanStat = {
  statement: string;
  mean: number;
  n: number;
};

/**
 * Per-statement before/now means for a dual-likert question. Mirrors exactly
 * what DualLikertBlock renders so the two surfaces never drift.
 */
export function aggregateDualLikert(
  question: Extract<SurveyQuestion, { type: "dual-likert" }>,
  responses: HasResponses[],
): DualLikertStat[] {
  return question.statements.map((stmt) => {
    let beforeSum = 0;
    let beforeN = 0;
    let nowSum = 0;
    let nowN = 0;
    for (const r of responses) {
      const block = r.responses[question.id] as
        | Record<string, { before?: string; now?: string }>
        | undefined;
      const pair = block?.[stmt];
      if (!pair) continue;
      const b = Number(pair.before);
      if (!Number.isNaN(b)) {
        beforeSum += b;
        beforeN++;
      }
      const n = Number(pair.now);
      if (!Number.isNaN(n)) {
        nowSum += n;
        nowN++;
      }
    }
    const before = beforeN === 0 ? 0 : beforeSum / beforeN;
    const now = nowN === 0 ? 0 : nowSum / nowN;
    return {
      statement: stmt,
      before,
      now,
      delta: now - before,
      n: Math.min(beforeN, nowN),
    };
  });
}

/** Per-statement mean for a single likert question. */
export function aggregateLikertMeans(
  question: Extract<SurveyQuestion, { type: "likert" }>,
  responses: HasResponses[],
): LikertMeanStat[] {
  return question.statements.map((stmt) => {
    let sum = 0;
    let n = 0;
    for (const r of responses) {
      const block = r.responses[question.id] as
        | Record<string, unknown>
        | undefined;
      const v = block?.[stmt];
      if (typeof v === "string" && v.length > 0) {
        const num = Number(v);
        if (!Number.isNaN(num)) {
          sum += num;
          n++;
        }
      }
    }
    return { statement: stmt, mean: n === 0 ? 0 : sum / n, n };
  });
}
