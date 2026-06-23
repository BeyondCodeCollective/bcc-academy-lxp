// One-off: create a throwaway Forte test student with real activity so the
// learner-facing My Progress card can be seen end-to-end. Idempotent.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const svc = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = "youngfonz+fortetest@gmail.com";
const FORTE = "cacead69-b0e2-4f73-bf7d-dbc18b35acc6";
const COHORT = "15fece15-034e-47d8-800b-034ecddcef4a";
const TRACK = "ai-literacy";

// 1) Auth user (idempotent — reuse if it already exists).
let userId;
const created = await svc.auth.admin.createUser({
  email: EMAIL,
  email_confirm: true,
});
if (created.error) {
  if (!/already|registered|exists/i.test(created.error.message)) throw created.error;
  // Find the existing user by paging the admin list.
  const { data } = await svc.auth.admin.listUsers({ perPage: 200 });
  userId = data.users.find((u) => u.email === EMAIL)?.id;
  if (!userId) throw new Error("user exists but could not be found in first page");
} else {
  userId = created.data.user.id;
}
console.log("auth user:", userId);

const nowIso = new Date().toISOString();

// 2) Student profile (skip onboarding so they land straight on the course).
const { error: sErr } = await svc.from("students").upsert(
  {
    id: userId,
    first_name: "Test",
    last_name: "Learner",
    email: EMAIL,
    role: "student",
    program_id: FORTE,
    cohort_id: COHORT,
    onboarding_completed: true,
    welcome_seen_at: nowIso,
    last_seen_at: nowIso,
    last_activity_at: nowIso,
  },
  { onConflict: "id" },
);
if (sErr) throw sErr;

// 3) Enroll in ai-literacy (single course → lands on the course overview).
const { error: eErr } = await svc
  .from("student_tracks")
  .upsert({ student_id: userId, program_id: FORTE, track_slug: TRACK }, { onConflict: "student_id,track_slug" });
if (eErr) throw eErr;

// 4) Three watched lessons on three consecutive days → 3-day streak, 3 lessons.
const DAY = 86_400_000;
const now = Date.now();
const rows = [0, 1, 2].map((back) => ({
  user_id: userId,
  program_id: FORTE,
  track_slug: TRACK,
  week_number: back + 1,
  video_watched_at: new Date(now - back * DAY).toISOString(),
  updated_at: new Date(now - back * DAY).toISOString(),
}));
const { error: wErr } = await svc
  .from("week_progress")
  .upsert(rows, { onConflict: "user_id,track_slug,week_number" });
if (wErr) throw wErr;

console.log("\n✅ Test student ready");
console.log("   email:", EMAIL);
console.log("   3 lessons watched (weeks 1-3), 3-day streak");
console.log("   log in via the normal magic-link flow with that email");
