import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LearnerEvidenceContent, LearnerEvidenceDrawer, supportedFlagExplanations, type CourseEvidence } from "./learner-evidence";
import type { DirectoryLearner } from "./learner-directory";

const evidence: CourseEvidence = {
  attendance: [1, 2].map(n => ({ id: `s${n}`, label: `Session ${n}`, heldAt: "2026-10-01T12:00:00Z", reviewedAt: "2026-10-02T12:00:00Z", finalized: true, eligible: true, outcome: "absent" })),
  milestones: [{ id: "m1", week: 1, kind: "submission", required: true, recordedAt: null, dueAt: "2026-10-01T12:00:00Z" }],
  flags: [{ kind: "verified_absences", sessionIds: ["s1", "s2"] }, { kind: "overdue_submission", milestoneId: "m1", evaluatedAt: "2026-10-03T12:00:00Z" }],
};
const learner: DirectoryLearner = { id: "test", firstName: "Test", lastName: "Learner", email: "test@example.test", enrollments: [{ programId: "p1", programName: "Program", courseSlug: "a", courseName: "Course A", cohort: null, attendance: null, status: "needs_check_in", lastActivity: { state: "unavailable", at: null }, evidence }] };
const render = (data = learner) => renderToStaticMarkup(createElement(LearnerEvidenceContent, { learner: data }));

describe("Learner evidence drawer", () => {
  it("renders course-specific history, dates, and supported explanations", () => {
    const html = render();
    expect(html).toContain("Course A");
    expect(html).toContain("Verified absences: Session 1, Session 2.");
    expect(html).toContain("Required submission overdue: Week 1.");
    expect(html).toContain("Verified absent");
    expect(html).toContain('dateTime="2026-10-01T12:00:00.000Z"');
    expect(html).toContain("EDT");
    expect(html).not.toContain("consecutive");
  });
  it("does not derive flags from unrecorded, excused, ineligible, or unfinalized attendance", () => {
    for (const change of [{ outcome: "unknown" as const }, { outcome: "excused" as const }, { eligible: false }, { finalized: false }]) {
      expect(supportedFlagExplanations({ ...evidence, attendance: evidence.attendance!.map(row => ({ ...row, ...change })), flags: [evidence.flags![0]] })).toEqual([]);
    }
    expect(supportedFlagExplanations({ ...evidence, flags: [{ kind: "verified_absences", sessionIds: ["s1", "s1"] }] })).toEqual([]);
    expect(supportedFlagExplanations({ ...evidence, flags: [{ kind: "verified_absences", sessionIds: ["s1", "missing"] }] })).toEqual([]);
  });
  it("does not invent overdue flags from missing timestamps or unsupported requirements", () => {
    expect(supportedFlagExplanations({ ...evidence, flags: null })).toEqual([]);
    for (const change of [{ required: false }, { dueAt: null }, { dueAt: "invalid" }, { dueAt: "2026-11-01T12:00:00Z" }, { recordedAt: "2026-10-01T12:00:00Z" }, { kind: "reflection" as const }]) {
      expect(supportedFlagExplanations({ ...evidence, milestones: evidence.milestones!.map(row => ({ ...row, ...change })), flags: [evidence.flags![1]] })).toEqual([]);
    }
  });
  it("distinguishes unavailable histories from empty histories", () => {
    const data = { ...learner, enrollments: [{ ...learner.enrollments[0], evidence: undefined }] };
    expect(render(data)).toContain("Attendance history unavailable");
    expect(render(data)).toContain("Milestone history unavailable");
    expect(render(data)).toContain("Flag explanations unavailable");
    expect(render({ ...learner, enrollments: [{ ...learner.enrollments[0], evidence: { attendance: [], milestones: [], flags: [] } }] })).toContain("No session records in this scope");
  });
  it("ignores extra private payload fields and renders only metadata", () => {
    const data = { ...learner, enrollments: [{ ...learner.enrollments[0], evidence: { ...evidence,
      milestones: [{ ...evidence.milestones![0], kind: "reflection" as const, recordedAt: "2026-10-02T12:00:00Z", content: "PRIVATE_REFLECTION", submissionText: "PRIVATE_SUBMISSION", url: "https://private.example.test/file" }],
      attendance: evidence.attendance!.map(row => ({ ...row, notes: "PRIVATE_REVIEW_NOTE" })),
    } }] };
    const html = render(data);
    for (const secret of ["PRIVATE_REFLECTION", "PRIVATE_SUBMISSION", "PRIVATE_REVIEW_NOTE", "private.example.test"]) expect(html).not.toContain(secret);
    expect(html).toContain("Reflection");
  });
  it("provides a labeled native modal and explicit Close action", () => {
    const html = renderToStaticMarkup(createElement(LearnerEvidenceDrawer, { learner, onClose: () => {} }));
    expect(html).toContain("<dialog");
    expect(html).toContain("aria-labelledby");
    expect(html).toContain('aria-label="Close learner evidence"');
    expect(html).toContain("right-0");
  });
});
