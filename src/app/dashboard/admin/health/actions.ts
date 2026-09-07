"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isMasterEmail } from "@/lib/auth/admins";
import type { SentinelFix, SentinelRow } from "@/lib/sentinel/checks";
import { applyFix, type FixResult } from "@/lib/sentinel/apply-fix";
import { logAdminAccess } from "../actions-shared";

// Applies a Sentinel one-click fix. Master-only, mirroring the page gate.
// Every fix is a single reversible row operation; the params come from the
// client, so each kind re-validates against the DB before writing.

export type { FixResult };

async function requireMaster(): Promise<{ id: string; email: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!isMasterEmail(user.email)) throw new Error("Not authorized");
  return { id: user.id, email: user.email ?? null };
}

export async function applySentinelFixAction(fix: SentinelFix): Promise<FixResult> {
  const user = await requireMaster();
  const svc = createServiceClient();

  // The write itself lives in src/lib/sentinel/apply-fix.ts so this path and
  // the nightly auto-fix path share one set of refusal guards.
  const result = await applyFix(svc, fix);

  if (result.success) {
    // The fix path had no audit trail at all. Who repaired what, and when, is
    // the first question asked when a row changes and nobody remembers why.
    logAdminAccess(svc, {
      actorUserId: user.id,
      programId: null,
      action: "apply_fix",
      resource: `sentinel:${fix.kind}`,
      metadata: { label: fix.label, detail: result.detail, by: user.email },
    });
    revalidatePath("/dashboard/admin/health", "page");
  }
  return result;
}

// ─── Dismissals ──────────────────────────────────────────────────────────────
// "Acknowledged, won't fix." Recorded against the row's stable key so a moving
// count in the label can't silently un-dismiss it, and scoped to that row alone
// so a new row under the same check still surfaces.

export async function dismissFindingRowsAction(
  check: string,
  rows: SentinelRow[],
): Promise<FixResult> {
  const user = await requireMaster();
  if (rows.length === 0) return { success: false, error: "Nothing to dismiss." };
  const svc = createServiceClient();
  const { error } = await svc.from("sentinel_dismissals").upsert(
    rows.map((r) => ({
      check_name: check,
      row_key: r.key,
      row_label: r.label,
      dismissed_by: user.id,
      dismissed_by_email: user.email,
    })),
    { onConflict: "check_name,row_key", ignoreDuplicates: true },
  );
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/admin/health", "page");
  return {
    success: true,
    detail: `${rows.length} item${rows.length === 1 ? "" : "s"} dismissed.`,
  };
}

export async function restoreDismissalAction(
  check: string,
  rowKey: string,
): Promise<FixResult> {
  await requireMaster();
  const svc = createServiceClient();
  const { error } = await svc
    .from("sentinel_dismissals")
    .delete()
    .eq("check_name", check)
    .eq("row_key", rowKey);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/admin/health", "page");
  return { success: true, detail: "Restored." };
}
