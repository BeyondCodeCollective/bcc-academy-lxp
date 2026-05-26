"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { sendSignInEmail } from "@/lib/email";

// Result types — the central login form uses `fallback: true` as a signal to
// retry via supabase.auth.signInWithOtp (the legacy path) when the Resend
// path can't deliver. Once mail.bccacademy.io is DNS-verified in Resend, the
// fallback path becomes unreachable and we can remove it.
type SendLoginLinkResult =
  | { ok: true }
  | { ok: false; fallback: true; reason: string }
  | { ok: false; fallback: false; error: string };

/**
 * Send a magic-link sign-in email via Resend (branded "BCC Academy" template).
 * Mirrors `sendJoinLink` from /join/[slug]/actions.ts but with no join intent
 * cookies or `?join=` params — the apex login is for existing accounts only.
 *
 * Falls back to client-side `signInWithOtp` (Supabase built-in SMTP) when:
 * - RESEND_API_KEY is unset, or
 * - generateLink fails (admin API error), or
 * - sendSignInEmail throws (Resend domain not verified, rate limit, etc).
 *
 * Every failure path logs to Vercel runtime logs so we can see which sender
 * is actually delivering and what's going wrong if a user reports no email.
 */
export async function sendLoginLink({
  email,
  origin,
}: {
  email: string;
  origin: string;
}): Promise<SendLoginLinkResult> {
  const trimmed = email.trim().toLowerCase();

  // Feature gate: only attempt the Resend path when explicitly enabled.
  // Without this, generateLink runs first and consumes Supabase's per-email
  // rate-limit slot — then if sendSignInEmail throws (e.g. Resend FROM domain
  // not yet verified), the client-side OTP fallback hits the 60-second
  // cooldown on the user's first try. Flip LOGIN_VIA_RESEND=true once
  // mail.bccacademy.io is verified in Resend and the path is reliable.
  if (process.env.LOGIN_VIA_RESEND !== "true") {
    return {
      ok: false,
      fallback: true,
      reason: "LOGIN_VIA_RESEND not enabled",
    };
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("[login] RESEND_API_KEY not set — falling back to OTP", {
      email: trimmed,
    });
    return { ok: false, fallback: true, reason: "RESEND_API_KEY not set" };
  }

  const program = await getProgram();
  const redirectTo = `${origin}/auth/callback`;
  const svc = createServiceClient();

  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email: trimmed,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    console.error("[login] generateLink failed — falling back to OTP", {
      email: trimmed,
      error: error?.message,
    });
    return {
      ok: false,
      fallback: true,
      reason: error?.message ?? "generateLink returned no link",
    };
  }

  try {
    await sendSignInEmail({
      to: trimmed,
      magicLink: data.properties.action_link,
      programName: program.name,
    });
    console.log("[login] sign-in email sent via Resend", { email: trimmed });
    return { ok: true };
  } catch (emailErr) {
    const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.error("[login] sendSignInEmail failed — falling back to OTP", {
      email: trimmed,
      error: msg,
    });
    return { ok: false, fallback: true, reason: msg };
  }
}
