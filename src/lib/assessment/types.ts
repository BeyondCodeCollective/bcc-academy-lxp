// src/lib/assessment/types.ts

export type ArchetypeKey =
  | "navigator"
  | "developer"
  | "igniter"
  | "connector"
  | "systems_thinker"
  | "culture_keeper"
  | "designer"
  | "support_specialist"
  | "explorer";

export type ArchetypeConfidence =
  | "high"
  | "moderate"
  | "blended"
  | "low"
  | "broad_high"
  | "flat";

export type WorkStylePole =
  | "solo" | "collaborative"
  | "structured" | "adaptive"
  | "front_facing" | "behind_the_scenes"
  | "quick_moving" | "methodical";

export type SignalStrength = "clear" | "lighter";

export type PathwayOrientation = "ownership" | "placement" | "blended" | "exploring";

export type ScoredOutput = {
  // Module 1
  archetype_primary: ArchetypeKey;
  archetype_secondary: ArchetypeKey | null;
  archetype_is_blended: boolean;
  archetype_confidence: ArchetypeConfidence;
  archetype_scores: Record<ArchetypeKey, number>; // averages — facilitator only
  facilitator_review: boolean;

  // Module 2
  social_energy: "solo" | "collaborative";
  social_energy_signal: SignalStrength;
  structure_preference: "structured" | "adaptive";
  structure_preference_signal: SignalStrength;
  contribution_mode: "front_facing" | "behind_the_scenes";
  contribution_mode_signal: SignalStrength;
  pace: "quick_moving" | "methodical";
  pace_signal: SignalStrength;
  sustainability_risk: boolean;

  // Module 3
  self_direction_avg: number;
  stability_seeking_avg: number;
  risk_comfort_avg: number;
  pathway_orientation: PathwayOrientation;
  sustainability_note: boolean;
};

// Raw responses keyed by item ID (e.g. "M1-NAV-01" → 4, "M2-SOC-01" → "solo")
export type RawResponses = Record<string, number | string>;

export type AssessmentResultRow = {
  id: string;
  student_id: string;
  program_slug: string;
  completed_at: string;
  raw_responses: RawResponses;
  scored_output: ScoredOutput;
  facilitator_viewed_at: string | null;
  created_at: string;
};

export type AssessmentProgressRow = {
  student_id: string;
  current_module: number;
  responses_so_far: RawResponses;
  updated_at: string;
};
