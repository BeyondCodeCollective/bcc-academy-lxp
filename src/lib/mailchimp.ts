import { createHash } from "crypto";

// Mailchimp newsletter sync. Mirrors the Resend pattern in email.ts: env-gated
// at module level, never throws into the caller. A failed sync must never block
// a student from getting into the portal.
const API_KEY = process.env.MAILCHIMP_API_KEY;
const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

// Only these programs feed the newsletter. Catalyst (which aggregates ATG +
// Beyond Code Centers), the standalone Beyond Code Centers shell, and Forte
// (Upskill Bahamas). BGC is its own org — explicitly excluded — and marketing
// is not a real signup program.
const SYNCED_PROGRAMS = new Set(["catalyst", "beyond-code-centers", "forte"]);

/**
 * Subscribe a student to the Mailchimp newsletter audience.
 *
 * Idempotent: uses PUT /members/{md5(email)} with `status_if_new`, so calling
 * it again for an existing subscriber updates their merge fields rather than
 * erroring on a duplicate. That lets us subscribe at signup (no name yet) and
 * re-call from the welcome email to backfill the name.
 *
 * Fire-and-forget — callers should `void` this and not await it on the hot path.
 */
export async function subscribeToNewsletter({
  email,
  firstName,
  lastName,
  programSlug,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  programSlug: string;
}): Promise<void> {
  if (!API_KEY || !AUDIENCE_ID) {
    console.warn("[mailchimp] MAILCHIMP_API_KEY/AUDIENCE_ID not set — skipping");
    return;
  }
  if (!SYNCED_PROGRAMS.has(programSlug)) return;

  // Datacenter is the suffix of the API key, e.g. "abc123-us21" → "us21".
  const dc = API_KEY.split("-")[1];
  if (!dc) {
    console.error("[mailchimp] API key missing datacenter suffix — skipping");
    return;
  }

  const normalized = email.trim().toLowerCase();
  const hash = createHash("md5").update(normalized).digest("hex");

  // Only send name merge fields we actually have, so an empty signup-time call
  // doesn't blank out a name a later call set.
  const mergeFields: Record<string, string> = {};
  if (firstName) mergeFields.FNAME = firstName;
  if (lastName) mergeFields.LNAME = lastName;

  try {
    const res = await fetch(
      `https://${dc}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members/${hash}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: normalized,
          status_if_new: "subscribed",
          ...(Object.keys(mergeFields).length ? { merge_fields: mergeFields } : {}),
        }),
      }
    );
    if (!res.ok) {
      console.error(`[mailchimp] subscribe failed (${res.status}):`, await res.text());
    }
  } catch (err) {
    console.error("[mailchimp] subscribe error:", err);
  }
}
