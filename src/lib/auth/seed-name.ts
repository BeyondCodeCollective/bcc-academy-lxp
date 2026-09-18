import type { createServiceClient } from "@/lib/supabase/server";

/**
 * Name a brand-new account from the landing page they signed up on.
 *
 * The /bcc signup form requires a full name, but that name only ever reached
 * landing_signups. The account created when they clicked the magic link was
 * born blank, so People showed an email and nothing else for someone who had
 * already told us who they are. Both account-creation paths (the auth callback
 * and the ghost-healer in getSessionContext) read this.
 */
export async function landingSignupName(
  admin: ReturnType<typeof createServiceClient>,
  email: string | null | undefined,
): Promise<{ first_name: string; last_name: string }> {
  const empty = { first_name: "", last_name: "" };
  if (!email) return empty;
  try {
    const { data } = await admin
      .from("landing_signups")
      .select("name")
      .eq("email", email.toLowerCase())
      .not("name", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ name: string | null }>();
    const full = (data?.name ?? "").trim();
    if (!full) return empty;
    const parts = full.split(/\s+/);
    return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
  } catch (e) {
    console.error("[seed-name] landing signup lookup failed:", e);
    return empty;
  }
}
