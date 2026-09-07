import { describe, it, expect } from "vitest";
import { visibleCourseSlugs } from "./dashboard-visibility";

const programSlugs = ["mass-secplus", "comptia-security", "mass", "forward-deploy", "catalyst-labs"];

describe("visibleCourseSlugs", () => {
  it("shows a learner only what they're enrolled in", () => {
    expect(
      visibleCourseSlugs({
        programSlugs,
        enrolledSlugs: ["mass"],
        assignedSlugs: null,
        isAdmin: false,
        seesWholeProgram: false,
      }),
    ).toEqual(["mass"]);
  });

  it("shows an admin the whole program", () => {
    expect(
      visibleCourseSlugs({
        programSlugs,
        enrolledSlugs: [],
        assignedSlugs: null,
        isAdmin: true,
        seesWholeProgram: true,
      }),
    ).toEqual(programSlugs);
  });

  // The bug: instructors hold access_admin_panel, so isAdmin is true for them.
  // Assignment must still win.
  it("scopes an instructor to assigned tracks even though isAdmin is true", () => {
    expect(
      visibleCourseSlugs({
        programSlugs,
        enrolledSlugs: [],
        assignedSlugs: ["comptia-security"],
        isAdmin: true,
        seesWholeProgram: false,
      }),
    ).toEqual(["comptia-security"]);
  });

  it("includes an instructor's own enrollments alongside what they teach", () => {
    expect(
      visibleCourseSlugs({
        programSlugs,
        enrolledSlugs: ["forward-deploy"],
        assignedSlugs: ["mass"],
        isAdmin: true,
        seesWholeProgram: false,
      }),
    ).toEqual(["mass", "forward-deploy"]);
  });

  it("returns nothing for an instructor assigned to nothing — the empty state", () => {
    expect(
      visibleCourseSlugs({
        programSlugs,
        enrolledSlugs: [],
        assignedSlugs: [],
        isAdmin: true,
        seesWholeProgram: false,
      }),
    ).toEqual([]);
  });

  it("keeps the program's ordering, not the assignment ordering", () => {
    expect(
      visibleCourseSlugs({
        programSlugs,
        enrolledSlugs: [],
        assignedSlugs: ["catalyst-labs", "mass-secplus"],
        isAdmin: true,
        seesWholeProgram: false,
      }),
    ).toEqual(["mass-secplus", "catalyst-labs"]);
  });
});
