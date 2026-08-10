"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { sendSignInEmail } from "@/lib/email";
import { isPrivilegedEmail, isStaffEmail } from "@/lib/auth/admins";

type SendLoginLinkResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Explicit intent (joinTrack, from the page they signed up on) wins over
 * allowlist inference. Otherwise an email that's also on another program's
 * allowlist (e.g. Upskill Bahamas) gets routed there instead of the program
 * they're actually signing up for. Shared by the link and code sign-in paths
 * so both bake identical join/track context into the callback.
 */
async function resolveIntendedJoin(
  joinTrack: string | undefined,
  allowedTracks: string[],
): Promise<{ joinSlug: string | null; trackSlug: string | null; programName: string | null }> {
  const intendedTrack = joinTrack ?? allowedTracks[0];
  if (!intendedTrack) return { joinSlug: null, trackSlug: null, programName: null };

  const { getHomeProgramForTrack } = await import("@/lib/programs");
  const homeProgram = getHomeProgramForTrack(intendedTrack);
  if (homeProgram) {
    return {
      joinSlug: homeProgram.slug,
      trackSlug: intendedTrack,
      programName: homeProgram.name,
    };
  }
  // Course-Builder / dynamic-org tracks have no TS config, so the in-memory
  // lookup misses them — resolve the home program from the DB (same fallback
  // as /dashboard/switch-program).
  const { resolveHomeProgramSlug, fetchDynamicProgram } = await import(
    "@/lib/programs/server"
  );
  const homeSlug = await resolveHomeProgramSlug(intendedTrack);
  if (!homeSlug) return { joinSlug: null, trackSlug: null, programName: null };
  return {
    joinSlug: homeSlug,
    trackSlug: intendedTrack,
    programName: (await fetchDynamicProgram(homeSlug))?.name ?? null,
  };
}

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

  // Admission gate. Track-specific signups (joinTrack, from a landing page)
  // use the join-page semantics — the landing pages absorbed /join, so this is
  // the platform's front door now: a track with NO allowlist is open
  // enrollment; a track WITH one admits only listed emails, and being on some
  // OTHER program's list does not grant access. Generic logins (no joinTrack)
  // admit any allowlisted email so a student who lost their link can still get
  // in. Admins/staff always pass.
  let onAllowlist: boolean;
  if (joinTrack) {
    const { count: trackListSize } = await svc
      .from("allowed_signup_emails")
      .select("email", { count: "exact", head: true })
      .eq("track_slug", joinTrack);
    onAllowlist = (trackListSize ?? 0) === 0 || allowedTracks.includes(joinTrack);
  } else {
    onAllowlist = allowedTracks.length > 0;
  }
  // An existing student can always request a login link for their OWN account,
  // even if their email was never added to allowed_signup_emails (direct admin
  // add, seeding, migration). Scoped to generic logins — track-specific camp
  // signups (joinTrack) stay allowlist-strict so an existing student of one
  // program can't slip into a different camp.
  const isAdmitted = onAllowlist || isPrivileged || (!joinTrack && !!existingStudent);

  if (!isAdmitted) {
    return {
      ok: false,
      // Accepted-by-application students have no invite link — give them a
      // recovery path instead of a dead end (allowlist adds can lag decisions).
      error: "This email isn't on our invite list yet. If you have an invite link from your instructor, use that to sign up. If you applied and were accepted, email info@bccacademy.io with the address you applied with and we'll get you set up.",
    };
  }

  // Resolve the home program + track to bake ?join=<slug>&track=<slug> into the
  // magic link URL. Encoding it in the URL (not just a cookie) means the params
  // survive when the user opens the link in a different browser than the one
  // they submitted the form in — common on mobile (Gmail app → Safari, etc).
  const resolved = await resolveIntendedJoin(joinTrack, allowedTracks);
  callbackJoinSlug = resolved.joinSlug;
  callbackTrackSlug = resolved.trackSlug;
  intendedProgramName = resolved.programName;

  // Build the callback URL with join/track/next baked in when we have them.
  const callbackBase = new URL(redirectTo);
  if (callbackJoinSlug) callbackBase.searchParams.set("join", callbackJoinSlug);
  if (callbackTrackSlug) callbackBase.searchParams.set("track", callbackTrackSlug);
  if (next) callbackBase.searchParams.set("next", next);
  // Bake the intended email so the callback can refuse to fall back to a
  // different account already signed in on this browser.
  callbackBase.searchParams.set("email", trimmed);
  const richRedirectTo = callbackBase.toString();

  // Default ON now that mail.bccacademy.io is verified in Resend — sign-in
  // emails come from the BCC domain. Set LOGIN_VIA_RESEND=false to force the
  // Supabase OTP path. Safe either way: any Resend failure falls through to OTP.
  const tryResend =
    process.env.LOGIN_VIA_RESEND !== "false" && !!process.env.RESEND_API_KEY;

  if (tryResend) {
    const program = await getProgram();
    // Magic links only verify for users that already exist. A first-time
    // signup (allowlisted, no account yet) would make generateLink fail and
    // fall through to Supabase's unreliable built-in OTP email — the link
    // often never arrives. Pre-create the account (idempotent: ignore
    // "already registered"); email_confirm marks it ready so the freshly
    // minted link verifies. Same trick as /invite/<token>.
    await svc.auth.admin
      .createUser({ email: trimmed, email_confirm: true })
      .catch(() => {});
    const { data, error } = await svc.auth.admin.generateLink({
      type: "magiclink",
      email: trimmed,
      options: { redirectTo: richRedirectTo },
    });
    if (!error && data?.properties?.hashed_token) {
      // Build a direct callback URL with token_hash in the query string.
      // Using action_link instead would redirect through Supabase's server,
      // which sends the session back as a #hash fragment — unreadable server-side.
      // Email the /auth/confirm interstitial, not /auth/callback directly:
      // mailbox link scanners (Outlook Safe Links etc.) GET every emailed URL
      // and would consume the one-time token before the student's click. The
      // confirm page auto-forwards real browsers to the callback.
      const callbackUrl = new URL(richRedirectTo);
      callbackUrl.pathname = "/auth/confirm";
      callbackUrl.searchParams.set("token_hash", data.properties.hashed_token);
      callbackUrl.searchParams.set("type", "magiclink");
      try {
        await sendSignInEmail({
          to: trimmed,
          magicLink: callbackUrl.toString(),
          programName: intendedProgramName ?? program.name,
          // Same OTP the link carries, as a typeable 6-digit code. Codes
          // survive everything that kills links (prefetch, scanners, opening
          // on a different device), so the email offers both.
          otpCode: data.properties.email_otp ?? undefined,
        });
        console.log("[login] sign-in email sent via Resend");
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

type VerifyCodeResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/**
 * Sign in with the 6-digit code from the sign-in email. The code is the same
 * OTP the magic link carries, so it works even when the link died in transit
 * (prefetched, scanned, wrapped, or opened on the wrong device). Verification
 * happens on the SSR client so the session cookies are set here; the browser
 * then navigates to /auth/callback?session=1 which runs the exact same
 * enrollment + routing as a clicked link.
 */
export async function verifyLoginCode({
  email,
  code,
  next,
  joinTrack,
}: {
  email: string;
  code: string;
  next?: string;
  joinTrack?: string;
}): Promise<VerifyCodeResult> {
  const trimmed = email.trim().toLowerCase();
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) {
    return { ok: false, error: "Enter the 6-digit code from the email." };
  }

  const anon = await createClient();
  const { error } = await anon.auth.verifyOtp({
    email: trimmed,
    token: digits,
    type: "email",
  });
  if (error) {
    return {
      ok: false,
      error:
        "That code didn't work. Codes expire after an hour and each one only works once — request a new sign-in email to get a fresh code.",
    };
  }

  // Session cookies are set. Hand off to the callback with the same
  // join/track context the emailed link would have carried.
  const svc = createServiceClient();
  const { data: allowRows } = await svc
    .from("allowed_signup_emails")
    .select("track_slug")
    .eq("email", trimmed);
  const resolved = await resolveIntendedJoin(
    joinTrack,
    (allowRows ?? []).map((r) => r.track_slug as string),
  );

  const params = new URLSearchParams({ session: "1", email: trimmed });
  if (resolved.joinSlug) params.set("join", resolved.joinSlug);
  if (resolved.trackSlug) params.set("track", resolved.trackSlug);
  if (next) params.set("next", next);
  return { ok: true, redirectTo: `/auth/callback?${params.toString()}` };
}
