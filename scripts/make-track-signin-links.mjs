// Mints one-click sign-in links for everyone on a track's allowlist, so
// learners can join without typing a password or waiting on an email.
//
//   node scripts/make-track-signin-links.mjs <track-slug> [callback-origin]
//
// Each link is SINGLE-USE and EXPIRES (Supabase MAILER_OTP_EXP — 1 hour by
// default). Generate them shortly before you send them, not days ahead, and
// re-run this to mint fresh ones. Reads the allowlist; does not write to it.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

const track = process.argv[2];
if (!track) {
  console.error("usage: node scripts/make-track-signin-links.mjs <track-slug> [origin]");
  process.exit(1);
}
const origin = process.argv[3] || "https://bccacademy.io";

const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: rows, error } = await svc
  .from("allowed_signup_emails")
  .select("email")
  .eq("track_slug", track);
if (error) throw error;
if (!rows?.length) {
  console.error(`No allowlisted emails for track "${track}".`);
  process.exit(1);
}

const emails = [...new Set(rows.map((r) => r.email.trim().toLowerCase()))].sort();
// WEEK=1 lands people directly in that session instead of the course overview.
const week = process.env.WEEK;
const next = week ? `/dashboard/track/${track}/${week}` : `/dashboard/track/${track}`;

console.log(`\n${emails.length} link(s) for ${track} — single-use, expiring:\n`);

for (const email of emails) {
  const { data, error: linkError } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) {
    console.log(`${email}\n  FAILED: ${linkError.message}\n`);
    continue;
  }
  // Build against /auth/callback ourselves: the route verifies token_hash
  // server-side, while generateLink's action_link is fragment-based and the
  // server can't read it.
  const url =
    `${origin}/auth/callback?token_hash=${data.properties.hashed_token}` +
    `&type=magiclink&email=${encodeURIComponent(email)}` +
    `&next=${encodeURIComponent(next)}`;
  console.log(`${email}\n  ${url}\n`);
}

console.log("Send each link ONLY to its own address — a link signs in whoever opens it.");
