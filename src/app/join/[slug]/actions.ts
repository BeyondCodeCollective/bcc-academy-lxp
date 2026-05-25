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

  // Allowlist gate. When `requireAllowlist` is on, reject any email that
  // doesn't have a row in `allowed_signup_emails` for this program. Admins
  // manage the list at /dashboard/admin/allowlist.
  if (program.requireAllowlist) {
    const svcAllow = createServiceClient();
    const { data: allowed, error: allowErr } = await svcAllow
      .from("allowed_signup_emails")
      .select("email")
      .eq("program_slug", programSlug)
      .eq("email", normalised)
      .maybeSingle();
    if (allowErr) {
      console.error("[join] allowlist lookup failed:", allowErr);
      return { ok: false, error: "Couldn't verify your email. Please try again." };
    }
    if (!allowed) {
      console.warn("[join] blocked unallowlisted signup", {
        email: normalised,
        programSlug,
      });
      return {
        ok: false,
        error:
          "We don't have that email on file. If you should be on the list, contact your program coordinator.",
      };
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
