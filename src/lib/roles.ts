import { isStaffEmail, isMasterEmail } from "@/lib/auth/admins";

export type Role = "student" | "instructor" | "admin" | "super_admin";

// Capabilities declare what actions are permitted, independently of the role
// strings that appear in the database. Adding a new restricted action = add
// a capability here and call requireCapability() in the server action.
export type Capability =
  | "access_admin_panel"   // see the admin UI
  | "manage_students"      // add, update, delete students; manage cohorts
  | "view_insights"        // see the Survey Insights dashboard (scoped to own program for admins)
  | "switch_programs";     // use the super-admin program switcher

const ROLE_CAPABILITIES: Record<Capability, Role[]> = {
  access_admin_panel: ["instructor", "admin", "super_admin"],
  manage_students:    ["admin", "super_admin"],
  view_insights:      ["admin", "super_admin"],
  switch_programs:    ["super_admin"],
};

export function hasCapability(role: string, capability: Capability): boolean {
  return ROLE_CAPABILITIES[capability].includes(role as Role);
}

// Convenience aliases kept for call sites that already use the old names.
// New code should call hasCapability() directly.
export function canAccessAdminPanel(role: string): boolean {
  return hasCapability(role, "access_admin_panel");
}

export function canManageStudents(role: string): boolean {
  return hasCapability(role, "manage_students");
}

export function canViewInsights(role: string): boolean {
  return hasCapability(role, "view_insights");
}

export function canSwitchPrograms(role: string): boolean {
  return hasCapability(role, "switch_programs");
}

// Role/credential management — the "master" tier ONLY (the platform owner).
// This is the one rung above super_admin: the power to change another person's
// role or revoke an admin/super-admin. Gated by EMAIL (see isMasterEmail), not a
// DB role, so it can never be self-granted by editing the students table and no
// super-admin holds it. Reserve every future "change someone's role" surface
// behind this — super-admins manage learners; only a master manages super-admins.
export function canManageRoles(email: string | null | undefined): boolean {
  return isMasterEmail(email);
}

// Lunch & Learns access. Internal-only content: staff (BGC/BCC employees) and
// anyone with admin panel access. Staff are NOT admins — they're regular
// students whose email matches the staff allowlist (src/lib/auth/admins.ts).
export function canAccessStaffContent(
  role: string,
  email: string | null | undefined,
): boolean {
  if (hasCapability(role, "access_admin_panel")) return true;
  return isStaffEmail(email);
}
