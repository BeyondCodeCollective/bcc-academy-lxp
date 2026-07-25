"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { enrollEmailInTrack } from "@/lib/enroll";
import { getLandingPage } from "@/lib/landing-pages";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { sendEventConfirmationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EnrollActionResult = { ok: true } | { ok: false; error: string };

/**
 * Native course enrollment from a /bcc/[slug] page — the no-Eventbrite path.
 *
 * Signing up allowlists the email for the page's track, mints a durable invite,
 * and emails a magic access link. Idempotent on (slug, email): a repeat submit
 * re-sends the same link rather than double-enrolling.
 */
export async function enrollInCourse(input: {
  slug: string;
  name: string;
  email: string;
  sessionId?: string | null;
  origin: string;
}): Promise<EnrollActionResult> {
  const email = (input.email ?? "").trim().toLowerCase();
  const name = (input.name ?? "").trim().slice(0, 200);

  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const page = await getLandingPage(input.slug);
  if (!page || !page.nativeEnroll || !page.trackSlug) {
    return { ok: false, error: "This course isn't open for signup right now." };
  }

  // A page may require choosing one of its sessions.
  const session = page.sessions.find((s) => s.id === input.sessionId) ?? null;
  if (page.sessions.length > 0 && !session) {
    return { ok: false, error: "Please choose a date." };
  }

  try {
    const svc = createServiceClient();

    // Idempotency: if this email already signed up for this page, re-send the
    // same invite link instead of enrolling again.
    const { data: existing } = await svc
      .from("landing_signups")
      .select("invite_token")
      .eq("slug", input.slug)
      .eq("email", email)
      .maybeSingle();

    const { inviteToken, programSlug } = await enrollEmailInTrack(email, page.trackSlug);

    if (!existing) {
      await svc.from("landing_signups").insert({
        slug: input.slug,
        track_slug: page.trackSlug,
        email,
        name: name || null,
        session_id: session?.id ?? null,
        invite_token: inviteToken,
      });
    }

    const programName = (await getProgramWithOverrides(programSlug)).name;
    await sendEventConfirmationEmail({
      to: email,
      firstName: name.split(" ")[0] ?? "",
      programName,
      eventName: session?.label ?? page.headline.replace(/\n/g, " "),
      eventStartUtc: session?.startUtc ?? null,
      eventEndUtc: session?.endUtc ?? null,
      eventStartLocal: null,
      eventTimezone: session?.timezone ?? null,
      inviteLink: `${input.origin}/invite/${inviteToken}`,
      origin: input.origin,
    });

    return { ok: true };
  } catch (err) {
    console.error("[enrollInCourse] failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
