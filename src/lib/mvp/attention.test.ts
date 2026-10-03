import { describe, expect, it } from "vitest";
import { evaluateMvpAttention, type MvpAttentionRule } from "./attention";

// Synthetic observations distinguish an evidence-backed flag from unknown
// data. The missed-session threshold matches the framework's two sessions.
const rules: MvpAttentionRule[] = [{ id: "missed-v1", reason: "missed_sessions", threshold: 2 }];
const evidence = [{ label: "Verified absence record", sourceRecordId: "absence-1", href: null }];
const at = new Date("2026-10-01T18:00:00Z");
describe("MVP check-in rules", () => {
  it("flags two confirmed missed sessions with evidence", () => {
    const result = evaluateMvpAttention("a", "course", rules, { missed_sessions: { value: 2, evidence } }, at);
    expect(result.checkInStatus).toBe("flagged");
    expect(result.attentionFlags[0].evidence).toEqual(evidence);
  });
  it("keeps missing observations unevaluated", () => {
    expect(evaluateMvpAttention("a", "course", rules, {}, at).checkInStatus).toBe("not_evaluated");
  });
  it("requires evidence before publishing a flag", () => {
    expect(evaluateMvpAttention("a", "course", rules, { missed_sessions: { value: 2, evidence: [] } }, at).checkInStatus).toBe("not_evaluated");
  });
  it("accepts a known zero without inventing a flag", () => {
    expect(evaluateMvpAttention("a", "course", rules, { missed_sessions: { value: 0, evidence: [] } }, at).checkInStatus).toBe("no_flags");
  });
  it("does not invent rules when no configuration exists", () => {
    expect(evaluateMvpAttention("a", "course", [], {}, at).checkInStatus).toBe("not_evaluated");
  });
  it("uses the supplied assessment threshold and preserves its boundary", () => {
    const assessment: MvpAttentionRule[] = [{ id: "assessment-v1", reason: "low_assessment", threshold: 65 }];
    expect(evaluateMvpAttention("a", "course", assessment, { low_assessment: { value: 65, evidence } }, at).checkInStatus).toBe("no_flags");
    expect(evaluateMvpAttention("a", "course", assessment, { low_assessment: { value: 64, evidence } }, at).checkInStatus).toBe("flagged");
  });
  it("rejects invalid count thresholds", () => {
    expect(() => evaluateMvpAttention("a", "course", [{ ...rules[0], threshold: 0 }], {}, at)).toThrow();
  });
});
