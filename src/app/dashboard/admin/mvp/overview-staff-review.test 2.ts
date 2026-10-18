import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OverviewStaffReview } from "./mvp-components/overview-staff-review";
import type { MvpCourseStaffReview } from "@/lib/mvp/staff-review";

// Synthetic aggregates test presentation without adding learner records.
const course: MvpCourseStaffReview = {
  id: "course-a", programId: "program-a", programName: "Program A", courseName: "Course A",
  courseSlug: "course-a", cohortId: "fall", cohortName: "Fall cohort", verifiedLearnerCount: 2,
  evaluationComplete: true, reasons: [{ reason: "missed_sessions", learnerCount: 2 }],
};
function render(courses: MvpCourseStaffReview[], incompleteCourseCount = 0) {
  return renderToStaticMarkup(createElement(OverviewStaffReview, { data: {
    courses, flaggedCourses: courses, coursesWithVerifiedFlags: courses.length, incompleteCourseCount,
  } }));
}

describe("Overview staff review", () => {
  it("highlights real course flags and distinguishes unique programs from courses", () => {
    const html = render([course, { ...course, id: "course-b", courseName: "Course B" }]);
    expect(html).toContain("1 program · 2 flagged courses");
    expect(html).toContain("Attention");
    expect(html).toContain("text-[#1448CC]");
    expect(html).toContain("border-l-amber-500");
    expect(html).toContain("Fall cohort · Course A");
    expect(html).toContain("2 learners with two or more confirmed missed sessions");
    expect(html).not.toContain("consecutive");
    expect(html).not.toContain("J. Rivera");
  });
  it("shows every supported reason without inventing thresholds", () => {
    const html = render([{ ...course, reasons: [
      { reason: "missing_required_submission", learnerCount: 1 },
      { reason: "low_assessment", learnerCount: 2 },
      { reason: "behind_expected_progress", learnerCount: 1 },
    ] }]);
    expect(html).toContain("1 learner with required work missing after the grace period");
    expect(html).toContain("2 learners below the configured assessment threshold");
    expect(html).toContain("1 learner below the configured progress threshold after its deadline");
  });
  it("keeps known flags visible alongside incomplete evaluations", () => {
    const html = render([{ ...course, evaluationComplete: false }], 1);
    expect(html).toContain("2 learners flagged");
    expect(html).toContain("Evaluation incomplete for 1 course");
  });
  it("does not confuse no flags with unavailable data", () => {
    const empty = render([]);
    expect(empty).toContain("No verified flags in this selection");
    expect(empty).not.toContain("Attention");
    const unavailable = renderToStaticMarkup(createElement(OverviewStaffReview, { data: undefined }));
    expect(unavailable).toContain("Staff review unavailable");
    expect(unavailable).not.toContain("No verified flags");
  });
});
