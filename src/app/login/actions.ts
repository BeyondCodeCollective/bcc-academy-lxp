"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { sendSignInEmail } from "@/lib/email";
import { isPrivilegedEmail, isStaffEmail } from "@/lib/auth/admins";

type SendLoginLinkResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Send a magic-link sign-in email.
 *
 *   1. Email is on the allowlist → send the magic link; the auth
 *      callback's allowlist inference routes them to the right program.
 *   2. Email is privileged (admin/staff) → send the magic link.
 *   3. Email is unknown → return an error immediately; no link sent.
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

  const { data: allowlistHit } = await svc
    .from("allowed_signup_emails")
    .select("track_slug")
    .eq("email", trimmed)
    .maybeSingle();

  const isAdmitted =
    !!allowlistHit ||
    isPrivilegedEmail(trimmed) ||
    isStaffEmail(trimmed);

  if (!isAdmitted) {
    return {
      ok: false,
      error: "This email isn't on our invite list. If you have an invite link from your instructor, use that to sign up.",
    };
  }

  // Resolve the user's home program and track from the allowlist so we can
  // bake ?join=<slug>&track=<slug> directly into the magic link URL.
  // Encoding it in the URL (not just a cookie) means the params survive when
  // the user opens the link in a different browser than the one they submitted
  // the form in — which happens constantly on mobile (Gmail app → Safari, etc).
  let callbackJoinSlug: string | null = null;
  let callbackTrackSlug: string | null = null;
  if (allowlistHit?.track_slug) {
    const { getHomeProgramForTrack } = await import("@/lib/programs");
    const homeProgram = getHomeProgramForTrack(allowlistHit.track_slug as string);
    if (homeProgram) {
      callbackJoinSlug = homeProgram.slug;
      callbackTrackSlug = allowlistHit.track_slug as string;
    }
  }

  // Build the callback URL with join/track baked in when we have them.
  const callbackBase = new URL(redirectTo);
  if (callbackJoinSlug) callbackBase.searchParams.set("join", callbackJoinSlug);
  if (callbackTrackSlug) callbackBase.searchParams.set("track", callbackTrackSlug);
  const richRedirectTo = callbackBase.toString();

  const tryResend =
    process.env.LOGIN_VIA_RESEND === "true" && !!process.env.RESEND_API_KEY;

  if (tryResend) {
    const program = await getProgram();
    const { data, error } = await svc.auth.admin.generateLink({
      type: "magiclink",
      email: trimmed,
      options: { redirectTo: richRedirectTo },
    });
    if (!error && data?.properties?.hashed_token) {
      // Build a direct callback URL with token_hash in the query string.
      // Using action_link instead would redirect through Supabase's server,
      // which sends the session back as a #hash fragment — unreadable server-side.
      const callbackUrl = new URL(richRedirectTo);
      callbackUrl.searchParams.set("token_hash", data.properties.hashed_token);
      callbackUrl.searchParams.set("type", "magiclink");
      try {
        await sendSignInEmail({
          to: trimmed,
          magicLink: callbackUrl.toString(),
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
    options: { emailRedirectTo: richRedirectTo },
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
