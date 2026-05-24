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

  const callbackParams = new URLSearchParams({ join: programSlug });
  if (trackSlug) callbackParams.set("track", trackSlug);
  const redirectTo = `${origin}/auth/callback?${callbackParams}`;

  const svc = createServiceClient();
  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email: email.trim().toLowerCase(),
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    console.error("[join] generateLink failed:", error);
    return { ok: false, error: "Couldn't send the link. Please try again." };
  }

  try {
    await sendSignInEmail({
      to: email.trim().toLowerCase(),
      magicLink: data.properties.action_link,
      programName: program.name,
    });
  } catch (emailErr) {
    console.error("[join] sendSignInEmail failed:", emailErr);
    return { ok: false, error: "Couldn't send the link. Please try again." };
  }

  return { ok: true };
}
