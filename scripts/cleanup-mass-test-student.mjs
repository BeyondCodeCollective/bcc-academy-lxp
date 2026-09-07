// Removes the MASS Fall 2026 test learner and every row it created. Run when
// done testing the pre-program checklist.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

const EMAIL = "youngfonz+masstest@gmail.com";
const svc = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: student } = await svc
  .from("students")
  .select("id, is_test")
  .eq("email", EMAIL)
  .maybeSingle();

if (!student) {
  console.log("No MASS test student found — nothing to clean up.");
} else {
  // Guard: only ever delete the throwaway. If this row isn't flagged is_test,
  // something else is using the address and deleting it would be wrong.
  if (!student.is_test) {
    throw new Error(`${EMAIL} is not flagged is_test — refusing to delete it.`);
  }
  const id = student.id;
  // survey_responses keys on student_id; the activity tables on user_id.
  await svc.from("survey_responses").delete().eq("student_id", id);
  for (const table of ["activity_events", "week_progress"]) {
    await svc.from(table).delete().eq("user_id", id);
  }
  await svc.from("student_tracks").delete().eq("student_id", id);
  await svc.from("allowed_signup_emails").delete().eq("email", EMAIL);
  await svc.from("students").delete().eq("id", id);
  const { error } = await svc.auth.admin.deleteUser(id);
  if (error) throw error;
  console.log("✅ Removed the MASS test learner, its enrollment, and its responses.");
}
