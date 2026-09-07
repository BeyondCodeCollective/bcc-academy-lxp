// One-off: create a throwaway MASS Fall 2026 test learner so the pre-program
// checklist (intake → agreement + releases → pre-survey) can be walked
// end-to-end against a real account. Idempotent. Prints a localhost magic link.
//
//   node scripts/make-mass-test-student.mjs [port]
//
// Clean up with scripts/cleanup-mass-test-student.mjs when you're done — it
// deletes the enrollment, the survey_responses rows the walkthrough creates,
// the student, and the auth user.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

const PORT = process.argv[2] || "3000";
const EMAIL = "youngfonz+masstest@gmail.com";
const CATALYST = "a7dd0e35-dfba-451d-aa61-4e1251e1c53f";
const TRACK = "mass-fall-2026";

const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1) Auth user (idempotent — reuse if it already exists).
let userId;
const created = await svc.auth.admin.createUser({ email: EMAIL, email_confirm: true });
if (created.error) {
  if (!/already|registered|exists/i.test(created.error.message)) throw created.error;
  const { data } = await svc.auth.admin.listUsers({ perPage: 1000 });
  userId = data.users.find((u) => u.email === EMAIL)?.id;
  if (!userId) throw new Error("user exists but was not found in the admin list");
} else {
  userId = created.data.user.id;
}

const nowIso = new Date().toISOString();

// 2) Student profile. is_test keeps it out of analytics; onboarding_completed
//    skips the welcome flow so the first stop is the checklist itself.
const { error: sErr } = await svc.from("students").upsert(
  {
    id: userId,
    first_name: "MASS",
    last_name: "Test",
    email: EMAIL,
    role: "student",
    program_id: CATALYST,
    is_test: true,
    onboarding_completed: true,
    welcome_seen_at: nowIso,
    last_seen_at: nowIso,
  },
  { onConflict: "id" },
);
if (sErr) throw sErr;

// 3) Allowlist the email for the track. Catalyst requires invite links, and the
//    auth callback rejects a magic link whose email isn't allowlisted/invited
//    (error=not-invited) — exactly like the 19 real invitees, so the test walks
//    the same door.
const { error: aErr } = await svc
  .from("allowed_signup_emails")
  .upsert({ email: EMAIL, track_slug: TRACK }, { onConflict: "email,track_slug" });
if (aErr) throw aErr;

// 4) Enroll in MASS Fall 2026 — this is what makes the checklist apply.
const { error: eErr } = await svc
  .from("student_tracks")
  .upsert(
    { student_id: userId, program_id: CATALYST, track_slug: TRACK },
    { onConflict: "student_id,track_slug" },
  );
if (eErr) throw eErr;

// 5) Start clean: drop any checklist rows left over from an earlier run so the
//    walkthrough always begins at 0 of 3.
const { error: rErr } = await svc
  .from("survey_responses")
  .delete()
  .eq("student_id", userId)
  .in("survey_type", ["bcc-learner-intake", "mass-fall-2026-agreement", "mass-fall-2026-pre"]);
if (rErr) throw rErr;

const { data: link, error: lErr } = await svc.auth.admin.generateLink({
  type: "magiclink",
  email: EMAIL,
  options: { redirectTo: `http://localhost:${PORT}/auth/callback` },
});
if (lErr) throw lErr;

console.log("\n✅ MASS Fall 2026 test learner ready");
console.log("   email:  ", EMAIL);
console.log("   user id:", userId);
console.log("   checklist reset to 0 of 3\n");
console.log("Open this in a fresh browser profile (or incognito) so it doesn't");
console.log("clobber your own admin session:\n");
console.log(
  `http://localhost:${PORT}/auth/callback?token_hash=${link.properties.hashed_token}` +
    `&type=magiclink&email=${encodeURIComponent(EMAIL)}` +
    `&next=${encodeURIComponent(`/dashboard/track/${TRACK}`)}`,
);
console.log("\nWhen you're done: node scripts/cleanup-mass-test-student.mjs");
