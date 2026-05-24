export const SUPER_ADMIN_EMAILS = [
  ...(process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
];

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function determineRole(
  email: string,
): "super_admin" | "admin" | "student" {
  const lower = email.toLowerCase();
  if (SUPER_ADMIN_EMAILS.includes(lower)) return "super_admin";
  if (ADMIN_EMAILS.includes(lower)) return "admin";
  return "student";
}

export function isPrivilegedEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return SUPER_ADMIN_EMAILS.includes(lower) || ADMIN_EMAILS.includes(lower);
}

// Internal staff (BGC + BCC employees) get auto-routed to the staff-learn
// program (Lunch & Learns hub) on sign-in. They are NOT admins — they log
// in as regular students and just see internal-only content.
export const STAFF_EMAIL_DOMAINS = (process.env.STAFF_EMAIL_DOMAINS || "wearebgc.org")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const STAFF_EMAILS = (process.env.STAFF_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (STAFF_EMAILS.includes(lower)) return true;
  const domain = lower.split("@")[1];
  return !!domain && STAFF_EMAIL_DOMAINS.includes(domain);
}
