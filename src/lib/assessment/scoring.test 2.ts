import { describe, it, expect } from "vitest";
import { scoreAssessment } from "./scoring";
import { MODULE_1_ITEMS, MODULE_2_SCENARIOS, MODULE_3_ITEMS } from "./content";
import type { ArchetypeKey, RawResponses } from "./types";

// Builds a full response set. `m1` maps an archetype to its three item scores
// (in item order); archetypes not listed score 2 on every item.
function responses(m1: Partial<Record<ArchetypeKey, [number, number, number]>>): RawResponses {
  const out: RawResponses = {};
  const seen: Record<string, number> = {};
  for (const item of MODULE_1_ITEMS) {
    const i = (seen[item.archetype] = (seen[item.archetype] ?? -1) + 1);
    out[item.id] = m1[item.archetype]?.[i] ?? 2;
  }
  for (const s of MODULE_2_SCENARIOS) out[s.id] = "A";
  for (const i of MODULE_3_ITEMS) out[i.id] = 3;
  return out;
}

const score = (m1: Parameters<typeof responses>[0]) => scoreAssessment(responses(m1));

describe("Module 1 (v0.4)", () => {
  it("has 9 archetypes with 3 items each, and only EXP-03 reversed", () => {
    expect(MODULE_1_ITEMS).toHaveLength(27);
    const counts: Record<string, number> = {};
    for (const i of MODULE_1_ITEMS) counts[i.archetype] = (counts[i.archetype] ?? 0) + 1;
    expect(Object.keys(counts)).toHaveLength(9);
    expect(Object.values(counts).every((n) => n === 3)).toBe(true);
    expect(MODULE_1_ITEMS.filter((i) => i.reverse).map((i) => i.id)).toEqual(["M1-EXP-03"]);
  });

  it("reverse-scores EXP-03 (1 counts as 5)", () => {
    const r = score({ explorer: [5, 5, 1] });
    expect(r.archetype_scores.explorer).toBe(5);
    expect(r.archetype_primary).toBe("explorer");
  });

  it("high confidence with no secondary when the lead is clear", () => {
    const r = score({ navigator: [5, 5, 5] });
    expect(r.archetype_primary).toBe("navigator");
    expect(r.archetype_confidence).toBe("high");
    expect(r.archetype_secondary).toBeNull();
  });

  it("two-way tie is blended with both archetypes", () => {
    const r = score({ navigator: [5, 5, 4], developer: [5, 5, 4] });
    expect(r.archetype_confidence).toBe("blended");
    expect(r.archetype_is_blended).toBe(true);
    expect(r.archetype_secondary).not.toBeNull();
  });

  it("three-way tie outputs the top three and flags review", () => {
    const r = score({ navigator: [5, 4, 4], developer: [5, 4, 4], igniter: [5, 4, 4] });
    expect(r.archetype_top_three).toHaveLength(3);
    expect(r.facilitator_review).toBe(true);
  });

  it("four-way tie is 'emerging' and names no archetype pair", () => {
    const r = score({ navigator: [4, 4, 4], developer: [4, 4, 4], igniter: [4, 4, 4], connector: [4, 4, 4] });
    expect(r.archetype_confidence).toBe("emerging");
    expect(r.archetype_secondary).toBeNull();
    expect(r.archetype_top_three).toBeNull();
    expect(r.facilitator_review).toBe(true);
  });

  it("reports the secondary only within 0.50 of the primary", () => {
    const near = score({ navigator: [5, 4, 4], developer: [4, 4, 4] }); // 4.33 vs 4.00, gap 0.33
    expect(near.archetype_confidence).toBe("moderate");
    expect(near.archetype_secondary).toBe("developer");
    const far = score({ navigator: [5, 5, 5], developer: [4, 4, 3] }); // gap 1.33
    expect(far.archetype_secondary).toBeNull();
  });

  it("calls a 3.25 to 3.49 primary with a gap above 0.25 moderate", () => {
    const r = score({ navigator: [3, 3, 4] }); // 3.33, others 2.00
    expect(r.archetype_confidence).toBe("moderate");
  });

  it("flags a top average under 3.25 as low", () => {
    const r = score({ navigator: [3, 3, 3], developer: [2, 2, 2] });
    expect(["low", "flat"]).toContain(r.archetype_confidence);
  });
});
