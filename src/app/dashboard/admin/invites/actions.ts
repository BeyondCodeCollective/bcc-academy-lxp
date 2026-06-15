"use server";

import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getHomeProgramForTrack } from "@/lib/programs";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { sendInviteEmail } from "@/lib/email";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type SendInvitesResult = {
  ok: boolean;
  sent?: number;
  failed?: number;
  total?: number;
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
  if (!canSwitchPrograms(ctx?.student?.role ?? "")) {
    return { ok: false, error: "Not authorized" };
  }

  const home = getHomeProgramForTrack(trackSlug);
  const programSlug = home?.slug ?? "catalyst";
  // Prefer the DB-overridden program name (source of truth).
  const programName = (await getProgramWithOverrides(programSlug)).name;

  const svc = createServiceClient();

  // 1) Allowlisted emails for this track.
  const { data: allow } = await svc
    .from("allowed_signup_emails")
    .select("email")
    .eq("track_slug", trackSlug);
  const emails = Array.from(
    new Set(
      (allow ?? [])
        .map((r) => (r.email as string)?.toLowerCase())
        .filter(Boolean),
    ),
  );
  if (emails.length === 0) return { ok: true, sent: 0, failed: 0, total: 0 };

  // 2) Insert one invite row per email; the unique (email, track) index makes
  //    re-runs skip emails that already have an invite.
  const rows = emails.map((email) => ({
    token: randomBytes(24).toString("base64url"),
    email,
    track_slug: trackSlug,
    program_slug: programSlug,
    status: "pending",
  }));
  await svc
    .from("invites")
    .upsert(rows, { onConflict: "email,track_slug", ignoreDuplicates: true });

  // 3) Send everything not already delivered (pending + previously failed).
  const { data: toSend } = await svc
    .from("invites")
    .select("token, email")
    .eq("track_slug", trackSlug)
    .neq("status", "sent");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "bccacademy.io";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  let sent = 0;
  let failed = 0;
  for (const inv of toSend ?? []) {
    const inviteLink = `${origin}/invite/${inv.token}`;
    try {
      await sendInviteEmail({ to: inv.email, inviteLink, programName });
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

  return { ok: true, sent, failed, total: (toSend ?? []).length };
}
