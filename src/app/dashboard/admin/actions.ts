"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single();

  if (student?.role !== "admin") throw new Error("Not authorized");
  return { svc, userId: user.id };
}

export async function deleteStudentAction(studentId: string) {
  const { svc } = await requireAdmin();
  await svc.from("attendance").delete().eq("student_id", studentId);
  const { error } = await svc.from("students").delete().eq("id", studentId);
  if (error) throw new Error(error.message);
  // Also remove from auth so they can re-register cleanly
  await svc.auth.admin.deleteUser(studentId);
  return { success: true };
}

export async function updateStudentAction(
  studentId: string,
  field: "role" | "cohort_id",
  value: string
) {
  const { svc } = await requireAdmin();
  const { error } = await svc
    .from("students")
    .update({ [field]: value })
    .eq("id", studentId);
  if (error) throw new Error(error.message);
  return { success: true };
}


export async function addStudentAction(data: {
  email: string;
  first_name: string;
  last_name: string;
  role: "student" | "admin";
  cohort_id: string | null;
}) {
  const { svc } = await requireAdmin();

  // Create auth user (sends magic link invite)
  const { data: authUser, error: authError } = await svc.auth.admin.createUser({
    email: data.email,
    email_confirm: true,
  });

  if (authError) throw new Error(authError.message);
  if (!authUser.user) throw new Error("Failed to create user");

  // Insert student record
  const { error: studentError } = await svc.from("students").insert({
    id: authUser.user.id,
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    role: data.role,
    cohort_id: data.cohort_id || null,
  });

  if (studentError) throw new Error(studentError.message);

  return {
    success: true,
    student: {
      id: authUser.user.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      cohort_id: data.cohort_id || null,
    },
  };
}

export async function updateCohortAction(
  cohortId: string,
  data: { display_name?: string; start_date?: string; total_weeks?: number }
) {
  const { svc } = await requireAdmin();
  const { error } = await svc.from("cohorts").update(data).eq("id", cohortId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── Session Content ──────────────────────────────────────────────────────────

export type SessionResource = {
  name: string;
  url: string;
  type: string;
};

export type SessionContentData = {
  meeting_link?: string;
  recording_url?: string;
  resources?: SessionResource[];
};

export type SessionContentRow = {
  id: string;
  track: string;
  week_number: number;
  meeting_link: string | null;
  recording_url: string | null;
  resources: SessionResource[];
  updated_at: string;
  updated_by: string | null;
};

/**
 * Upsert meeting_link, recording_url, and resources for a specific track + week.
 * Uses the service role client so it bypasses RLS.
 */
export async function saveSessionContent(
  track: "mass" | "techplus",
  weekNumber: number,
  data: SessionContentData
) {
  const { svc, userId } = await requireAdmin();

  const { error } = await svc.from("session_content").upsert(
    {
      track,
      week_number: weekNumber,
      meeting_link: data.meeting_link ?? null,
      recording_url: data.recording_url ?? null,
      resources: data.resources ?? [],
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: "track,week_number" }
  );

  if (error) throw new Error(error.message);
  return { success: true };
}

/**
 * Read session content for a single week. Uses service client so it works in
 * server components regardless of the viewer's auth state.
 */
export async function getSessionContent(
  track: "mass" | "techplus",
  weekNumber: number
): Promise<SessionContentRow | null> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("session_content")
    .select("*")
    .eq("track", track)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (error) {
    console.error("getSessionContent error:", error.message);
    return null;
  }
  return data as SessionContentRow | null;
}

/**
 * Read all session content rows for a given track.
 * Used by the admin panel and the API route that feeds the client component.
 */
export async function getAllSessionContent(
  track: "mass" | "techplus"
): Promise<SessionContentRow[]> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("session_content")
    .select("*")
    .eq("track", track)
    .order("week_number");

  if (error) {
    console.error("getAllSessionContent error:", error.message);
    return [];
  }
  return (data ?? []) as SessionContentRow[];
}
