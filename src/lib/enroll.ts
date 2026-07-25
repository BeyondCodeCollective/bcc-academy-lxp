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

  const programSlug = (await resolveHomeProgramSlug(trackSlug)) ?? "catalyst";

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
