import { createServiceClient } from "@/lib/supabase/server";
import { isStaffEmail } from "./admins";

/**
 * Is this email a staff account? Two sources, unioned:
 *  1. `isStaffEmail` — the auto-staff domain (@wearebgc.org) + STAFF_EMAILS env.
 *  2. The `staff_emails` DB allowlist — admin-managed, for staff on mixed domains
 *     (e.g. specific @wearebcc.org employees) where the domain can't decide,
 *     because real students (Ramon) also use @wearebcc.org.
 *
 * Persisted onto `students.is_staff` at signup/heal so gates and learner-metric
 * queries can read the flag instead of re-checking the email everywhere.
 */
export async function resolveIsStaff(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  if (isStaffEmail(email)) return true;
  const { data } = await createServiceClient()
    .from("staff_emails")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return !!data;
}

/**
 * Sync staff check for request-time gates: the persisted `students.is_staff`
 * flag (covers DB-listed staff), with the auto-staff domain as a fallback for
 * any row not yet backfilled. No DB round-trip.
 */
export function isStaffResolved(
  isStaff: boolean | null | undefined,
  email: string | null | undefined,
): boolean {
  return !!isStaff || isStaffEmail(email);
}
