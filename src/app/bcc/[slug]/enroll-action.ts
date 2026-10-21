"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { enrollEmailInTrack } from "@/lib/enroll";
import { getLandingPage } from "@/lib/landing-pages";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { sendEventConfirmationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** A repeat submit re-sends the confirmation at most this often. */
const CONFIRMATION_RESEND_MS = 10 * 60 * 1000;

export type EnrollActionResult =
  | { ok: true; enrolled: boolean }
  | { ok: false; error: string };

/**
 * Native course enrollment from a /bcc/[slug] page — the no-Eventbrite path.
 *
 * Signing up allowlists the email for the page's track, mints a durable invite,
 * and emails a magic access link. Idempotent on (slug, email, session): a repeat submit
 * re-sends the same link rather than double-enrolling.
 */
export async function enrollInCourse(input: {
  slug: string;
  /** Older cached pages still post a single `name`; newer ones post both. */
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  zipCode?: string;
  heardAbout?: string;
  sessionId?: string | null;
  origin: string;
}): Promise<EnrollActionResult> {
  const email = (input.email ?? "").trim().toLowerCase();
  // The form now collects first and last separately. A cached page that still
  // posts one `name` keeps working — split it the way this action always did.
  const firstName = (input.firstName ?? "").trim().slice(0, 100);
  const lastName = (input.lastName ?? "").trim().slice(0, 100);
  const legacy = (input.name ?? "").trim().slice(0, 200);
  const legacyParts = legacy.split(/\s+/).filter(Boolean);
  const first = firstName || legacyParts[0] || "";
  const last = lastName || legacyParts.slice(1).join(" ") || "";
  const name = [first, last].filter(Boolean).join(" ");
  // Optional at the action level so older cached pages that submit without it
  // still succeed; the form itself requires a valid ZIP.
  const zipRaw = (input.zipCode ?? "").trim();
  const zipCode = /^\d{5}(-\d{4})?$/.test(zipRaw) ? zipRaw : null;
  // Same reasoning as the ZIP: optional here so a cached page that predates the
  // field still submits, required by the form itself.
  const heardAbout = (input.heardAbout ?? "").trim().slice(0, 120) || null;

  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  // Names were never checked here, so anything that reached the action without
  // them wrote a row with a null name and the account it created was blank.
  if (!first || !last) {
    return { ok: false, error: "Please enter your first and last name." };
  }

  const page = await getLandingPage(input.slug);
  if (!page || !(page.nativeEnroll || page.comingSoon)) {
    return { ok: false, error: "This course isn't open for signup right now." };
  }

  // A page may require choosing one of its sessions.
  const session = page.sessions.find((s) => s.id === input.sessionId) ?? null;
  if (!page.comingSoon && page.sessions.length > 0 && !session) {
    return { ok: false, error: "Please choose a date." };
  }

  try {
    const svc = createServiceClient();
    const nowIso = new Date().toISOString();

    // Idempotency: if this email already signed up for this page AND this
    // session, don't double-enroll or add a second row. Keyed on the session
    // too: someone who signed up for one date and later picks another is a new
    // registration and needs its own confirmation (keyed on page + email alone,
    // a returning attendee was enrolled but never emailed and left no signup
    // row). A repeat of the same date re-sends the confirmation, throttled
    // below: staying silent after a "success" screen reads as a broken form.
    const sessionKey = session?.id ?? null;
    const existingQuery = svc
      .from("landing_signups")
      .select("id, last_confirmation_at")
      .eq("slug", input.slug)
      .eq("email", email);
    const { data: existing } = await (sessionKey
      ? existingQuery.eq("session_id", sessionKey)
      : existingQuery.is("session_id", null)
    ).maybeSingle();

    // With a track → enroll (allowlist + invite + magic link). Without one
    // (a "notify me" page whose course isn't built yet), or on a "coming soon"
    // page → capture interest only.
    let inviteToken: string | null = null;
    const enrolls = !!page.trackSlug && !page.comingSoon;
    if (enrolls && page.trackSlug) {
      // Enroll into the chosen session's own course when it has one; the
      // signup row below still records the page's track so the admin roster
      // keeps grouping every date under one course.
      const enrolled = await enrollEmailInTrack(email, session?.trackSlug || page.trackSlug);
      inviteToken = enrolled.inviteToken;

      // A new signup is always confirmed. A repeat is re-confirmed at most once
      // per CONFIRMATION_RESEND_MS, claimed with a conditional update so two
      // quick submits can't both send and the public form can't flood an inbox.
      let confirm = !existing;
      if (existing) {
        const cutoff = new Date(Date.now() - CONFIRMATION_RESEND_MS).toISOString();
        const { data: claimed } = await svc
          .from("landing_signups")
          .update({ last_confirmation_at: nowIso })
          .eq("id", existing.id)
          .or(`last_confirmation_at.is.null,last_confirmation_at.lt.${cutoff}`)
          .select("id");
        confirm = !!claimed?.length;
      }
      if (confirm) {
        const programName = (await getProgramWithOverrides(enrolled.programSlug)).name;
        const { data: account } = await svc.from("students").select("id").ilike("email", email).limit(1);
        try {
          await sendEventConfirmationEmail({
            to: email,
            firstName: first,
            programName,
            eventName: session?.label ?? page.headline.replace(/\n/g, " "),
            eventStartUtc: session?.startUtc ?? null,
            eventEndUtc: session?.endUtc ?? null,
            eventStartLocal: null,
            eventTimezone: session?.timezone ?? null,
            inviteLink: `${input.origin}/invite/${inviteToken}`,
            origin: input.origin,
            returning: !!account?.length,
          });
        } catch (err) {
          // Release the claim so the next submit can retry.
          if (existing) {
            await svc
              .from("landing_signups")
              .update({ last_confirmation_at: existing.last_confirmation_at })
              .eq("id", existing.id);
          }
          throw err;
        }
      }
    }

    if (!existing) {
      await svc.from("landing_signups").insert({
        slug: input.slug,
        track_slug: page.trackSlug,
        email,
        name: name || null,
        first_name: first,
        last_name: last,
        zip_code: zipCode,
        session_id: session?.id ?? null,
        heard_about: heardAbout,
        invite_token: inviteToken,
        last_confirmation_at: enrolls ? nowIso : null,
      });
    }

    return { ok: true, enrolled: enrolls };
  } catch (err) {
    console.error("[enrollInCourse] failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
