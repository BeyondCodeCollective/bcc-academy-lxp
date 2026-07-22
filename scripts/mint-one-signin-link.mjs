// Mint a single magic sign-in link for one email. For testing/support only.
//   node scripts/mint-one-signin-link.mjs <email> [next-path]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

const email = process.argv[2];
if (!email) {
  console.error("usage: node scripts/mint-one-signin-link.mjs <email> [next-path]");
  process.exit(1);
}
const next = process.argv[3] || "";

const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await svc.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error("FAILED:", error.message);
  process.exit(1);
}
const q = next ? `&next=${encodeURIComponent(next)}` : "";
console.log(
  `https://bccacademy.io/auth/callback?token_hash=${data.properties.hashed_token}` +
    `&type=magiclink&email=${encodeURIComponent(email)}${q}`,
);
