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
import type { ProgramScope } from "@/lib/programs/scope";

// The shift maths lives in ./shift so the browser can run it too — the Insights
// panel recomputes for the selected cohort without a round trip.
export type {
  ShiftRow,
  ShiftGroup,
  CompositionSegment,
  OutcomesData,
} from "./shift";

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
import {
  type ShiftGroup,
  type CompositionSegment,
  type OutcomesData,
  candidateSurveyIds,
  surveyCarriesShift,
  groupsFromSurvey,
  crossSurveyGroups,
  CROSS_SURVEY_PAIRS,
  avgOf,
} from "./shift";

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

