"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getProgramBySlug } from "@/lib/programs";
import { sendSignInEmail } from "@/lib/email";

// Result shape for join attempts:
//   ok            — allowlist check passed AND a magic-link email was sent
//                   via Resend. Show the generic "check your inbox" page.
//   rejected      — allowlist check failed. No magic link minted, no email
//                   sent. The CLIENT should still show the same generic
//                   "check your inbox" message to avoid revealing which
//                   addresses are on the list (no enumeration).
//   fallback      — allowlist check passed, but Resend isn't configured /
//                   the FROM domain isn't verified yet. The CLIENT should
//                   retry via supabase.auth.signInWithOtp so the magic
//                   link still goes out via Supabase's built-in SMTP. The
//                   gate has already run, so this fallback is safe — only
//                   allowlisted emails reach this branch.
//   error         — unexpected failure (DB error, etc). Surface to user.
export type JoinResult =
  | { ok: true }
  | { ok: false; rejected: true }
  | { ok: false; fallback: true }
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
  if (trackSlug) {
    const svcAllow = createServiceClient();
    const { count: allowlistSize, error: countErr } = await svcAllow
      .from("allowed_signup_emails")
      .select("email", { count: "exact", head: true })
      .eq("track_slug", trackSlug);
    if (countErr) {
      console.error("[join] allowlist count failed:", countErr);
      return { ok: false, error: "Couldn't verify your email. Please try again." };
    }
    if ((allowlistSize ?? 0) > 0) {
      const { data: allowed, error: lookupErr } = await svcAllow
        .from("allowed_signup_emails")
        .select("email")
        .eq("track_slug", trackSlug)
        .eq("email", normalised)
        .maybeSingle();
      if (lookupErr) {
        console.error("[join] allowlist lookup failed:", lookupErr);
        return { ok: false, error: "Couldn't verify your email. Please try again." };
      }
      if (!allowed) {
        console.warn("[join] blocked unallowlisted signup", {
          email: normalised,
          programSlug,
          trackSlug,
        });
        return { ok: false, rejected: true };
      }
    }
  }

  // Allowlist passed. Now mint the magic link.
  //
  // Resend path is gated behind LOGIN_VIA_RESEND (same env flag that
  // controls the apex login). When it's off — current state, since
  // mail.bccacademy.io isn't DNS-verified yet — we hand back a fallback
  // signal so the client retries via supabase.auth.signInWithOtp. The
  // gate above has already run, so the fallback is safe.
  if (process.env.LOGIN_VIA_RESEND !== "true") {
    return { ok: false, fallback: true };
  }

  const callbackParams = new URLSearchParams({ join: programSlug });
  if (trackSlug) callbackParams.set("track", trackSlug);
  const redirectTo = `${origin}/auth/callback?${callbackParams}`;

  const svc = createServiceClient();
  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email: normalised,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    console.error("[join] generateLink failed:", error);
    return { ok: false, fallback: true };
  }

  try {
    await sendSignInEmail({
      to: normalised,
      magicLink: data.properties.action_link,
      programName: program.name,
    });
    return { ok: true };
  } catch (emailErr) {
    console.error("[join] sendSignInEmail failed, falling back to OTP:", emailErr);
    return { ok: false, fallback: true };
  }
}
