"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "./actions-shared";
import { isStaffEmail } from "@/lib/auth/admins";

// Staff list = the admin-managed allowlist that designates staff on mixed
// domains (e.g. specific @wearebcc.org employees), where the auto-staff domain
// (@wearebgc.org) can't decide because real students also use @wearebcc.org.
// Adding/removing an email also syncs students.is_staff for any existing
// account, so the change takes effect without waiting for a re-login.

export type StaffEmailRow = { email: string; created_at: string };

export async function listStaffEmails(): Promise<StaffEmailRow[]> {
  const { svc } = await requireSuperAdmin();
  const { data, error } = await svc
    .from("staff_emails")
    .select("email, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listStaffEmails error:", error.message);
    return [];
  }
  return (data ?? []) as StaffEmailRow[];
}

export async function addStaffEmail(
  emailRaw: string,
): Promise<{ ok: boolean; error?: string }> {
  const { svc, userId } = await requireSuperAdmin();
  const email = emailRaw.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const { error } = await svc
    .from("staff_emails")
    .upsert({ email, added_by: userId }, { onConflict: "email", ignoreDuplicates: true });
  if (error) return { ok: false, error: error.message };

  // Flip any existing account to staff now (excludes them from learner surfaces
  // and routes them to Lunch & Learns) rather than waiting for their next login.
  // Move a plain-student account under Black Girls Code, where L&L live, so they
  // land in the right context — leave admins/instructors' program untouched.
  const { data: bgc } = await svc.from("programs").select("id").eq("slug", "bgc").maybeSingle();
  await svc.from("students").update({ is_staff: true }).eq("email", email);
  if (bgc?.id) {
    await svc.from("students").update({ program_id: bgc.id }).eq("email", email).eq("role", "student");
  }

  revalidatePath("/dashboard/admin");
  return { ok: true };
}

export async function removeStaffEmail(
  emailRaw: string,
): Promise<{ ok: boolean; error?: string }> {
  const { svc } = await requireSuperAdmin();
  const email = emailRaw.trim().toLowerCase();

  const { error } = await svc.from("staff_emails").delete().eq("email", email);
  if (error) return { ok: false, error: error.message };

  // Recompute is_staff from what's left: still staff only if the auto-staff
  // domain covers them (e.g. @wearebgc.org). A removed @wearebcc.org staffer
  // reverts to a normal account.
  await svc.from("students").update({ is_staff: isStaffEmail(email) }).eq("email", email);

  revalidatePath("/dashboard/admin");
  return { ok: true };
}
