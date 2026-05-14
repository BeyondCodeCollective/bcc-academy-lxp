export const SUPER_ADMIN_EMAILS = [
  "fonz.morris@wearebgc.org",
  "admin@wearebgc.org",
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
