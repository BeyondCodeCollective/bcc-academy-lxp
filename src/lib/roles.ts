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

// The ladder is CUMULATIVE: every tier holds everything the tier below it does,
// plus more. It didn't used to be — super_admin lacked manage_students, so
// "promoting" an admin to super_admin silently took away their ability to
// manage people, and a higher rank could do less. The master (email-gated
// owner) sits above all of them and bypasses every capability check.
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

// ── Role assignment (who may grant which role) ──────────────────────────────
// Tier ordering. `master` is NOT a DB role — it's email-gated (canManageRoles)
// and outranks everything; a master may grant up to super_admin.
export const ROLE_RANK: Record<Role, number> = {
  student: 0,
  instructor: 1,
  admin: 2,
  super_admin: 3,
};

const ASSIGNABLE_DB_ROLES: Role[] = ["student", "instructor", "admin", "super_admin"];

// The roles an actor may grant to OTHER people. Rule: only a tier strictly below
// your own — except a master, who may also grant super_admin (the only one who
// can). Instructors/students manage no roles.
export function assignableRoles(actorRole: string, isMaster: boolean): Role[] {
  if (isMaster) return [...ASSIGNABLE_DB_ROLES];
  if (!hasCapability(actorRole, "manage_students")) return []; // admin+ only
  const rank = ROLE_RANK[actorRole as Role] ?? 0;
  return ASSIGNABLE_DB_ROLES.filter((r) => ROLE_RANK[r] < rank);
}

// Full guard for a single role change. Validates: it's a real role, the actor is
// allowed to grant it, and the actor isn't modifying someone already at or above
// their own tier (a master outranks all DB roles). Self-changes are blocked by
// the caller (it needs the acting user's own id).
export function canAssignRole(
  actorRole: string,
  isMaster: boolean,
  targetCurrentRole: string,
  newRole: string,
): boolean {
  if (!ASSIGNABLE_DB_ROLES.includes(newRole as Role)) return false;
  if (!assignableRoles(actorRole, isMaster).includes(newRole as Role)) return false;
  if (isMaster) return true;
  const actorRank = ROLE_RANK[actorRole as Role] ?? -1;
  const targetRank = ROLE_RANK[targetCurrentRole as Role] ?? 99;
  return targetRank < actorRank; // can't touch a peer or anyone above you
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
