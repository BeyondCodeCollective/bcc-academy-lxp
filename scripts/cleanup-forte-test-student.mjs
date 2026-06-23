// Removes the Forte test student and all its rows. Run when done testing.
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

const EMAIL = "youngfonz+fortetest@gmail.com";
const { data: student } = await svc.from("students").select("id").eq("email", EMAIL).maybeSingle();

if (!student) {
  console.log("No test student found — nothing to clean up.");
} else {
  const id = student.id;
  await svc.from("week_progress").delete().eq("user_id", id);
  await svc.from("student_tracks").delete().eq("student_id", id);
  await svc.from("students").delete().eq("id", id);
  const { error } = await svc.auth.admin.deleteUser(id);
  if (error) throw error;
  console.log("✅ Removed test student, enrollment, progress, and auth user.");
}
