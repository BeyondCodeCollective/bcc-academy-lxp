// src/lib/assessment/scoring.ts

import type { ArchetypeKey, ScoredOutput, RawResponses, ArchetypeConfidence, PathwayOrientation } from "./types";
import { MODULE_1_ITEMS, MODULE_2_SCENARIOS, MODULE_3_ITEMS } from "./content";

// ─── Module 1 ─────────────────────────────────────────────────────────────────

function scoreModule1(responses: RawResponses): Pick<ScoredOutput,
  "archetype_primary" | "archetype_secondary" | "archetype_is_blended" |
  "archetype_confidence" | "archetype_scores" | "facilitator_review"
> {
  const sums: Record<ArchetypeKey, { total: number; count: number }> = {
    navigator: { total: 0, count: 0 },
    developer: { total: 0, count: 0 },
    igniter: { total: 0, count: 0 },
    connector: { total: 0, count: 0 },
    systems_thinker: { total: 0, count: 0 },
    culture_keeper: { total: 0, count: 0 },
    designer: { total: 0, count: 0 },
    support_specialist: { total: 0, count: 0 },
    explorer: { total: 0, count: 0 },
  };

  for (const item of MODULE_1_ITEMS) {
    const raw = responses[item.id];
    if (typeof raw === "number") {
      sums[item.archetype].total += raw;
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

  let facilitator_review = false;
  let confidence: ArchetypeConfidence;
  let archetype_secondary: ArchetypeKey | null = null;
  let archetype_is_blended = false;

  const aboveFour = sorted.filter(([, v]) => v >= 4.0).length;
  const allFlat = sorted.every(([, v]) => v >= 2.75 && v <= 3.50);
  const tieCount = sorted.filter(([, v]) => v === primaryScore).length;

  if (tieCount >= 4) {
    confidence = "flat";
    facilitator_review = true;
  } else if (tieCount === 3) {
    confidence = "flat";
    facilitator_review = true;
  } else if (tieCount === 2) {
    confidence = "blended";
    archetype_secondary = secondary;
    archetype_is_blended = true;
  } else if (aboveFour >= 5) {
    confidence = "broad_high";
    facilitator_review = true;
  } else if (allFlat) {
    confidence = "flat";
    facilitator_review = true;
  } else if (primaryScore < 3.25) {
    confidence = "low";
    facilitator_review = true;
  } else if (gap <= 0.25) {
    confidence = "blended";
    archetype_secondary = secondary;
    archetype_is_blended = true;
  } else if (primaryScore >= 4.0 && gap >= 0.50) {
    confidence = "high";
    if (gap <= 0.50) {
      archetype_secondary = secondary;
    }
  } else if (primaryScore >= 3.50 && gap > 0.25 && gap < 0.50) {
    confidence = "moderate";
    archetype_secondary = secondary;
  } else {
    confidence = "moderate";
    if (gap <= 0.50) archetype_secondary = secondary;
  }

  return {
    archetype_primary: primary,
    archetype_secondary,
    archetype_is_blended,
    archetype_confidence: confidence,
    archetype_scores: averages,
    facilitator_review,
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
