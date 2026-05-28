"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { getHomeProgramForTrack } from "@/lib/programs";
import { sendSignInEmail } from "@/lib/email";

type SendLoginLinkResult =
  | { ok: true }
  | { ok: true; redirect: string }
  | { ok: false; error: string };

/**
 * Send a magic-link sign-in email. Three outcomes:
 *
 *   1. Email belongs to an existing student → send the magic link
 *      (Resend if configured, server-side OTP fallback otherwise) and
 *      return ok.
 *   2. Email is NOT yet a student BUT is on the allowlist for a track
 *      → return ok with a redirect to that track's /join page. The
 *      form bounces the browser there so the user starts the right
 *      signup flow instead of dead-ending on a magic link that lands
 *      them in the wrong program (which is what dropped Micalejohn
 *      into Catalyst on May 27).
 *   3. Email is unknown to both tables → still send the link (Supabase
 *      will deliver it; the auth callback rejects unadmitted users).
 *      Same wording as success so we don't enumerate accounts.
 *
 * Always runs server-side end-to-end so the browser only makes one
 * short hop, not three transcontinental ones.
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
  const svc = createServiceClient();

  // Existing-student check + allowlist check in parallel. Both are
  // single-row Supabase reads; total time = max of the two, not sum.
  const [existingStudent, allowlistHit] = await Promise.all([
    svc.from("students").select("id").eq("email", trimmed).maybeSingle(),
    svc
      .from("allowed_signup_emails")
      .select("track_slug")
      .eq("email", trimmed)
      .maybeSingle(),
  ]);

  // Brand-new email that's on an allowlist → route to /join. Skip
  // when the student row already exists (returning user) — they need
  // a magic link, not a re-signup flow.
  if (!existingStudent.data && allowlistHit.data?.track_slug) {
    const trackSlug = allowlistHit.data.track_slug as string;
    const homeProgram = getHomeProgramForTrack(trackSlug);
    if (homeProgram) {
      return {
        ok: true,
        redirect: `/join/${homeProgram.slug}?track=${trackSlug}`,
      };
    }
  }

  const tryResend =
    process.env.LOGIN_VIA_RESEND === "true" && !!process.env.RESEND_API_KEY;

  if (tryResend) {
    const program = await getProgram();
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

  // Server-side OTP fallback.
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
