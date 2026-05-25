"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse a pasted list or CSV blob into a deduped, lowercased list of emails. */
export async function parseEmailList(raw: string): Promise<string[]> {
  const set = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const cells = line.split(",").map((c) => c.trim().toLowerCase());
    const email = cells.find((c) => EMAIL_REGEX.test(c));
    if (email) set.add(email);
  }
  return [...set];
}

export async function getAllowedEmails(
  programSlug: string,
): Promise<{ ok: boolean; emails: string[]; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    return { ok: false, emails: [], error: "Not authorized" };
  }
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("allowed_signup_emails")
    .select("email")
    .eq("program_slug", programSlug)
    .order("email");
  if (error) {
    console.error("[allowlist] getAllowedEmails failed", { programSlug, error });
    return { ok: false, emails: [], error: error.message };
  }
  return { ok: true, emails: (data ?? []).map((r) => r.email) };
}

/**
 * Replace the entire allowlist for a program with the given emails. Atomic
 * delete-then-insert: pasting an empty list clears the allowlist for that
 * program. Returns the count of accepted emails so the UI can confirm.
 */
export async function replaceAllowedEmails(
  programSlug: string,
  rawCsvOrList: string,
): Promise<{ ok: boolean; count: number; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    return { ok: false, count: 0, error: "Not authorized" };
  }
  const emails = await parseEmailList(rawCsvOrList);
  const svc = createServiceClient();

  const { error: deleteErr } = await svc
    .from("allowed_signup_emails")
    .delete()
    .eq("program_slug", programSlug);
  if (deleteErr) {
    console.error("[allowlist] delete failed", { programSlug, error: deleteErr });
    return { ok: false, count: 0, error: deleteErr.message };
  }

  if (emails.length > 0) {
    const rows = emails.map((email) => ({
      email,
      program_slug: programSlug,
      added_by: ctx.userId ?? null,
    }));
    const { error: insertErr } = await svc
      .from("allowed_signup_emails")
      .insert(rows);
    if (insertErr) {
      console.error("[allowlist] insert failed", { programSlug, error: insertErr });
      return { ok: false, count: 0, error: insertErr.message };
    }
  }

  revalidatePath("/dashboard/admin/allowlist");
  return { ok: true, count: emails.length };
}
