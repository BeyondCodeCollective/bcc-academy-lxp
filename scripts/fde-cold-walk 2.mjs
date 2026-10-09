// A stranger walking in cold.
//
// Everything about Field Ready has been checked by people who already knew
// where to click, on accounts that were already enrolled. This mints a
// throwaway learner who has done nothing — no completions, role `student`,
// enrolled in Phase 0 and Phase 1 only — and prints a magic link, so the
// ladder can be walked the way a community signup meets it.
//
//   node scripts/fde-cold-walk.mjs [port]        → { userId, url }
//   node scripts/fde-cold-walk.mjs [port] reset  → also clears completions
//
// Idempotent. The learner is flagged is_test so they stay out of counts.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

const PORT = process.argv[2] || "3011";
const RESET = process.argv[3] === "reset";
const EMAIL = "youngfonz+frcold@gmail.com";
const INTRO = "field-ready-intro";
const SESSION = "field-ready-session";

const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: program } = await svc
  .from("programs").select("id").eq("slug", "field-ready").maybeSingle();
if (!program) throw new Error("no field-ready program row — apply supabase/migrations/field_ready_program.sql");

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
// role `student` on purpose. The other test learner is an `instructor` so it
// can walk past the pre-launch holding page — which is exactly the thing a
// stranger cannot do, so a cold walk must not borrow it.
const { error: sErr } = await svc.from("students").upsert(
  {
    id: userId,
    first_name: "Cold",
    last_name: "Walker",
    email: EMAIL,
    role: "student",
    program_id: program.id,
    is_test: true,
    onboarding_completed: true,
    welcome_seen_at: nowIso,
    last_seen_at: nowIso,
  },
  { onConflict: "id" },
);
if (sErr) throw sErr;

for (const track of [INTRO, SESSION]) {
  const { error } = await svc
    .from("student_tracks")
    .upsert({ student_id: userId, program_id: program.id, track_slug: track }, { onConflict: "student_id,track_slug" });
  if (error) throw error;
}

// Deliberately NO allowed_signup_emails row.
//
// An earlier version of this script added one, and that was a mistake with
// teeth: the join gate treats a track's allowlist as all-or-nothing — "if the
// track's list is empty, anyone can sign up" — so a single row would have
// switched Phase 0 from open-to-the-public to invite-only for everyone.
//
// The magic link below carries `join` and `track`, which is what arriving via
// /join/field-ready gives a real visitor. Without them the callback falls back
// to the default program (Catalyst, requireInviteLink: true) and rejects with
// error=not-invited — which is a fact about Catalyst, not about Field Ready.

if (RESET) {
  const { error } = await svc.from("track_completions").delete().eq("student_id", userId);
  if (error) throw error;
}

const { data: completions } = await svc
  .from("track_completions").select("track_slug").eq("student_id", userId);

const { data: link, error: lErr } = await svc.auth.admin.generateLink({
  type: "magiclink",
  email: EMAIL,
  options: { redirectTo: `http://localhost:${PORT}/auth/callback` },
});
if (lErr) throw lErr;

console.log(JSON.stringify({
  userId,
  completions: (completions ?? []).map((c) => c.track_slug),
  url: `http://localhost:${PORT}/auth/callback?token_hash=${link.properties.hashed_token}&type=magiclink&email=${encodeURIComponent(EMAIL)}&join=field-ready&track=${INTRO}&next=${encodeURIComponent(`/dashboard/track/${INTRO}/1`)}`,
}));
