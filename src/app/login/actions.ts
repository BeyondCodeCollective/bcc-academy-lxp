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
  next,
  joinTrack,
}: {
  email: string;
  origin: string;
  next?: string;
  /**
   * Explicit track the user is signing up for, from the page they're on
   * (e.g. the Roblox camp). Wins over allowlist inference so an email that's
   * also on another program's allowlist isn't routed to that program.
   */
  joinTrack?: string;
}): Promise<SendLoginLinkResult> {
  const trimmed = email.trim().toLowerCase();
  const redirectTo = `${origin}/auth/callback`;
  const svc = createServiceClient();

  let callbackJoinSlug: string | null = null;
  let callbackTrackSlug: string | null = null;
  let intendedProgramName: string | null = null;

  const [{ data: allowRows }, { data: existingStudent }] = await Promise.all([
    svc.from("allowed_signup_emails").select("track_slug").eq("email", trimmed),
    svc.from("students").select("role").eq("email", trimmed).maybeSingle(),
  ]);

  const allowedTracks = (allowRows ?? []).map((r) => r.track_slug as string);
  const hasElevatedRole = ["admin", "super_admin", "instructor"].includes(
    existingStudent?.role ?? ""
  );
  const isPrivileged =
    isPrivilegedEmail(trimmed) || isStaffEmail(trimmed) || hasElevatedRole;

  // Admission gate. When signing up for a SPECIFIC track (e.g. the Roblox camp
  // passes joinTrack), the email must be on THAT track's allowlist — being on
  // some other program's list (e.g. Upskill Bahamas) does NOT grant access to
  // this camp. Generic logins (no joinTrack) admit any allowlisted email so a
  // student who lost their link can still get in. Admins/staff always pass.
  const onAllowlist = joinTrack
    ? allowedTracks.includes(joinTrack)
    : allowedTracks.length > 0;
  const isAdmitted = onAllowlist || isPrivileged;

  if (!isAdmitted) {
    return {
      ok: false,
      error: "This email isn't on our invite list. If you have an invite link from your instructor, use that to sign up.",
    };
  }

  // Resolve the home program + track to bake ?join=<slug>&track=<slug> into the
  // magic link URL. Encoding it in the URL (not just a cookie) means the params
  // survive when the user opens the link in a different browser than the one
  // they submitted the form in — common on mobile (Gmail app → Safari, etc).
  //
  // Explicit intent (joinTrack, from the page they signed up on) wins over
  // allowlist inference. Otherwise an email that's also on another program's
  // allowlist (e.g. Upskill Bahamas) gets routed there instead of the program
  // they're actually signing up for (e.g. the Roblox camp).
  const intendedTrack = joinTrack ?? allowedTracks[0];
  if (intendedTrack) {
    const { getHomeProgramForTrack } = await import("@/lib/programs");
    const homeProgram = getHomeProgramForTrack(intendedTrack);
    if (homeProgram) {
      callbackJoinSlug = homeProgram.slug;
      callbackTrackSlug = intendedTrack;
      intendedProgramName = homeProgram.name;
    }
  }

  // Build the callback URL with join/track/next baked in when we have them.
  const callbackBase = new URL(redirectTo);
  if (callbackJoinSlug) callbackBase.searchParams.set("join", callbackJoinSlug);
  if (callbackTrackSlug) callbackBase.searchParams.set("track", callbackTrackSlug);
  if (next) callbackBase.searchParams.set("next", next);
  // Bake the intended email so the callback can refuse to fall back to a
  // different account already signed in on this browser.
  callbackBase.searchParams.set("email", trimmed);
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
          programName: intendedProgramName ?? program.name,
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
