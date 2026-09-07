import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { generateInviteToken } from "@/lib/invite-token";
import { resolveHomeProgramSlug } from "@/lib/programs/server";

export type EnrollResult = {
  /** Durable /invite/<token> door for this email + track. */
  inviteToken: string;
  programSlug: string;
  /** True the first time this email is allowlisted+invited for the track. */
  isNew: boolean;
};

/**
 * Allowlist an email for a track and mint (or reuse) its durable invite token.
 *
 * This is the shared core of the enrollment funnel — the same steps
 * processEventbriteOrder runs, minus the Eventbrite-order idempotency. Callers
 * own their own idempotency (eventbrite_orders / landing_signups) and their own
 * confirmation email, so this stays side-effect-light and reusable.
 */
export async function enrollEmailInTrack(
  email: string,
  trackSlug: string,
): Promise<EnrollResult> {
  const svc = createServiceClient();
  const normalized = email.trim().toLowerCase();

  // No blanket Catalyst fallback. Catalyst is a program like every other, not
  // the bucket unattached things fall into: a course that resolves to no
  // program is a data problem, and quietly stamping it Catalyst is how another
  // program's people ended up filed under Catalyst.
  // Throwing rather than returning: the only caller wraps this in a try/catch
  // that logs and shows a retry message, so a course with no program surfaces
  // as an error in the logs instead of a learner quietly filed under the wrong
  // org — which is unrecoverable once the invite has gone out.
  const programSlug = await resolveHomeProgramSlug(trackSlug);
  if (!programSlug) {
    throw new Error(`Course "${trackSlug}" is not attached to a program.`);
  }

  // Allowlist so future magic-link logins for this email pass the track gate.
  await svc
    .from("allowed_signup_emails")
    .upsert(
      { email: normalized, track_slug: trackSlug },
      { onConflict: "email,track_slug", ignoreDuplicates: true },
    );

  // Reuse an existing durable token for this email+track so the learner has a
  // single stable door; otherwise mint one.
  const { data: existingInvite } = await svc
    .from("invites")
    .select("token")
    .eq("track_slug", trackSlug)
    .ilike("email", normalized)
    .limit(1)
    .maybeSingle();

  const token = (existingInvite?.token as string | undefined) ?? generateInviteToken();
  const isNew = !existingInvite?.token;
  if (isNew) {
    await svc.from("invites").insert({
      token,
      email: normalized,
      track_slug: trackSlug,
      program_slug: programSlug,
      status: "sent",
    });
  }

  return { inviteToken: token, programSlug, isNew };
}
