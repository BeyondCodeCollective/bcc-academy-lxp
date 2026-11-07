import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";

// Sensitive connected learner requests must not authorize from the shared
// profile TTL cache. Verify identity and read the current role on every call.
// Use the caller's authenticated client, not service-role access, for this gate.
export async function requireCurrentMvpLearnerAccess() {
  const db = await createClient();
  const { data: identity, error: authError } = await db.auth.getUser();
  if (authError || !identity.user?.id) throw new Error("Learner access is required.");
  const { data: profile, error } = await db.from("students").select("id,role")
    .eq("id", identity.user.id).single();
  if (error || profile?.id !== identity.user.id || profile?.role !== "super_admin" ||
      await isPreviewingAsStudent(profile.role)) throw new Error("Learner access is required.");
}
