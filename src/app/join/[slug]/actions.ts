"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getProgramBySlug } from "@/lib/programs";
import { sendSignInEmail } from "@/lib/email";

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
}): Promise<{ ok: boolean; error?: string }> {
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
        return {
          ok: false,
          error:
            "We don't have that email on file. If you should be on the list, contact your program coordinator.",
        };
      }
    }
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
    return { ok: false, error: "Couldn't send the link. Please try again." };
  }

  try {
    await sendSignInEmail({
      to: normalised,
      magicLink: data.properties.action_link,
      programName: program.name,
    });
  } catch (emailErr) {
    console.error("[join] sendSignInEmail failed:", emailErr);
    return { ok: false, error: "Couldn't send the link. Please try again." };
  }

  return { ok: true };
}
