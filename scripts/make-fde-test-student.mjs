// One-off: a throwaway learner enrolled in Forward Deploy (Catalyst) so the
// instructor + hosted lab can be walked end-to-end against a real account.
// Idempotent. Prints a localhost magic link.
//
//   node scripts/make-fde-test-student.mjs [port]
//
// Clean up: node scripts/cleanup-fde-test-student.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}
const PORT = process.argv[2] || "3011";
const EMAIL = "youngfonz+fdetest@gmail.com";
const CATALYST = "a7dd0e35-dfba-451d-aa61-4e1251e1c53f";
const TRACK = "forward-deploy";

const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId;
const created = await svc.auth.admin.createUser({ email: EMAIL, email_confirm: true });
if (created.error) {
  if (!/already|registered|exists/i.test(created.error.message)) throw created.error;
  const { data } = await svc.auth.admin.listUsers({ perPage: 1000 });
  userId = data.users.find((u) => u.email === EMAIL)?.id;
  if (!userId) throw new Error("user exists but was not found");
} else {
  userId = created.data.user.id;
}
const nowIso = new Date().toISOString();
const { error: sErr } = await svc.from("students").upsert(
  { id: userId, first_name: "Denise", last_name: "Test", email: EMAIL, // "instructor" (not "student") on purpose: the course has a start date, and until
  // it arrives the layout confines a pure learner to the holding page. Admin-panel
  // roles are exempt, which is how facilitators prep sessions before launch.
  role: "instructor", program_id: CATALYST, is_test: true, onboarding_completed: true, welcome_seen_at: nowIso, last_seen_at: nowIso },
  { onConflict: "id" },
);
if (sErr) throw sErr;
const { error: aErr } = await svc.from("allowed_signup_emails").upsert({ email: EMAIL, track_slug: TRACK }, { onConflict: "email,track_slug" });
if (aErr) throw aErr;
const { error: eErr } = await svc.from("student_tracks").upsert({ student_id: userId, program_id: CATALYST, track_slug: TRACK }, { onConflict: "student_id,track_slug" });
if (eErr) throw eErr;

const { data: link, error: lErr } = await svc.auth.admin.generateLink({
  type: "magiclink", email: EMAIL, options: { redirectTo: `http://localhost:${PORT}/auth/callback` },
});
if (lErr) throw lErr;
console.log(JSON.stringify({
  userId,
  url: `http://localhost:${PORT}/auth/callback?token_hash=${link.properties.hashed_token}&type=magiclink&email=${encodeURIComponent(EMAIL)}&next=${encodeURIComponent(`/dashboard/track/${TRACK}/1`)}`,
}));
