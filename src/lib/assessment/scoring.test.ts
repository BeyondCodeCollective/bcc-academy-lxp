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

  // Angel's v4 rule table. Averages of three answers move in steps of 1/3.
  describe("v4 rules", () => {
    it("rule 4: a top score of 3.00 or lower is still taking shape", () => {
      const r = score({ navigator: [3, 3, 3], developer: [2, 2, 2] });
      expect(r.archetype_confidence).toBe("low");
      expect(r.facilitator_review).toBe(true);
    });

    it("rule 5: one step (0.33) apart is blended, with the secondary shown", () => {
      const r = score({ navigator: [5, 4, 4], developer: [4, 4, 4] }); // 4.33 vs 4.00
      expect(r.archetype_confidence).toBe("blended");
      expect(r.archetype_is_blended).toBe(true);
      expect(r.archetype_secondary).toBe("developer");
    });

    it("rule 6: a 4.00+ primary with a gap of 0.67 or more is clear", () => {
      const r = score({ navigator: [5, 4, 4], developer: [4, 3, 3] }); // 4.33 vs 3.33, gap 1.00
      expect(r.archetype_confidence).toBe("high");
      const edge = score({ navigator: [4, 4, 4], developer: [3, 3, 3] }); // 4.00 vs 3.00
      expect(edge.archetype_confidence).toBe("high");
    });

    it("rule 6 boundary: gap of exactly 0.67 with a 4.00+ primary is clear and shows the secondary", () => {
      const r = score({ navigator: [5, 5, 4], developer: [4, 4, 4] }); // 4.67 vs 4.00
      expect(r.archetype_confidence).toBe("high");
      expect(r.archetype_secondary).toBe("developer");
    });

    it("rule 7: a 3.33 primary with a gap of 0.67 or more is moderate", () => {
      const r = score({ navigator: [3, 3, 4] }); // 3.33, others 2.00
      expect(r.archetype_confidence).toBe("moderate");
    });

    it("rule 7: a primary under 4.00 with a 0.67 gap is moderate and shows the secondary", () => {
      const r = score({ navigator: [4, 4, 3], developer: [3, 3, 3] }); // 3.67 vs 3.00
      expect(r.archetype_confidence).toBe("moderate");
      expect(r.archetype_secondary).toBe("developer");
    });

    it("shows no secondary beyond a 0.67 gap", () => {
      const r = score({ navigator: [5, 5, 5], developer: [4, 4, 3] }); // 5.00 vs 3.67, gap 1.33
      expect(r.archetype_secondary).toBeNull();
    });

    it("rule 2: five archetypes at 4.00+ is a flag alongside the result, not the result", () => {
      const r = score({
        navigator: [5, 5, 5], developer: [4, 4, 4], igniter: [4, 4, 4],
        connector: [4, 4, 4], explorer: [4, 4, 2], // EXP-03 is reverse-scored: 2 counts as 4
      });
      expect(r.flag_broad_high).toBe(true);
      expect(r.facilitator_review).toBe(true);
      expect(r.archetype_confidence).not.toBe("broad_high");
      expect(r.archetype_primary).toBe("navigator");
    });

    it("rule 3: all archetypes between 2.75 and 3.50 flags flat and still returns a result", () => {
      const r = score({
        navigator: [4, 3, 3], developer: [3, 3, 3], igniter: [3, 3, 3], connector: [3, 3, 3],
        explorer: [3, 3, 3], culture_keeper: [3, 3, 3], support_specialist: [3, 3, 3],
        systems_thinker: [3, 3, 3], designer: [3, 3, 3],
      }); // top 3.33 and every other 3.00
      expect(r.flag_flat).toBe(true);
      expect(r.facilitator_review).toBe(true);
      expect(r.archetype_confidence).not.toBe("flat");
    });

    it("ties still take precedence over the later rules", () => {
      const r = score({ navigator: [5, 5, 5], developer: [5, 5, 5] });
      expect(r.archetype_confidence).toBe("blended");
      expect(r.archetype_is_blended).toBe(true);
    });
  });
});
