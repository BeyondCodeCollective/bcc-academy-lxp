import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function admin() {
  return createClient(
    requireEnv("SMOKE_SUPABASE_URL"),
    requireEnv("SMOKE_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Mints a magic-link URL via the Supabase admin API. No email is sent.
// `redirectTo` should be the deployed app's /auth/callback URL.
export async function mintMagicLink(email: string, redirectTo: string): Promise<string> {
  const svc = admin();
  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (error) throw new Error(`generateLink failed for ${email}: ${error.message}`);
  const link = data.properties?.action_link;
  if (!link) throw new Error(`generateLink returned no action_link for ${email}`);
  return link;
}

export async function addToAllowlist(email: string, trackSlug: string) {
  const svc = admin();
  const { error } = await svc
    .from("allowed_signup_emails")
    .upsert({ email: email.toLowerCase(), track_slug: trackSlug }, { onConflict: "email,track_slug" });
  if (error) throw new Error(`addToAllowlist failed: ${error.message}`);
}

export async function removeFromAllowlist(email: string, trackSlug: string) {
  const svc = admin();
  await svc.from("allowed_signup_emails").delete().match({ email: email.toLowerCase(), track_slug: trackSlug });
}

export async function deleteUserByEmail(email: string) {
  const svc = admin();
  const { data } = await svc.auth.admin.listUsers();
  const target = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (target) {
    await svc.from("students").delete().eq("id", target.id);
    await svc.auth.admin.deleteUser(target.id);
  }
}

export function randomEmail(prefix = "smoke"): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}@playwright.bccacademy.test`;
}
