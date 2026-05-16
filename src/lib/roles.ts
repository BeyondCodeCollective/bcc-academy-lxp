import { isStaffEmail } from "@/lib/auth/admins";

export type Role = "student" | "instructor" | "admin" | "super_admin";

// Capabilities declare what actions are permitted, independently of the role
// strings that appear in the database. Adding a new restricted action = add
// a capability here and call requireCapability() in the server action.
export type Capability =
  | "access_admin_panel"   // see the admin UI
  | "manage_students"      // add, update, delete students; manage cohorts
  | "switch_programs";     // use the super-admin program switcher

const ROLE_CAPABILITIES: Record<Capability, Role[]> = {
  access_admin_panel: ["instructor", "admin", "super_admin"],
  manage_students:    ["admin", "super_admin"],
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

export function canSwitchPrograms(role: string): boolean {
  return hasCapability(role, "switch_programs");
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
