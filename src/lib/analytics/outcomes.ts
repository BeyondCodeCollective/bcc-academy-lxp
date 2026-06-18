// Outcomes & Learning analytics — "are they actually learning?"
//
// Confidence/mindset shift is derived from survey responses two ways, both of
// which live entirely inside a single response row (no cross-survey join, so
// no student-id pairing needed):
//   1. dual-likert questions  → before/now captured in one question
//   2. a pair of likert questions in the SAME survey that share an identical
//      statement list (e.g. network-plus-post's confidence_before / _now)
//
// Cross-survey pre→post pairing (e.g. pre-survey-spring-2026 vs
// post-survey-spring-2026) is intentionally NOT done here: those surveys use
// inverted scale anchors ("1 — Strongly Agree" … "5 — Strongly Disagree"), so a
// naive post−pre delta would read backwards. Until that's reconciled, we only
// surface the conventionally-oriented, single-row sources above.

import { createServiceClient } from "@/lib/supabase/server";
import { getSurveySchema } from "@/lib/surveys/schemas";
import { getDashboardAllSurveyResponses } from "@/app/dashboard/admin/actions-surveys";
import type { BCCSurveyResponse } from "@/app/dashboard/admin/actions-surveys";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { getAllPrograms } from "@/lib/programs";
import { aggregateDualLikert, aggregateLikertMeans } from "@/lib/surveys/aggregate";
import type { SurveyQuestion } from "@/components/survey-fields";
import type { ProgramScope } from "@/lib/programs/scope";

export type ShiftRow = {
  statement: string;
  before: number;
  now: number;
  delta: number;
  n: number;
};

export type ShiftGroup = {
  surveyId: string;
  surveyTitle: string;
  /** The question label (or the pair's shared theme). */
  label: string;
  beforeLabel: string;
  nowLabel: string;
  /** Top of the scale, for bar normalization (e.g. 5). */
  scaleMax: number;
  rows: ShiftRow[];
};

export type CompositionSegment = { label: string; value: number };

export type OutcomesData = {
  groups: ShiftGroup[];
  /** Mean delta across every statement in every group. */
  avgDelta: number;
  /** Distinct statements measured. */
  statementCount: number;
  /** Largest single-group respondent count — a floor on "people measured". */
  respondents: number;
  /** Learner identity snapshot from the assessment (composition, not gain). */
  pathway: CompositionSegment[];
  archetype: CompositionSegment[];
};

const PRETTY_PATHWAY: Record<string, string> = {
  ownership: "Ownership",
  placement: "Placement",
  blended: "Blended",
  exploring: "Exploring",
};

function prettyArchetype(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Every survey id we know how to introspect a schema for. */
function candidateSurveyIds(): string[] {
  const ids = new Set<string>();
  for (const s of [
    ...Object.values(PLATFORM_AUTH_SURVEYS),
    ...Object.values(PLATFORM_PUBLIC_SURVEYS),
    ...getAllPrograms().flatMap((p) => p.surveys ?? []),
  ]) {
    ids.add(s.id);
  }
  return Array.from(ids);
}

function titleFor(surveyId: string): string {
  const cfg =
    PLATFORM_AUTH_SURVEYS[surveyId] ??
    PLATFORM_PUBLIC_SURVEYS[surveyId] ??
    getAllPrograms()
      .flatMap((p) => p.surveys ?? [])
      .find((s) => s.id === surveyId);
  return cfg?.title ?? surveyId;
}

function scaleMaxOf(scale: string[]): number {
  const last = Number(scale[scale.length - 1]);
  return Number.isNaN(last) ? scale.length : last;
}

type LikertQ = Extract<SurveyQuestion, { type: "likert" }>;
type DualLikertQ = Extract<SurveyQuestion, { type: "dual-likert" }>;

/**
 * The single definition of "what in this survey carries a before→now shift":
 *   • every dual-likert question, and
 *   • every pair of likert questions sharing an identical statement list
 *     (first in document order = before, second = now).
 * Both the fetch prefilter and the group extraction read from here, so the two
 * can never disagree about which surveys count.
 */
function shiftSchema(schema: SurveyQuestion[]): {
  dual: DualLikertQ[];
  pairs: [LikertQ, LikertQ][];
} {
  const dual = schema.filter((q): q is DualLikertQ => q.type === "dual-likert");
  const likerts = schema.filter((q): q is LikertQ => q.type === "likert");
  const byStatements = new Map<string, LikertQ[]>();
  for (const q of likerts) {
    const key = JSON.stringify(q.statements);
    const bucket = byStatements.get(key) ?? [];
    bucket.push(q);
    byStatements.set(key, bucket);
  }
  const pairs: [LikertQ, LikertQ][] = [];
  for (const bucket of byStatements.values()) {
    if (bucket.length === 2) pairs.push([bucket[0], bucket[1]]); // unambiguous before/now
  }
  return { dual, pairs };
}

function surveyCarriesShift(schema: SurveyQuestion[]): boolean {
  const { dual, pairs } = shiftSchema(schema);
  return dual.length > 0 || pairs.length > 0;
}

/** Pull every before/now shift group out of one survey's schema + responses. */
function groupsFromSurvey(
  surveyId: string,
  schema: SurveyQuestion[],
  responses: BCCSurveyResponse[],
): ShiftGroup[] {
  const surveyTitle = titleFor(surveyId);
  const { dual, pairs } = shiftSchema(schema);
  const out: ShiftGroup[] = [];

  // 1. Dual-likert questions — before/now in a single question.
  for (const q of dual) {
    const rows = aggregateDualLikert(q, responses).filter((r) => r.n > 0);
    if (rows.length === 0) continue;
    out.push({
      surveyId,
      surveyTitle,
      label: q.label,
      beforeLabel: q.beforeLabel,
      nowLabel: q.nowLabel,
      scaleMax: scaleMaxOf(q.scale),
      rows,
    });
  }

  // 2. Likert pairs — two likert questions sharing an identical statement list.
  for (const [before, now] of pairs) {
    const beforeMeans = aggregateLikertMeans(before, responses);
    const nowMeans = aggregateLikertMeans(now, responses);
    const rows: ShiftRow[] = before.statements
      .map((stmt, i) => {
        const b = beforeMeans[i];
        const a = nowMeans[i];
        const n = Math.min(b.n, a.n);
        return {
          statement: stmt,
          before: b.mean,
          now: a.mean,
          delta: a.mean - b.mean,
          n,
        };
      })
      .filter((r) => r.n > 0);
    if (rows.length === 0) continue;
    out.push({
      surveyId,
      surveyTitle,
      label: before.label.replace(/\s*(before|after|now)\s*/i, "").trim() || before.label,
      beforeLabel: before.label,
      nowLabel: now.label,
      scaleMax: scaleMaxOf(before.scale),
      rows,
    });
  }

  return out;
}

async function fetchComposition(scope: ProgramScope): Promise<{
  pathway: CompositionSegment[];
  archetype: CompositionSegment[];
}> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("assessment_results")
    .select("scored_output")
    .in("program_slug", scope.slugs);
  const pathway = new Map<string, number>();
  const archetype = new Map<string, number>();
  for (const row of data ?? []) {
    const out = (row as { scored_output: Record<string, unknown> }).scored_output;
    const p = typeof out?.pathway_orientation === "string" ? out.pathway_orientation : null;
    const a = typeof out?.archetype_primary === "string" ? out.archetype_primary : null;
    if (p) pathway.set(p, (pathway.get(p) ?? 0) + 1);
    if (a) archetype.set(a, (archetype.get(a) ?? 0) + 1);
  }
  return {
    pathway: Array.from(pathway.entries())
      .map(([k, v]) => ({ label: PRETTY_PATHWAY[k] ?? k, value: v }))
      .sort((a, b) => b.value - a.value),
    archetype: Array.from(archetype.entries())
      .map(([k, v]) => ({ label: prettyArchetype(k), value: v }))
      .sort((a, b) => b.value - a.value),
  };
}

/**
 * Cross-program (BCC-wide) learning outcomes. Super-admin only — relies on
 * getDashboardAllSurveyResponses, which enforces that.
 */
export async function fetchOutcomesData(scope: ProgramScope): Promise<OutcomesData> {
  // Only fetch responses for surveys whose schema actually carries shift data.
  const shiftSurveyIds = candidateSurveyIds().filter((id) => {
    const schema = getSurveySchema(id);
    return schema ? surveyCarriesShift(schema) : false;
  });

  const [responsesByType, composition] = await Promise.all([
    shiftSurveyIds.length > 0
      ? // Scope the response fetch to this program in SQL — no BCC-wide overfetch,
        // and no chance of leaking another program's rows through a missed filter.
        getDashboardAllSurveyResponses(shiftSurveyIds, scope.ids)
      : Promise.resolve({} as Record<string, BCCSurveyResponse[]>),
    fetchComposition(scope),
  ]);

  const groups: ShiftGroup[] = [];
  for (const id of shiftSurveyIds) {
    const schema = getSurveySchema(id);
    const responses = responsesByType[id] ?? [];
    if (!schema || responses.length === 0) continue;
    groups.push(...groupsFromSurvey(id, schema, responses));
  }
  // Surface the biggest movers first.
  groups.sort((a, b) => avgOf(b.rows) - avgOf(a.rows));

  const allDeltas = groups.flatMap((g) => g.rows.map((r) => r.delta));
  const avgDelta =
    allDeltas.length === 0
      ? 0
      : allDeltas.reduce((s, d) => s + d, 0) / allDeltas.length;
  const respondents = groups.reduce(
    (max, g) => Math.max(max, ...g.rows.map((r) => r.n)),
    0,
  );

  return {
    groups,
    avgDelta,
    statementCount: allDeltas.length,
    respondents,
    pathway: composition.pathway,
    archetype: composition.archetype,
  };
}

function avgOf(rows: ShiftRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((s, r) => s + r.delta, 0) / rows.length;
}
