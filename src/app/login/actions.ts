"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { sendSignInEmail } from "@/lib/email";

type SendLoginLinkResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Send a magic-link sign-in email. Always finishes the round-trip
 * server-side so the browser only makes one request — critical for
 * users on slow / distant connections where multiple Supabase hops
 * stack up. Mirrors `sendJoinLink` from /join/[slug]/actions.ts.
 *
 * Path:
 *   1. If LOGIN_VIA_RESEND=true and RESEND_API_KEY is set → admin
 *      generateLink + Resend branded email. Returns ok on success.
 *   2. Otherwise / on any failure → server-side signInWithOtp via the
 *      anon client (Supabase sends the email).
 *
 * The browser does NOT need to call Supabase directly anymore. Removes
 * the third hop from EU/Bahamas → us-west-2 that was causing /login to
 * stall on "Sending..." for cellular users.
 */
export async function sendLoginLink({
  email,
  origin,
}: {
  email: string;
  origin: string;
}): Promise<SendLoginLinkResult> {
  const trimmed = email.trim().toLowerCase();
  const redirectTo = `${origin}/auth/callback`;

  const tryResend =
    process.env.LOGIN_VIA_RESEND === "true" && !!process.env.RESEND_API_KEY;

  if (tryResend) {
    const program = await getProgram();
    const svc = createServiceClient();
    const { data, error } = await svc.auth.admin.generateLink({
      type: "magiclink",
      email: trimmed,
      options: { redirectTo },
    });
    if (!error && data?.properties?.action_link) {
      try {
        await sendSignInEmail({
          to: trimmed,
          magicLink: data.properties.action_link,
          programName: program.name,
        });
        console.log("[login] sign-in email sent via Resend", { email: trimmed });
        return { ok: true };
      } catch (emailErr) {
        console.error("[login] sendSignInEmail failed — falling through to OTP", {
          email: trimmed,
          error: emailErr instanceof Error ? emailErr.message : String(emailErr),
        });
      }
    } else {
      console.error("[login] generateLink failed — falling through to OTP", {
        email: trimmed,
        error: error?.message,
      });
    }
  }

  // Server-side OTP fallback. Browser → Vercel (one short hop) →
  // Supabase (server-to-server). Replaces the previous client-side
  // direct call which added an extra long-haul RTT for distant users.
  const anon = await createClient();
  const { error: otpErr } = await anon.auth.signInWithOtp({
    email: trimmed,
    options: { emailRedirectTo: redirectTo },
  });

  if (otpErr) {
    console.error("[login] OTP send failed", {
      email: trimmed,
      error: otpErr.message,
    });
    const rateLimited = /security purposes|only request this after/i.test(
      otpErr.message ?? "",
    );
    return {
      ok: false,
      error: rateLimited
        ? "We just sent a sign-in link to this email. Check your inbox — and your spam folder. Try again in a minute if it doesn't arrive."
        : otpErr.message || "Couldn't send the link. Please try again.",
    };
  }

  return { ok: true };
}
