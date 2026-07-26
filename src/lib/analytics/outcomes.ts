// Outcomes & Learning analytics — "are they actually learning?"
//
// Confidence/mindset shift is derived from survey responses three ways:
//   1. dual-likert questions  → before/now captured in one question
//   2. a pair of likert questions in the SAME survey that share an identical
//      statement list (e.g. network-plus-post's confidence_before / _now)
//   3. a CROSS-survey pre→post pair (e.g. pre-survey-spring-2026 vs
//      post-survey-spring-2026) sharing a Likert id + statement list. This is a
//      cohort-level shift (pre-respondents' mean vs post-respondents' mean), not
//      a per-student paired delta — the public surveys carry no reliable
//      identity to join on.
//
// Scale reconciliation: the spring-2026 instruments use INVERTED anchors
// ("1 — Strongly Agree" … "5 — Strongly Disagree"), so a lower number means more
// confidence and a naive post−pre delta reads backwards. orient() flips inverted
// means so higher always = more agreement/confidence before any delta is taken.

import { createServiceClient } from "@/lib/supabase/server";
import { getSurveySchema } from "@/lib/surveys/schemas";
import { getDashboardAllSurveyResponses } from "@/app/dashboard/admin/actions-surveys";
import type { BCCSurveyResponse } from "@/app/dashboard/admin/actions-surveys";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { getEveryProgramConfig } from "@/lib/programs";
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
  /** True for cross-survey pre→post pairs — a cohort-level comparison (pre vs
   *  post respondents), not the same individuals paired. */
  isCrossSurvey?: boolean;
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
    ...getEveryProgramConfig().flatMap((p) => p.surveys ?? []),
  ]) {
    ids.add(s.id);
  }
  return Array.from(ids);
}

function titleFor(surveyId: string): string {
  const cfg =
    PLATFORM_AUTH_SURVEYS[surveyId] ??
    PLATFORM_PUBLIC_SURVEYS[surveyId] ??
    getEveryProgramConfig()
      .flatMap((p) => p.surveys ?? [])
      .find((s) => s.id === surveyId);
  return cfg?.title ?? surveyId;
}

function scaleMaxOf(scale: string[]): number {
  const last = Number(scale[scale.length - 1]);
  return Number.isNaN(last) ? scale.length : last;
}

function scaleMinOf(scale: string[]): number {
  const first = Number(scale[0]);
  return Number.isNaN(first) ? 1 : first;
}

type LikertQ = Extract<SurveyQuestion, { type: "likert" }>;
type DualLikertQ = Extract<SurveyQuestion, { type: "dual-likert" }>;

// Cross-survey pre→post pairs: two separate surveys that reuse a Likert id +
// statement list. Same-survey pairs are found structurally (shiftSchema); these
// can't be, so they're declared explicitly.
const CROSS_SURVEY_PAIRS: { before: string; after: string }[] = [
  { before: "pre-survey-spring-2026", after: "post-survey-spring-2026" },
];

// An inverted Likert reads the LOW number as agreement ("1 — Strongly Agree").
// We detect it from the anchors: the low end mentions "agree" but not "disagree".
function isInvertedLikert(q: LikertQ): boolean {
  const low = q.scaleAnchors?.low ?? "";
  return /agree/i.test(low) && !/disagree/i.test(low);
}

// Reorient a mean so higher always = more agreement/confidence. Conventional
// scales pass through; inverted scales flip around the midpoint. mean === 0 is
// the "no data" sentinel from aggregateLikertMeans, so leave it untouched.
function orient(mean: number, q: LikertQ): number {
  if (mean === 0 || !isInvertedLikert(q)) return mean;
  return scaleMinOf(q.scale) + scaleMaxOf(q.scale) - mean;
}

/**
 * Build before→now shift groups by pairing a Likert question across two surveys
 * (pre vs post). Each matched statement compares the pre-respondents' mean to
 * the post-respondents' mean, both reoriented so a positive delta = real gain.
 */
function crossSurveyGroups(
  pair: { before: string; after: string },
  beforeResponses: BCCSurveyResponse[],
  afterResponses: BCCSurveyResponse[],
): ShiftGroup[] {
  const beforeSchema = getSurveySchema(pair.before);
  const afterSchema = getSurveySchema(pair.after);
  if (!beforeSchema || !afterSchema) return [];

  const beforeById = new Map(
    beforeSchema
      .filter((q): q is LikertQ => q.type === "likert")
      .map((q) => [q.id, q] as const),
  );

  const out: ShiftGroup[] = [];
  for (const after of afterSchema) {
    if (after.type !== "likert") continue;
    const before = beforeById.get(after.id);
    // Pair only when both sides share the id AND the exact statement list, so
    // a reworded post-survey can't silently mis-pair against the pre-survey.
    if (!before || JSON.stringify(before.statements) !== JSON.stringify(after.statements)) {
      continue;
    }
    const beforeMeans = aggregateLikertMeans(before, beforeResponses);
    const afterMeans = aggregateLikertMeans(after, afterResponses);
    const rows: ShiftRow[] = after.statements
      .map((stmt, i) => {
        const b = beforeMeans[i];
        const a = afterMeans[i];
        const n = Math.min(b.n, a.n);
        if (n === 0) return null;
        const oBefore = orient(b.mean, before);
        const oNow = orient(a.mean, after);
        return {
          statement: stmt,
          before: oBefore,
          now: oNow,
          delta: oNow - oBefore,
          n,
        };
      })
      .filter((r): r is ShiftRow => r !== null);
    if (rows.length === 0) continue;
    out.push({
      surveyId: pair.after,
      surveyTitle: `${titleFor(pair.before)} → ${titleFor(pair.after)}`,
      label: after.label,
      beforeLabel: "Before (pre-survey)",
      nowLabel: "After (post-survey)",
      scaleMax: scaleMaxOf(after.scale),
      rows,
      isCrossSurvey: true,
    });
  }
  return out;
}

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
  // Only fetch responses for surveys whose schema actually carries shift data —
  // plus the surveys named in the cross-survey pairs (which carry shift only when
  // paired, so surveyCarriesShift can't detect them on their own).
  const shiftSurveyIds = candidateSurveyIds().filter((id) => {
    const schema = getSurveySchema(id);
    return schema ? surveyCarriesShift(schema) : false;
  });
  const crossIds = CROSS_SURVEY_PAIRS.flatMap((p) => [p.before, p.after]);
  const fetchIds = Array.from(new Set([...shiftSurveyIds, ...crossIds]));

  const [responsesByType, composition] = await Promise.all([
    fetchIds.length > 0
      ? // Scope the response fetch to this program in SQL — no BCC-wide overfetch,
        // and no chance of leaking another program's rows through a missed filter.
        getDashboardAllSurveyResponses(fetchIds, scope.ids)
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
  // Cross-survey pre→post pairs (cohort-level, scale-reconciled).
  for (const pair of CROSS_SURVEY_PAIRS) {
    const before = responsesByType[pair.before] ?? [];
    const after = responsesByType[pair.after] ?? [];
    if (before.length === 0 || after.length === 0) continue;
    groups.push(...crossSurveyGroups(pair, before, after));
  }
  // A shift claim needs a real sample on BOTH sides — with one post-survey
  // respondent, "confidence dipped" is one person's answers wearing the whole
  // cohort's face (16 pre vs 1 post did exactly this). Rows below the floor
  // are cut; if nothing survives, the page shows its "fills in once a cohort
  // completes a survey" empty state instead of a verdict.
  const MIN_SHIFT_N = 3;
  const sampledGroups = groups
    .map((g) => ({ ...g, rows: g.rows.filter((r) => r.n >= MIN_SHIFT_N) }))
    .filter((g) => g.rows.length > 0);
  groups.length = 0;
  groups.push(...sampledGroups);

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
