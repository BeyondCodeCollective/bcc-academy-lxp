import { describe, expect, it } from "vitest";
import {
  assignableRoles,
  canAccessAdminPanel,
  canAccessStaffContent,
  canAssignRole,
  canManageRoles,
  canManageStudents,
  canSwitchPrograms,
  canViewInsights,
  canViewMvp,
  hasCapability,
} from "./roles";

const roles = ["student", "instructor", "admin", "super_admin"] as const;

describe("capability matrix", () => {
  it.each([
    ["student", [false, false, false, false, false]],
    ["instructor", [true, false, false, false, false]],
    ["admin", [true, true, true, false, true]],
    ["super_admin", [true, true, true, true, true]],
  ])("%s", (role, [panel, manage, insights, switchP, mvp]) => {
    expect(canAccessAdminPanel(role)).toBe(panel);
    expect(canManageStudents(role)).toBe(manage);
    expect(canViewInsights(role)).toBe(insights);
    expect(canSwitchPrograms(role)).toBe(switchP);
    expect(canViewMvp(role)).toBe(mvp);
  });

  it("instructor can facilitate but not manage", () => {
    expect(hasCapability("instructor", "facilitate_cohort")).toBe(true);
    expect(hasCapability("student", "facilitate_cohort")).toBe(false);
  });

  it("unknown, empty and prototype-ish roles get nothing", () => {
    for (const r of ["", "master", "ADMIN", "Admin", "__proto__", "constructor"]) {
      expect(canAccessAdminPanel(r)).toBe(false);
    }
  });
});

describe("master gate", () => {
  it("is email-only and exact", () => {
    expect(canManageRoles("fonz.morris@wearebgc.org")).toBe(true);
    expect(canManageRoles("devin.cooper@wearebgc.org")).toBe(false);
    expect(canManageRoles(null)).toBe(false);
  });
});

describe("role assignment hierarchy", () => {
  it("admin may grant only below admin; super_admin below super_admin; master all", () => {
    expect(assignableRoles("admin", false)).toEqual(["student", "instructor"]);
    expect(assignableRoles("super_admin", false)).toEqual(["student", "instructor", "admin"]);
    expect(assignableRoles("super_admin", true)).toEqual([...roles]);
  });

  it("students and instructors grant nothing", () => {
    expect(assignableRoles("student", false)).toEqual([]);
    expect(assignableRoles("instructor", false)).toEqual([]);
  });

  it("only a master can mint a super_admin", () => {
    expect(canAssignRole("super_admin", false, "student", "super_admin")).toBe(false);
    expect(canAssignRole("super_admin", true, "student", "super_admin")).toBe(true);
  });

  it("cannot touch a peer or someone above, nor invent a role", () => {
    expect(canAssignRole("admin", false, "admin", "student")).toBe(false);
    expect(canAssignRole("admin", false, "super_admin", "student")).toBe(false);
    expect(canAssignRole("admin", false, "student", "instructor")).toBe(true);
    expect(canAssignRole("admin", false, "student", "owner")).toBe(false);
    expect(canAssignRole("admin", false, "mystery", "student")).toBe(false);
  });
});

describe("canAccessStaffContent", () => {
  it("admin-panel roles always pass; others need the staff flag or domain", () => {
    expect(canAccessStaffContent("instructor", "x@example.test")).toBe(true);
    expect(canAccessStaffContent("student", "x@example.test")).toBe(false);
    expect(canAccessStaffContent("student", "x@example.test", true)).toBe(true);
    expect(canAccessStaffContent("student", "x@wearebgc.org")).toBe(true);
  });
});
