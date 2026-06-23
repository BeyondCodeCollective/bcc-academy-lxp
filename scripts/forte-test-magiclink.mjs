// Generates a magic-link URL for the Forte test student so you can log in
// without relying on email delivery. Paste the printed URL into an incognito
// browser. Does NOT write to the DB — just mints a login token.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

// The app's /auth/callback verifies a token_hash SERVER-SIDE (verifyOtp), so we
// build the URL ourselves against the callback rather than using generateLink's
// fragment-based action_link (which only works client-side and the server route
// can't read). Pass a different callback as arg to retarget (e.g. localhost).
const CALLBACK = process.argv[2] || "https://bccacademy.io/auth/callback";
const EMAIL = "youngfonz+fortetest@gmail.com";

const { data, error } = await svc.auth.admin.generateLink({
  type: "magiclink",
  email: EMAIL,
});
if (error) throw error;

const link = `${CALLBACK}?token_hash=${data.properties.hashed_token}&type=magiclink&email=${encodeURIComponent(EMAIL)}`;
console.log("\n✅ Sign-in link (paste into an incognito browser):\n");
console.log(link);
console.log("\nVerifies server-side at:", CALLBACK);
console.log("Single course → it lands you on /dashboard/track/ai-literacy");
