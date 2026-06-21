// Seed a clean demo student for the product video (Phase 2). Idempotent.
// Creates an auth user + students row + ai-literacy enrollment + a bit of
// watched progress, so the portal looks real. Remove later with demo/unseed.mjs.
//   node --env-file=.env.local demo/seed.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing Supabase env (run with --env-file=.env.local)"); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const EMAIL = process.env.DEMO_EMAIL ?? "demo.maya@bccacademy.io";
const TRACK = process.env.DEMO_TRACK ?? "ai-literacy";
const FIRST = "Maya";
const LAST = "Demo";

// Program that owns the track (ai-literacy → forte).
const { data: prog, error: pErr } = await sb.from("programs").select("id").eq("slug", "forte").single();
if (pErr || !prog) { console.error("forte program not found:", pErr?.message); process.exit(1); }
const programId = prog.id;

// Ensure the auth user exists.
let uid;
const created = await sb.auth.admin.createUser({ email: EMAIL, email_confirm: true });
if (created.data?.user) {
  uid = created.data.user.id;
  console.log("created auth user");
} else {
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  uid = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())?.id;
  console.log("auth user already existed");
}
if (!uid) { console.error("could not resolve demo user id"); process.exit(1); }

// Student profile — onboarding done + welcome seen so it lands straight in.
const nowIso = new Date().toISOString();
const { error: sErr } = await sb.from("students").upsert(
  { id: uid, email: EMAIL, first_name: FIRST, last_name: LAST, role: "student", program_id: programId, onboarding_completed: true, welcome_seen_at: nowIso, last_seen_at: nowIso },
  { onConflict: "id" },
);
if (sErr) { console.error("students upsert failed:", sErr.message); process.exit(1); }

// Enrollment.
const { error: eErr } = await sb.from("student_tracks").upsert(
  { student_id: uid, track_slug: TRACK, program_id: programId },
  { onConflict: "student_id,track_slug" },
);
if (eErr) console.warn("enrollment warn:", eErr.message);

// A little watched progress (weeks 1-2) so the portal isn't empty. Best-effort.
for (const w of [1, 2]) {
  const { error } = await sb.from("week_progress").upsert(
    { user_id: uid, program_id: programId, track_slug: TRACK, week_number: w, video_watched_at: nowIso, updated_at: nowIso },
    { onConflict: "user_id,track_slug,week_number" },
  );
  if (error) console.warn(`week_progress w${w} warn:`, error.message);
}

console.log(`\n✓ demo student ready: ${EMAIL}  (${uid})  enrolled in ${TRACK}`);
