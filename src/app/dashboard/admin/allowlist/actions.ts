"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";

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
  trackSlug: string,
): Promise<{ ok: boolean; emails: string[]; error?: string }> {
  const ctx = await getSessionContext();
  if (
    !ctx ||
    !canAccessAdminPanel(ctx.student?.role ?? "") ||
    (await isPreviewingAsStudent(ctx.student?.role ?? ""))
  ) {
    return { ok: false, emails: [], error: "Not authorized" };
  }
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("allowed_signup_emails")
    .select("email")
    .eq("track_slug", trackSlug)
    .order("email");
  if (error) {
    console.error("[allowlist] getAllowedEmails failed", { trackSlug, error });
    return { ok: false, emails: [], error: error.message };
  }
  return { ok: true, emails: (data ?? []).map((r) => r.email) };
}

/**
 * Allowlist audience for the bulk-invite UI: how many allowlisted emails still
 * need to sign up (no account yet) vs. have already joined. The "send to
 * everyone" number should reflect `pending`, not the raw list size — re-inviting
 * people who already have accounts is noise.
 */
export async function getAllowlistAudience(
  trackSlug: string,
): Promise<{ ok: boolean; pending: number; joined: number; total: number; error?: string }> {
  const ctx = await getSessionContext();
  if (
    !ctx ||
    !canAccessAdminPanel(ctx.student?.role ?? "") ||
    (await isPreviewingAsStudent(ctx.student?.role ?? ""))
  ) {
    return { ok: false, pending: 0, joined: 0, total: 0, error: "Not authorized" };
  }
  const svc = createServiceClient();
  const [{ data: allow }, { data: accts }] = await Promise.all([
    svc.from("allowed_signup_emails").select("email").eq("track_slug", trackSlug),
    svc.from("students").select("email"),
  ]);
  const haveAccount = new Set(
    (accts ?? []).map((r) => (r.email as string)?.toLowerCase()).filter(Boolean),
  );
  const emails = [
    ...new Set(
      (allow ?? []).map((r) => (r.email as string)?.toLowerCase()).filter(Boolean),
    ),
  ];
  const joined = emails.filter((e) => haveAccount.has(e)).length;
  return { ok: true, pending: emails.length - joined, joined, total: emails.length };
}

/**
 * Replace the entire allowlist for one track with the given emails. Atomic
 * delete-then-insert: saving an empty list clears the allowlist for that
 * track. Returns the count of accepted emails so the UI can confirm.
 */
export async function replaceAllowedEmails(
  trackSlug: string,
  rawCsvOrList: string,
): Promise<{ ok: boolean; count: number; error?: string }> {
  const ctx = await getSessionContext();
  if (
    !ctx ||
    !canAccessAdminPanel(ctx.student?.role ?? "") ||
    (await isPreviewingAsStudent(ctx.student?.role ?? ""))
  ) {
    return { ok: false, count: 0, error: "Not authorized" };
  }
  const emails = await parseEmailList(rawCsvOrList);
  const svc = createServiceClient();

  const { error: deleteErr } = await svc
    .from("allowed_signup_emails")
    .delete()
    .eq("track_slug", trackSlug);
  if (deleteErr) {
    console.error("[allowlist] delete failed", { trackSlug, error: deleteErr });
    return { ok: false, count: 0, error: deleteErr.message };
  }

  if (emails.length > 0) {
    const rows = emails.map((email) => ({
      email,
      track_slug: trackSlug,
      added_by: ctx.userId ?? null,
    }));
    const { error: insertErr } = await svc
      .from("allowed_signup_emails")
      .insert(rows);
    if (insertErr) {
      console.error("[allowlist] insert failed", { trackSlug, error: insertErr });
      return { ok: false, count: 0, error: insertErr.message };
    }
  }

  revalidatePath("/dashboard/admin/allowlist");
  return { ok: true, count: emails.length };
}

/**
 * Remove a single email from the allowlist (and clear any not-yet-used invites)
 * for the given courses. Used by the People hub's Pending list to take someone
 * off before they've created an account.
 */
export async function removePendingPerson(
  email: string,
  trackSlugs: string[],
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getSessionContext();
  if (
    !ctx ||
    !canAccessAdminPanel(ctx.student?.role ?? "") ||
    (await isPreviewingAsStudent(ctx.student?.role ?? ""))
  ) {
    return { ok: false, error: "Not authorized" };
  }
  const e = email.trim().toLowerCase();
  if (!e || trackSlugs.length === 0) return { ok: false, error: "Nothing to remove" };
  const svc = createServiceClient();

  const [allowErr, inviteErr] = await Promise.all([
    svc
      .from("allowed_signup_emails")
      .delete()
      .eq("email", e)
      .in("track_slug", trackSlugs)
      .then((r) => r.error),
    // Clear the invite regardless of used_at. The Pending list already excludes
    // anyone with a student account, so a row here = no account; a stale "used"
    // invite (clicked but never finished signup) must be removable too — that's
    // exactly the kind the admin wants to clear off the list.
    svc
      .from("invites")
      .delete()
      .eq("email", e)
      .in("track_slug", trackSlugs)
      .then((r) => r.error),
  ]);
  if (allowErr || inviteErr) {
    console.error("[allowlist] removePendingPerson failed", { email: e, allowErr, inviteErr });
    return { ok: false, error: (allowErr ?? inviteErr)!.message };
  }

  revalidatePath("/dashboard/admin");
  return { ok: true };
}
