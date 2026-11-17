import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LearnerCheckInFlag, LearnerFlagSupport } from "@/lib/mvp/learner-check-ins";
import { LearnerFlagEvidence } from "./learner-flag-evidence";

const at = "2026-12-15T15:30:00Z";
const absence: LearnerFlagSupport = { kind: "verified_absences", count: 2, threshold: 2,
  sessions: [{ weekNumber: 1, sessionNumber: 1, state: "verified_absent" }, { weekNumber: 2, sessionNumber: 3, state: "verified_absent" }] };
function flag(supportingEvidence: LearnerFlagSupport): LearnerCheckInFlag {
  return { id: supportingEvidence.kind, learnerId: "PRIVATE_ID", programId: "p1", courseSlug: "a", ruleId: "INTERNAL_RULE",
    reason: supportingEvidence.kind === "verified_absences" ? "missed_sessions" : supportingEvidence.kind === "overdue_required_submissions" ? "missing_required_submission" : "behind_expected_progress",
    explanation: `Server explanation for ${supportingEvidence.kind}`, detectedAt: at, supportingEvidence,
    evidence: [{ label: "PRIVATE_LABEL", sourceRecordId: "PRIVATE_RECORD", href: "https://private.example.test" }] };
}
function render(flags: LearnerCheckInFlag[], incomplete = false) {
  return renderToStaticMarkup(createElement(LearnerFlagEvidence, { checkIn: {
    attentionFlags: flags, evaluatedAt: at, unevaluatedRuleIds: incomplete ? ["INTERNAL_RULE"] : [],
    unavailableReason: incomplete ? "Requirements unavailable." : null,
  } }));
}
describe("Flag evidence", () => {
  it("shows the server explanation and specific verified absences", () => {
    const html = render([flag(absence)]);
    expect(html).toContain("Server explanation for verified_absences");
    expect(html).toContain("Verified absences: 2 · Flag threshold: 2");
    expect(html).toContain("Week 1 · Session 1 · Verified absent");
    expect(html).toContain("Week 2 · Session 3 · Verified absent");
    expect(html).toContain("10:30 AM EST");
    expect(html).toContain('dateTime="2026-12-15T15:30:00.000Z"');
  });
  it("shows assignment requirements, deadlines, grace period and missing submission", () => {
    const html = render([flag({ kind: "overdue_required_submissions", count: 1, threshold: 1,
      assignments: [{ assignmentId: "PRIVATE_ASSIGNMENT", label: "Portfolio", weekNumber: 3, dueAt: at,
        graceDays: 2, graceEndsAt: "2026-12-17T15:30:00Z", submittedAt: null, state: "none_recorded" }] })]);
    for (const text of ["Portfolio · Week 3", "Overdue required submissions: 1", "2 days", "Grace ends:", "No timestamp recorded", "2026-12-17T15:30:00.000Z"]) expect(html).toContain(text);
    expect(html).not.toContain("PRIVATE_ASSIGNMENT");
  });
  it("shows checkpoint thresholds and each required week's marks without claiming viewing", () => {
    const html = render([flag({ kind: "required_video_checkpoint", dueAt: at, minimumPercent: 75,
      recordedPercent: 50, requiredCount: 2, markedCount: 1,
      weeks: [{ weekNumber: 1, state: "recorded", markedWatchedAt: at }, { weekNumber: 2, state: "none_recorded", markedWatchedAt: null }] })]);
    for (const text of ["75%", "1/2 required weeks (50%)", "Week 1", "Week 2 · No timestamp recorded", "not proof of viewing"]) expect(html).toContain(text);
  });
  it.each([true, false])("does not equate no flags with on-track status (incomplete=%s)", incomplete => {
    const html = render([], incomplete);
    expect(html).toContain("No supported flags recorded");
    expect(html).toContain("does not establish that the learner is on track");
    if (incomplete) expect(html).toContain("Some rules: Not evaluated.");
    else expect(html).not.toContain("Some rules: Not evaluated.");
  });
  it("keeps supported flags visible alongside incomplete evaluation", () => {
    const html = render([flag(absence)], true);
    expect(html).toContain("Verified absences: 2");
    expect(html).toContain("Requirements unavailable.");
    expect(html).toContain("Not evaluated");
  });
  it("never renders internal references or evidence URLs", () => {
    const html = render([flag(absence)], true);
    expect(html).not.toContain("PRIVATE");
    expect(html).not.toContain("INTERNAL_RULE");
    expect(html).not.toContain("href=");
  });
  it("escapes explanation text and does not format invalid timestamps", () => {
    const html = render([{ ...flag(absence), explanation: "<script>alert(1)</script>", detectedAt: "2026-12-15T15:30:00" }]);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Detected: Timestamp unavailable");
  });
});
