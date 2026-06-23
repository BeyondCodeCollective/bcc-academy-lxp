import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { generateInviteToken } from "@/lib/invite-token";
import { getHomeProgramForTrack } from "@/lib/programs";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { fetchEventbriteOrder } from "@/lib/eventbrite";
import { getLandingByEventbriteId } from "@/lib/landing-pages";
import { sendEventConfirmationEmail } from "@/lib/email";

export type ProcessOrderResult =
  | { ok: true; inviteToken: string; trackSlug: string; slug: string }
  | { ok: false; error: string };

/**
 * Provision a portal account for an Eventbrite registrant and confirm them.
 *
 * Called from BOTH the client claim route (fast path, same session) and the
 * order.placed webhook (reliable backstop). The eventbrite_orders.order_id PK
 * makes it idempotent: whichever lands first does the work + sends the email;
 * the other returns the same invite token without re-emailing.
 *
 *   1. Resolve the order → buyer email + which event they registered for.
 *   2. Map the event → the camp page → its track.
 *   3. Allowlist the email for that track (so any later magic-link login passes).
 *   4. Mint/reuse a DURABLE invite token (/invite/<token> — no expiry).
 *   5. Record the order (idempotency key) and send the confirmation email once.
 */
export async function processEventbriteOrder(
  orderId: string,
  origin: string,
): Promise<ProcessOrderResult> {
  const order = await fetchEventbriteOrder(orderId);
  if (!order) return { ok: false, error: "Could not resolve Eventbrite order" };
  if (!order.email) return { ok: false, error: "Order has no buyer email" };

  const landing = await getLandingByEventbriteId(order.eventId);
  if (!landing?.trackSlug) {
    return { ok: false, error: `No camp page/track mapped to event ${order.eventId}` };
  }
  const { slug, trackSlug } = landing;

  const svc = createServiceClient();

  // Already processed? Return its token without re-emailing (webhook retries,
  // or webhook racing the client claim for the same order).
  const { data: existingOrder } = await svc
    .from("eventbrite_orders")
    .select("invite_token")
    .eq("order_id", order.orderId)
    .maybeSingle();
  if (existingOrder?.invite_token) {
    return { ok: true, inviteToken: existingOrder.invite_token as string, trackSlug, slug };
  }

  const programSlug = getHomeProgramForTrack(trackSlug)?.slug ?? "catalyst";

  // Allowlist so future magic-link logins for this email also pass the track gate.
  await svc
    .from("allowed_signup_emails")
    .upsert(
      { email: order.email, track_slug: trackSlug },
      { onConflict: "email,track_slug", ignoreDuplicates: true },
    );

  // Reuse an existing durable token for this email+track (the cohort tool may
  // have minted one) so the registrant has a single stable door; else mint one.
  const { data: existingInvite } = await svc
    .from("invites")
    .select("token")
    .eq("track_slug", trackSlug)
    .ilike("email", order.email)
    .limit(1)
    .maybeSingle();
  const token = (existingInvite?.token as string | undefined) ?? generateInviteToken();
  if (!existingInvite?.token) {
    await svc.from("invites").insert({
      token,
      email: order.email,
      track_slug: trackSlug,
      program_slug: programSlug,
      status: "sent",
    });
  }

  // Claim the order. The PK insert is the idempotency gate: if a racing call
  // already inserted it, we conflict and skip the email (it was already sent).
  const { error: claimErr } = await svc.from("eventbrite_orders").insert({
    order_id: order.orderId,
    email: order.email,
    track_slug: trackSlug,
    event_id: order.eventId,
    invite_token: token,
  });
  if (claimErr) {
    return { ok: true, inviteToken: token, trackSlug, slug };
  }

  // We won the race — send the one confirmation email.
  const programName = (await getProgramWithOverrides(programSlug)).name;
  try {
    await sendEventConfirmationEmail({
      to: order.email,
      firstName: order.name?.split(" ")[0] ?? "",
      programName,
      eventName: order.eventName ?? programName,
      eventStartUtc: order.eventStartUtc,
      eventEndUtc: order.eventEndUtc,
      eventStartLocal: order.eventStartLocal,
      eventTimezone: order.eventTimezone,
      inviteLink: `${origin}/invite/${token}`,
      origin,
    });
  } catch (e) {
    console.error("[eventbrite-funnel] confirmation email failed", e);
  }

  return { ok: true, inviteToken: token, trackSlug, slug };
}
