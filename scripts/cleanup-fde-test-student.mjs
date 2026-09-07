// Removes the Forward Deploy test learner and everything the walkthrough wrote.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
function env(key) {
  const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key}`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}
const EMAIL = "youngfonz+fdetest@gmail.com";
const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { autoRefreshToken: false, persistSession: false } });
const { data } = await svc.auth.admin.listUsers({ perPage: 1000 });
const u = data.users.find((x) => x.email === EMAIL);
if (!u) { console.log("no test user"); process.exit(0); }
for (const t of ["deployment_notes", "instructor_flags", "human_checkpoints"]) await svc.from(t).delete().eq("student_id", u.id);
await svc.from("week_progress").delete().eq("user_id", u.id);
await svc.from("tutor_messages").delete().eq("student_id", u.id);
await svc.from("student_tracks").delete().eq("student_id", u.id);
await svc.from("allowed_signup_emails").delete().eq("email", EMAIL);
await svc.from("students").delete().eq("id", u.id);
await svc.auth.admin.deleteUser(u.id);
console.log("cleaned up", u.id);
