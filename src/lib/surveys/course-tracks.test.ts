import { describe, expect, it } from "vitest";
import { surveyCourseTracks } from "./platform";

describe("surveyCourseTracks", () => {
  it("names the course a course instrument belongs to", () => {
    expect(surveyCourseTracks("field-ready-staff-pre")).toEqual(["field-ready-staff-cohort"]);
    expect(surveyCourseTracks("field-ready-staff-post")).toEqual(["field-ready-staff-cohort"]);
  });

  it("returns null for platform-wide forms", () => {
    expect(surveyCourseTracks("bcc-learner-intake")).toBeNull();
    expect(surveyCourseTracks("no-such-survey")).toBeNull();
  });
});
