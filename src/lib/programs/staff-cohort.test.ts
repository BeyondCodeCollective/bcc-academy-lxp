import { describe, expect, it } from "vitest";
import { isCourseLearner } from "@/lib/analytics/engagement";
import { isLearnerOnCourse } from "./staff-cohort";

const student = { role: "student", is_staff: false, is_test: false };
const staff = { role: "student", is_staff: true, is_test: false };
const admin = { role: "admin", is_staff: true, is_test: false };
const test = { role: "student", is_staff: false, is_test: true };

describe("staff cohort learner rule", () => {
  const cohorts = new Set(["field-ready-staff-cohort"]);
  it("normal course: only real students count", () => {
    expect([student, staff, admin, test].map((p) => isLearnerOnCourse(p, "mass", cohorts))).toEqual([true, false, false, false]);
    expect([student, staff, admin, test].map((p) => isCourseLearner(p, { staffCohort: false }))).toEqual([true, false, false, false]);
  });
  it("staff cohort: everyone but test logins counts", () => {
    expect([student, staff, admin, test].map((p) => isLearnerOnCourse(p, "field-ready-staff-cohort", cohorts))).toEqual([true, true, true, false]);
    expect([student, staff, admin, test].map((p) => isCourseLearner(p, { staffCohort: true }))).toEqual([true, true, true, false]);
  });
});
