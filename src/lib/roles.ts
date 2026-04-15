export type Role = "student" | "instructor" | "admin" | "super_admin";

/** Roles that can access the admin panel */
const ADMIN_PANEL_ROLES: Role[] = ["instructor", "admin", "super_admin"];

/** Roles that can manage students, cohorts, and program settings */
const MANAGEMENT_ROLES: Role[] = ["admin", "super_admin"];

/** Roles that can switch between programs */
const CROSS_PROGRAM_ROLES: Role[] = ["super_admin"];

export function canAccessAdminPanel(role: string): boolean {
  return ADMIN_PANEL_ROLES.includes(role as Role);
}

export function canManageStudents(role: string): boolean {
  return MANAGEMENT_ROLES.includes(role as Role);
}

export function canSwitchPrograms(role: string): boolean {
  return CROSS_PROGRAM_ROLES.includes(role as Role);
}
