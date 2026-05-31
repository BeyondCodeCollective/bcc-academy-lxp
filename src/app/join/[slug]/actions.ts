"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProgramBySlug } from "@/lib/programs";
import { sendSignInEmail } from "@/lib/email";

// Result shape for join attempts:
//   ok        — magic-link email sent (Resend path when LOGIN_VIA_RESEND
//               is on, otherwise Supabase OTP server-side). Show the
//               generic "check your inbox" page.
//   rejected  — allowlist check failed. No magic link minted, no email
//               sent. The CLIENT should still show the same generic
//               "check your inbox" message to avoid revealing which
//               addresses are on the list (no enumeration).
//   error     — unexpected failure (DB error, rate-limit, etc). Surface
//               to user with a readable message.
export type JoinResult =
  | { ok: true }
  | { ok: false; rejected: true }
  | { ok: false; error: string };

export async function sendJoinLink({
  email,
  programSlug,
  trackSlug,
  origin,
}: {
  email: string;
  programSlug: string;
  trackSlug: string | null;
  origin: string;
}): Promise<JoinResult> {
  const program = getProgramBySlug(programSlug);
  const normalised = email.trim().toLowerCase();

  // Allowlist gate (per-track). If the target track has any rows in
  // `allowed_signup_emails`, signups are restricted to those addresses.
  // If the track's list is empty, anyone can sign up.
  //
  // Joins without a `?track=` query param (ATG-style auto-enroll into
  // every program track) skip the gate — there's no specific track to
  // check, and a program-wide check would gate every track based on the
  // most restrictive one. Admins should distribute per-track invite
  // links (`/join/<program>?track=<slug>`) when they want gating.
  //
  // Perf: the two queries (overall count + targeted lookup) are fired
  // in parallel via Promise.all. Previously they ran sequentially,
  // which on a Portugal→US-Supabase request stacked two ~250-300ms
  // round-trips before the user saw any feedback. One RTT now.
  if (trackSlug) {
    const svcAllow = createServiceClient();
    const [{ count: allowlistSize, error: countErr }, { data: allowed, error: lookupErr }] = await Promise.all([
      svcAllow
        .from("allowed_signup_emails")
        .select("email", { count: "exact", head: true })
        .eq("track_slug", trackSlug),
      svcAllow
        .from("allowed_signup_emails")
        .select("email")
        .eq("track_slug", trackSlug)
        .eq("email", normalised)
        .maybeSingle(),
    ]);
    if (countErr || lookupErr) {
      console.error("[join] allowlist gate failed:", countErr ?? lookupErr);
      return { ok: false, error: "Couldn't verify your email. Please try again." };
    }
    if ((allowlistSize ?? 0) > 0 && !allowed) {
      console.warn("[join] blocked unallowlisted signup", {
        email: normalised,
        programSlug,
        trackSlug,
      });
      return { ok: false, rejected: true };
    }
  }

  // Allowlist passed. Now send the magic link.
  //
  // Resend path is gated behind LOGIN_VIA_RESEND (same env flag that
  // controls the apex login). When it's off — current state, since
  // mail.bccacademy.io isn't DNS-verified yet — we run signInWithOtp
  // SERVER-SIDE here instead of asking the client to do it. From an EU
  // user that saves one Portugal→Supabase round-trip (now Portugal→
  // Vercel→Supabase server-to-server, which is one round-trip total
  // instead of two stacked).
  if (process.env.LOGIN_VIA_RESEND !== "true") {
    const callbackParams = new URLSearchParams({ join: programSlug });
    if (trackSlug) callbackParams.set("track", trackSlug);
    const callbackUrl = `${origin}/auth/callback?${callbackParams}`;
    const anon = await createClient();
    const { error: otpErr } = await anon.auth.signInWithOtp({
      email: normalised,
      options: { emailRedirectTo: callbackUrl },
    });
    if (otpErr) {
      // Rate-limit and config errors land here; surface the message but
      // never leak whether the email is on the allowlist (the gate
      // already passed by the time we got here, so there's nothing to
      // hide except real config problems).
      console.error("[join] signInWithOtp failed:", otpErr);
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

  const callbackParams = new URLSearchParams({ join: programSlug });
  if (trackSlug) callbackParams.set("track", trackSlug);
  const redirectTo = `${origin}/auth/callback?${callbackParams}`;

  // Resend path. LOGIN_VIA_RESEND=true → mint via admin generateLink and
  // deliver through Resend with the BCC-branded template. If either step
  // fails we fall through to the server-side OTP path below so a single
  // bad config doesn't block everyone.
  const svc = createServiceClient();
  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email: normalised,
    options: { redirectTo },
  });

  if (!error && data?.properties?.hashed_token) {
    // Build a direct callback URL with token_hash in the query string.
    // Using action_link instead would redirect through Supabase's server,
    // which sends the session back as a #hash fragment — unreadable server-side.
    const callbackUrl = new URL(redirectTo);
    callbackUrl.searchParams.set("token_hash", data.properties.hashed_token);
    callbackUrl.searchParams.set("type", "magiclink");
    try {
      await sendSignInEmail({
        to: normalised,
        magicLink: callbackUrl.toString(),
        programName: program.name,
      });
      return { ok: true };
    } catch (emailErr) {
      console.error("[join] sendSignInEmail failed, falling back to OTP:", emailErr);
    }
  } else {
    console.error("[join] generateLink failed, falling back to OTP:", error);
  }

  // Fallback: server-side signInWithOtp. Same end-user experience —
  // Supabase sends the magic link, the auth callback handles the rest.
  const anon = await createClient();
  const { error: otpErr } = await anon.auth.signInWithOtp({
    email: normalised,
    options: { emailRedirectTo: `${origin}/auth/callback?join=${programSlug}${trackSlug ? `&track=${trackSlug}` : ""}` },
  });
  if (otpErr) {
    console.error("[join] OTP fallback failed:", otpErr);
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
