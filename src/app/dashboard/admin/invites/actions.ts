"use server";

import { headers } from "next/headers";
import { generateInviteToken } from "@/lib/invite-token";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";
import { resolveHomeProgramSlug } from "@/lib/programs/server";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { sendInviteEmail } from "@/lib/email";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type SendInvitesResult = {
  ok: boolean;
  sent?: number;
  failed?: number;
  total?: number;
  remaining?: number;
  error?: string;
};

/**
 * Generate + send one-click invites to every allowlisted email for a track.
 * Idempotent: re-running only sends rows that aren't already 'sent' (new
 * emails + previous failures), so you can safely click "Retry failed".
 * Paced at ~2/sec to respect Resend's rate limit.
 */
export async function sendCohortInvites(
  trackSlug: string,
): Promise<SendInvitesResult> {
  const ctx = await getSessionContext();
  if (
    !canSwitchPrograms(ctx?.student?.role ?? "") ||
    (await isPreviewingAsStudent(ctx?.student?.role ?? ""))
  ) {
    return { ok: false, error: "Not authorized" };
  }

  // Builder courses live under any program (their home is on track_overrides);
  // the old blanket-Catalyst fallback branded their invites as Catalyst.
  const programSlug = (await resolveHomeProgramSlug(trackSlug)) ?? "catalyst";
  // Prefer the DB-overridden program name (source of truth).
  const programName = (await getProgramWithOverrides(programSlug)).name;

  const svc = createServiceClient();

  // 1) Allowlisted emails for this track, minus anyone who already has an
  //    account — they're enrolled, so re-inviting them is noise.
  const [{ data: allow }, { data: accts }] = await Promise.all([
    svc.from("allowed_signup_emails").select("email").eq("track_slug", trackSlug),
    svc.from("students").select("email"),
  ]);
  const haveAccount = new Set(
    (accts ?? []).map((r) => (r.email as string)?.toLowerCase()).filter(Boolean),
  );
  const emails = Array.from(
    new Set(
      (allow ?? [])
        .map((r) => (r.email as string)?.toLowerCase())
        .filter(Boolean),
    ),
  ).filter((email) => !haveAccount.has(email));
  if (emails.length === 0) return { ok: true, sent: 0, failed: 0, total: 0 };

  // 2) Insert one invite row per email that doesn't already have one for this
  //    track. Explicit dedup rather than ON CONFLICT — the unique index is on
  //    lower(email) (an expression), which ON CONFLICT column lists can't
  //    target, so an upsert would error and silently insert nothing.
  const { data: existingRows } = await svc
    .from("invites")
    .select("email")
    .eq("track_slug", trackSlug);
  const existing = new Set(
    (existingRows ?? []).map((r) => (r.email as string).toLowerCase()),
  );
  const newRows = emails
    .filter((email) => !existing.has(email))
    .map((email) => ({
      token: generateInviteToken(),
      email,
      track_slug: trackSlug,
      program_slug: programSlug,
      status: "pending",
    }));
  if (newRows.length > 0) {
    const { error: insErr } = await svc.from("invites").insert(newRows);
    if (insErr) return { ok: false, error: `Could not create invites: ${insErr.message}` };
  }

  // 3) Send everything not already delivered (pending + previously failed),
  //    skipping any invite whose email has since created an account.
  const { data: toSendRaw } = await svc
    .from("invites")
    .select("token, email")
    .eq("track_slug", trackSlug)
    .neq("status", "sent");
  const toSend = (toSendRaw ?? []).filter(
    (inv) => !haveAccount.has((inv.email as string)?.toLowerCase()),
  );

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "bccacademy.io";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  // Send within a time budget so we never hit the function timeout mid-blast.
  // Anything not reached stays pending and is picked up on the next click
  // (idempotent resume) — so a large cohort can't fail halfway.
  const startedAt = Date.now();
  const BUDGET_MS = 220_000; // well under the 300s route maxDuration
  const queued = toSend ?? [];
  let sent = 0;
  let failed = 0;
  let processed = 0;
  for (const inv of queued) {
    if (Date.now() - startedAt > BUDGET_MS) break;
    processed++;
    const inviteLink = `${origin}/invite/${inv.token}`;
    try {
      await sendInviteEmail({ to: inv.email, inviteLink, programName, programSlug });
      await svc
        .from("invites")
        .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
        .eq("token", inv.token);
      sent++;
    } catch (e) {
      await svc
        .from("invites")
        .update({ status: "failed", error: e instanceof Error ? e.message : String(e) })
        .eq("token", inv.token);
      failed++;
    }
    await sleep(550); // ~2 emails/sec (Resend rate limit)
  }

  const remaining = queued.length - processed;
  return { ok: true, sent, failed, total: queued.length, remaining };
}

/**
 * Send ONE invite to a single address — for previewing the live email without
 * blasting the cohort. Reuses an existing token for the email+track or mints a
 * fresh one, then sends just that message. Re-sendable (ignores 'sent' status)
 * so you can preview repeatedly.
 */
export async function sendTestInvite(
  trackSlug: string,
  rawEmail: string,
): Promise<SendInvitesResult> {
  const ctx = await getSessionContext();
  if (
    !canSwitchPrograms(ctx?.student?.role ?? "") ||
    (await isPreviewingAsStudent(ctx?.student?.role ?? ""))
  ) {
    return { ok: false, error: "Not authorized" };
  }
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@") || /\s/.test(email)) {
    return { ok: false, error: "Enter a valid email address" };
  }

  // Builder courses live under any program (their home is on track_overrides);
  // the old blanket-Catalyst fallback branded their invites as Catalyst.
  const programSlug = (await resolveHomeProgramSlug(trackSlug)) ?? "catalyst";
  const programName = (await getProgramWithOverrides(programSlug)).name;

  const svc = createServiceClient();

  const { data: existing } = await svc
    .from("invites")
    .select("token")
    .eq("track_slug", trackSlug)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  let token = existing?.token as string | undefined;
  if (!token) {
    token = generateInviteToken();
    const { error: insErr } = await svc.from("invites").insert({
      token,
      email,
      track_slug: trackSlug,
      program_slug: programSlug,
      status: "pending",
    });
    if (insErr) return { ok: false, error: `Could not create invite: ${insErr.message}` };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "bccacademy.io";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const inviteLink = `${proto}://${host}/invite/${token}`;

  try {
    await sendInviteEmail({ to: email, inviteLink, programName, programSlug });
    await svc
      .from("invites")
      .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
      .eq("token", token);
    return { ok: true, sent: 1, failed: 0, total: 1 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
