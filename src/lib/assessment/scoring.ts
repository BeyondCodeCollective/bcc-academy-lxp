// src/lib/assessment/scoring.ts

import type { ArchetypeKey, ScoredOutput, RawResponses, ArchetypeConfidence, PathwayOrientation } from "./types";
import { MODULE_1_ITEMS, MODULE_2_SCENARIOS, MODULE_3_ITEMS } from "./content";

// ─── Module 1 ─────────────────────────────────────────────────────────────────

// Float guard: averages of three integers are multiples of 1/3, so every
// threshold is compared with a tolerance, not exactly.
const EPS = 1e-9;

// One answer step on a three-item archetype is 1/3 of a point. Angel's v4 rules
// are written in these steps: 0.33 ("blended") and 0.67 ("clear", and the
// widest gap at which a secondary is still shown).
const STEP = 1 / 3;

const ARCHETYPE_KEYS = [...new Set(MODULE_1_ITEMS.map((i) => i.archetype))];

function scoreModule1(responses: RawResponses): Pick<ScoredOutput,
  "archetype_primary" | "archetype_secondary" | "archetype_is_blended" | "archetype_top_three" |
  "archetype_confidence" | "archetype_scores" | "facilitator_review" | "flag_broad_high" | "flag_flat"
> {
  const sums = Object.fromEntries(
    ARCHETYPE_KEYS.map((k) => [k, { total: 0, count: 0 }])
  ) as Record<ArchetypeKey, { total: number; count: number }>;

  for (const item of MODULE_1_ITEMS) {
    const raw = responses[item.id];
    if (typeof raw === "number") {
      // Reverse scoring is a per-item flag (M1-EXP-03), not a special case.
      sums[item.archetype].total += item.reverse ? 6 - raw : raw;
      sums[item.archetype].count += 1;
    }
  }

  const averages = Object.fromEntries(
    Object.entries(sums).map(([k, v]) => [k, v.count > 0 ? v.total / v.count : 0])
  ) as Record<ArchetypeKey, number>;

  const sorted = (Object.entries(averages) as [ArchetypeKey, number][])
    .sort(([, a], [, b]) => b - a);

  const [primary, primaryScore] = sorted[0];
  const [secondary, secondaryScore] = sorted[1];
  const gap = primaryScore - secondaryScore;

  const aboveFour = sorted.filter(([, v]) => v >= 4.0 - EPS).length;
  const allFlat = sorted.every(([, v]) => v >= 2.75 - EPS && v <= 3.50 + EPS);
  const tieCount = sorted.filter(([, v]) => primaryScore - v <= EPS).length;

  // v4: the secondary is shown when the gap is 0.67 or less.
  const secondaryInRange = gap <= 2 * STEP + EPS;

  let facilitator_review = false;
  let confidence: ArchetypeConfidence;
  let archetype_secondary: ArchetypeKey | null = secondaryInRange ? secondary : null;
  let archetype_is_blended = false;
  let archetype_top_three: ArchetypeKey[] | null = null;

  // v4 rules 2 and 3 are flags only: they never decide the result, they sit
  // alongside whatever rules 4 to 7 return and ask a facilitator to look.
  const flag_broad_high = aboveFour >= 5;
  const flag_flat = allFlat;
  if (flag_broad_high || flag_flat) facilitator_review = true;

  // Rule 1: ties keep the existing tie rules.
  if (tieCount >= 4) {
    // Four or more tied: do not output the tied archetypes.
    confidence = "emerging";
    archetype_secondary = null;
    facilitator_review = true;
  } else if (tieCount === 3) {
    confidence = "blended";
    archetype_is_blended = true;
    archetype_top_three = sorted.slice(0, 3).map(([k]) => k);
    facilitator_review = true;
  } else if (tieCount === 2) {
    confidence = "blended";
    archetype_is_blended = true;
  } else if (primaryScore <= 3.0 + EPS) {
    // Rule 4: still taking shape.
    confidence = "low";
    facilitator_review = true;
  } else if (gap <= STEP + EPS) {
    // Rule 5: blended. One answer step apart is not a real difference.
    confidence = "blended";
    archetype_is_blended = true;
  } else if (primaryScore >= 4.0 - EPS && gap >= 2 * STEP - EPS) {
    // Rule 6: clear primary.
    confidence = "high";
  } else {
    // Rule 7: moderate primary.
    confidence = "moderate";
  }

  return {
    archetype_primary: primary,
    archetype_secondary,
    archetype_is_blended,
    archetype_top_three,
    archetype_confidence: confidence,
    archetype_scores: averages,
    facilitator_review,
    flag_broad_high,
    flag_flat,
  };
}

// ─── Module 2 ─────────────────────────────────────────────────────────────────

function scoreModule2(responses: RawResponses): Pick<ScoredOutput,
  "social_energy" | "social_energy_signal" |
  "structure_preference" | "structure_preference_signal" |
  "contribution_mode" | "contribution_mode_signal" |
  "pace" | "pace_signal" | "sustainability_risk"
> {
  const poles: Record<string, string[]> = {
    social_energy: [],
    structure_preference: [],
    contribution_mode: [],
    pace: [],
  };

  for (const scenario of MODULE_2_SCENARIOS) {
    const choice = responses[scenario.id];
    if (choice === "A") poles[scenario.optionA.dimension].push(scenario.optionA.pole);
    else if (choice === "B") poles[scenario.optionB.dimension].push(scenario.optionB.pole);
  }

  function tally(dimension: string): [string, "clear" | "lighter"] {
    const choices = poles[dimension];
    if (!choices || choices.length === 0) {
      throw new Error(`No responses recorded for dimension: ${dimension}`);
    }
    const counts: Record<string, number> = {};
    for (const p of choices) counts[p] = (counts[p] ?? 0) + 1;
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    const winner = sorted[0][0];
    const signal = sorted[0][1] === 3 ? "clear" : "lighter";
    return [winner, signal];
  }

  const [social_energy, social_energy_signal] = tally("social_energy") as ["solo" | "collaborative", "clear" | "lighter"];
  const [structure_preference, structure_preference_signal] = tally("structure_preference") as ["structured" | "adaptive", "clear" | "lighter"];
  const [contribution_mode, contribution_mode_signal] = tally("contribution_mode") as ["front_facing" | "behind_the_scenes", "clear" | "lighter"];
  const [pace, pace_signal] = tally("pace") as ["quick_moving" | "methodical", "clear" | "lighter"];

  const opposingCount = [
    pace === "methodical",
    structure_preference === "structured",
  ].filter(Boolean).length;
  const sustainability_risk = opposingCount >= 2;

  return {
    social_energy, social_energy_signal,
    structure_preference, structure_preference_signal,
    contribution_mode, contribution_mode_signal,
    pace, pace_signal,
    sustainability_risk,
  };
}

// ─── Module 3 ─────────────────────────────────────────────────────────────────

function scoreModule3(responses: RawResponses): Pick<ScoredOutput,
  "self_direction_avg" | "stability_seeking_avg" | "risk_comfort_avg" |
  "pathway_orientation" | "sustainability_note"
> {
  const dims: Record<string, number[]> = {
    self_direction: [],
    stability_seeking: [],
    risk_comfort: [],
  };

  for (const item of MODULE_3_ITEMS) {
    const raw = responses[item.id];
    if (typeof raw === "number") {
      const score = item.reverse ? 6 - raw : raw;
      dims[item.dimension].push(score);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const self_direction_avg = avg(dims.self_direction);
  const stability_seeking_avg = avg(dims.stability_seeking);
  const risk_comfort_avg = avg(dims.risk_comfort);

  const highSDR = self_direction_avg >= 3.5;
  const highSTB = stability_seeking_avg >= 3.5;

  let pathway_orientation: PathwayOrientation;
  if (highSDR && !highSTB) pathway_orientation = "ownership";
  else if (!highSDR && highSTB) pathway_orientation = "placement";
  else if (highSDR && highSTB) pathway_orientation = "blended";
  else pathway_orientation = "exploring";

  const sustainability_note = highSDR && risk_comfort_avg < 3.0;

  return {
    self_direction_avg,
    stability_seeking_avg,
    risk_comfort_avg,
    pathway_orientation,
    sustainability_note,
  };
}

// ─── Combined scorer ──────────────────────────────────────────────────────────

export function scoreAssessment(responses: RawResponses): ScoredOutput {
  return {
    ...scoreModule1(responses),
    ...scoreModule2(responses),
    ...scoreModule3(responses),
  };
}
