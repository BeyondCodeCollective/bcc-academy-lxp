import type { createServiceClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createServiceClient>;
export type SeededName = { first_name: string; last_name: string };

const EMPTY: SeededName = { first_name: "", last_name: "" };
const named = (n: SeededName) => !!(n.first_name || n.last_name);

/** "Ana M Mendoza-Santiago" → first "Ana", rest as the surname. */
function splitFullName(full: string): SeededName {
  const trimmed = full.trim();
  if (!trimmed) return EMPTY;
  const parts = trimmed.split(/\s+/);
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

/**
 * Name a brand-new account from an application they submitted. They typed it
 * themselves and the form asks for first and last separately, so this is the
 * most reliable source and it goes first.
 */
async function fromApplication(admin: Admin, email: string): Promise<SeededName> {
  try {
    const { data } = await admin
      .from("public_survey_responses")
      .select("full_name, responses")
      .or(`email.ilike.${email},responses->>email.ilike.${email}`)
      .order("created_at", { ascending: false })
      .limit(5);
    for (const row of (data ?? []) as { full_name: string | null; responses: unknown }[]) {
      const r = (row.responses ?? {}) as Record<string, unknown>;
      const first = typeof r.first_name === "string" ? r.first_name.trim() : "";
      const last = typeof r.last_name === "string" ? r.last_name.trim() : "";
      if (first || last) return { first_name: first, last_name: last };
      // full_name is a real column as well as a key inside `responses` — the
      // application forms write the column, so reading only the JSON missed
      // every applicant who told us their name on the way in.
      const full =
        (typeof r.full_name === "string" && r.full_name.trim()) ||
        (typeof r.name === "string" && r.name.trim()) ||
        (row.full_name ?? "").trim();
      if (full) return splitFullName(full);
    }
  } catch (e) {
    console.error("[seed-name] application lookup failed:", e);
  }
  return EMPTY;
}

/**
 * Name a brand-new account from the landing page they signed up on. The /bcc
 * form requires a name, but it only ever reached landing_signups — the account
 * created when they clicked the magic link was born blank, so People showed an
 * email and nothing else for someone who had already told us who they are.
 */
async function fromLandingSignup(admin: Admin, email: string): Promise<SeededName> {
  try {
    const { data } = await admin
      .from("landing_signups")
      .select("first_name, last_name, name")
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ first_name: string | null; last_name: string | null; name: string | null }>();
    if (!data) return EMPTY;
    // The form collects first and last separately now; older rows only have the
    // combined field, where the surname is whatever followed the first space.
    const first = (data.first_name ?? "").trim();
    const last = (data.last_name ?? "").trim();
    if (first || last) return { first_name: first, last_name: last };
    return splitFullName(data.name ?? "");
  } catch (e) {
    console.error("[seed-name] landing signup lookup failed:", e);
    return EMPTY;
  }
}

/**
 * Name a brand-new account from the roster file their program uploaded. Forte
 * Bahamas sends a spreadsheet with a Name column; carrying it this far means
 * the learner is not asked for something we were already told. Last, because
 * staff typed it about them rather than them typing it themselves.
 */
async function fromAllowlist(admin: Admin, email: string): Promise<SeededName> {
  try {
    const { data } = await admin
      .from("allowed_signup_emails")
      .select("first_name, last_name")
      .eq("email", email.toLowerCase())
      .not("first_name", "is", null)
      .limit(1)
      .maybeSingle<{ first_name: string | null; last_name: string | null }>();
    if (!data) return EMPTY;
    return {
      first_name: (data.first_name ?? "").trim(),
      last_name: (data.last_name ?? "").trim(),
    };
  } catch (e) {
    console.error("[seed-name] allowlist lookup failed:", e);
    return EMPTY;
  }
}

/**
 * Every place that might already know this person's name, tried in order of how
 * much we trust it. Account creation happens in three places — both upserts in
 * the auth callback and the ghost-healer in getSessionContext — and they used to
 * seed differently: the pinned-host path checked applications only, so a learner
 * who signed up on a landing page or arrived on a roster still landed nameless
 * and got the blocking name modal for something we already had on file.
 *
 * Returns empty strings when nothing matches; the caller's upsert then behaves
 * as before and the modal asks.
 */
export async function seedNameForEmail(
  admin: Admin,
  email: string | null | undefined,
): Promise<SeededName> {
  if (!email) return EMPTY;
  let seed = await fromApplication(admin, email);
  if (!named(seed)) seed = await fromLandingSignup(admin, email);
  if (!named(seed)) seed = await fromAllowlist(admin, email);
  return seed;
}
