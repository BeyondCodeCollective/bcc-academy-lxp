import { describe, expect, it, vi } from "vitest";
import { currentEvidenceResult, type EvidenceResult } from "./learner-evidence-response";
import { EMPTY_LEARNER_FILTERS as filters } from "./learner-filters";
import { startLearnerRequest } from "./learner-request";

function ready(id: string): Extract<EvidenceResult, { state: "ready" }> {
  return { state: "ready", evidence: { id, asOf: "2026-11-06T12:00:00Z", enrollments: [{
    programId: "p1", programName: "One", courseSlug: "a", courseName: "A", status: "needs_check_in",
    attendanceUnavailableReason: null, attendanceSessions: [], weeklyMilestones: [],
    checkIn: { evaluatedAt: "2026-11-06T12:00:00Z", unavailableReason: null, unevaluatedRuleIds: [], attentionFlags: [{
      id: "flag", learnerId: id, programId: "p1", courseSlug: "a", reason: "missed_sessions", ruleId: "rule",
      explanation: "Two absences", detectedAt: "2026-11-06T12:00:00Z", evidence: [],
      supportingEvidence: { kind: "verified_absences", count: 2, threshold: 2, sessions: [
        { weekNumber: 1, sessionNumber: 1, state: "verified_absent" }, { weekNumber: 2, sessionNumber: 1, state: "verified_absent" },
      ] },
    }] },
  }] } };
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
function deferred() {
  let resolve!: (result: EvidenceResult) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<EvidenceResult>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("Selected learner evidence isolation", () => {
  it("rejects evidence that no longer matches the selected status", () => {
    expect(currentEvidenceResult({ key: "current", result: ready("a") }, "current", "a", { ...filters, status: "on_track" })).toEqual({ state: "unavailable" });
  });
  it.each(["success", "error"])("ignores a late scope %s after changing scope and returning", async outcome => {
    const first = deferred(); const other = deferred(); const reopened = deferred();
    const show = vi.fn(); const fail = vi.fn();
    const stopFirst = startLearnerRequest(() => first.promise, show, fail);
    await flush(); stopFirst();
    const stopOther = startLearnerRequest(() => other.promise, show, fail);
    await flush(); stopOther();
    startLearnerRequest(() => reopened.promise, show, fail);
    if (outcome === "success") first.resolve(ready("a")); else first.reject(new Error("old scope"));
    other.resolve({ state: "unavailable" }); await flush();
    expect(show).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
    reopened.resolve(ready("a")); await flush();
    expect(show).toHaveBeenCalledExactlyOnceWith(ready("a"));
  });
  it("treats an empty enrollment response as unavailable, not a ready empty result", () => {
    const result = ready("a");
    result.evidence.enrollments = [];
    expect(currentEvidenceResult({ key: "current", result }, "current", "a", filters)).toEqual({ state: "unavailable" });
  });
  it.each(["error", "unavailable"] as const)("retry hides %s and accepts only the new attempt for the same learner and scope", state => {
    const key = JSON.stringify(["a", filters, 0]);
    const retryKey = JSON.stringify(["a", filters, 1]);
    expect(currentEvidenceResult({ key, result: { state } }, retryKey, "a", filters)).toBeNull();
    const result = ready("a");
    expect(currentEvidenceResult({ key, result }, retryKey, "a", filters)).toBeNull();
    expect(currentEvidenceResult({ key: retryKey, result }, retryKey, "a", filters)).toBe(result);
  });
  it.each(["ready", "error", "unavailable"] as const)("hides stale %s immediately when the request changes", state => {
    const result = state === "ready" ? ready("a") : { state };
    expect(currentEvidenceResult({ key: "old", result }, "new", "b", filters)).toBeNull();
  });
  it("allows only the requested learner and scope", () => {
    const result = ready("a");
    const response = { key: "current", result };
    expect(currentEvidenceResult(response, "current", "a", filters)).toBe(result);
    expect(currentEvidenceResult(response, "current", "b", filters)).toEqual({ state: "unavailable" });
    expect(currentEvidenceResult(response, "current", "a", { ...filters, programId: "p2" })).toEqual({ state: "unavailable" });
    expect(currentEvidenceResult(response, "current", "a", { ...filters, courseSlug: "other" })).toEqual({ state: "unavailable" });
  });
  it.each(["learnerId", "programId", "courseSlug"] as const)("rejects a mismatched flag %s without partial evidence", field => {
    const result = ready("a");
    result.evidence.enrollments[0].checkIn.attentionFlags[0][field] = "other";
    expect(currentEvidenceResult({ key: "current", result }, "current", "a", filters)).toEqual({ state: "unavailable" });
  });
  it.each(["success", "error"])("ignores learner A's late %s after switching to B", async outcome => {
    const a = deferred(); const b = deferred(); const show = vi.fn(); const fail = vi.fn();
    const stopA = startLearnerRequest(() => a.promise, show, fail);
    await flush(); stopA();
    startLearnerRequest(() => b.promise, show, fail);
    b.resolve(ready("b")); await flush();
    if (outcome === "success") a.resolve(ready("a")); else a.reject(new Error("late A"));
    await flush();
    expect(show.mock.calls).toEqual([[ready("b")]]);
    expect(fail).not.toHaveBeenCalled();
  });
  it("does not reuse an earlier A response after A → B → A", async () => {
    const oldA = deferred(); const b = deferred(); const freshA = deferred(); const show = vi.fn(); const fail = vi.fn();
    const stopA = startLearnerRequest(() => oldA.promise, show, fail);
    await flush(); stopA();
    const stopB = startLearnerRequest(() => b.promise, show, fail);
    await flush(); stopB();
    startLearnerRequest(() => freshA.promise, show, fail);
    oldA.resolve(ready("a")); b.resolve(ready("b")); await flush();
    expect(show).not.toHaveBeenCalled();
    freshA.resolve(ready("a")); await flush();
    expect(show).toHaveBeenCalledExactlyOnceWith(ready("a"));
  });
  it("drops in-flight evidence when the drawer closes", async () => {
    const pending = deferred(); const show = vi.fn(); const fail = vi.fn();
    const close = startLearnerRequest(() => pending.promise, show, fail);
    await flush(); close(); pending.resolve(ready("a")); await flush();
    expect(show).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });
});
