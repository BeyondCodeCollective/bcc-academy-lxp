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

/**
 * Likert answers are stored two ways. Most rows carry the numeric value
 * ("1".."5"); some carry the LABEL the learner clicked ("Strongly Agree").
 * Number("Strongly Agree") is NaN, so label rows were silently dropped from
 * every mean — and dropping them is not neutral.
 *
 * Beyond Code Centers' pre-survey is 14 label rows and 2 numeric ones. Both
 * numeric rows happened to be "1" (Strongly Agree), so the pre-program baseline
 * was computed from two maximally-positive answers, the post-survey averaged
 * 2.6, and the dashboard reported "Confidence dipped -1.64" for a cohort whose
 * real answers were overwhelmingly positive on both sides.
 *
 * The scales run 1..5 with 1 = Strongly Agree (see scaleAnchors), so labels map
 * onto the same numbers the wizard would have written.
 */
const LIKERT_LABEL_VALUES: Record<string, number> = {
  "strongly agree": 1,
  agree: 2,
  neutral: 3,
  "neither agree nor disagree": 3,
  disagree: 4,
  "strongly disagree": 5,
};

/** A likert answer as a number, whichever way it was stored. NaN when it's
 *  genuinely unanswerable (empty, "Prefer not to say", an unknown label). */
export function likertValue(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string" || raw.length === 0) return NaN;
  const direct = Number(raw);
  if (!Number.isNaN(direct)) return direct;
  const mapped = LIKERT_LABEL_VALUES[raw.trim().toLowerCase()];
  return mapped ?? NaN;
}

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
      const b = likertValue(pair.before);
      if (!Number.isNaN(b)) {
        beforeSum += b;
        beforeN++;
      }
      const n = likertValue(pair.now);
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
      const num = likertValue(block?.[stmt]);
      if (!Number.isNaN(num)) {
        sum += num;
        n++;
      }
    }
    return { statement: stmt, mean: n === 0 ? 0 : sum / n, n };
  });
}
