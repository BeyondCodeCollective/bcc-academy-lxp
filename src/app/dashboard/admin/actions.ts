"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canAccessAdminPanel, canManageStudents, canSwitchPrograms } from "@/lib/roles";

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

  if (!canAccessAdminPanel(student?.role ?? "")) throw new Error("Not authorized");
  return { svc, userId: user.id, role: student?.role ?? "" };
}

async function requireManager() {
  const result = await requireAdmin();
  if (!canManageStudents(result.role)) throw new Error("Not authorized");
  return result;
}

export async function deleteStudentAction(studentId: string) {
  const { svc } = await requireManager();
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
  const { svc } = await requireManager();
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
  role: "student" | "instructor" | "admin";
  cohort_id: string | null;
}) {
  const { svc } = await requireManager();

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
  const { svc } = await requireManager();
  const { error } = await svc.from("cohorts").update(data).eq("id", cohortId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── Track Enrollment ─────────────────────────────────────────────────────────

export type StudentTrackRow = {
  id: string;
  student_id: string;
  track_slug: string;
  program_id: string;
  created_at: string;
};

export async function getStudentTracks(programSlug: string): Promise<StudentTrackRow[]> {
  const svc = createServiceClient();
  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  const { data, error } = await svc
    .from("student_tracks")
    .select("*")
    .eq("program_id", programRow.id)
    .order("created_at");

  if (error) {
    console.error("getStudentTracks error:", error.message);
    return [];
  }
  return (data ?? []) as StudentTrackRow[];
}

export async function assignStudentTrack(
  studentId: string,
  trackSlug: string,
  programSlug: string
) {
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) throw new Error("Program not found");

  const { error } = await svc.from("student_tracks").upsert(
    {
      student_id: studentId,
      track_slug: trackSlug,
      program_id: programRow.id,
    },
    { onConflict: "student_id,track_slug,program_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "page");
  return { success: true };
}

export async function removeStudentTrack(
  studentId: string,
  trackSlug: string,
  programSlug: string
) {
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) throw new Error("Program not found");

  const { error } = await svc
    .from("student_tracks")
    .delete()
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .eq("program_id", programRow.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "page");
  return { success: true };
}

export async function bulkAssignTrack(
  studentIds: string[],
  trackSlug: string,
  programSlug: string
) {
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) throw new Error("Program not found");

  const rows = studentIds.map((sid) => ({
    student_id: sid,
    track_slug: trackSlug,
    program_id: programRow.id,
  }));

  const { error } = await svc
    .from("student_tracks")
    .upsert(rows, { onConflict: "student_id,track_slug,program_id" });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "page");
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
  meeting_link_2?: string;
  recording_url_2?: string;
  status?: string;
  status_2?: string;
  resources?: SessionResource[];
  /** Instructor overrides — null means use config default */
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  objectives?: string[] | null;
};

export type SessionContentRow = {
  id: string;
  track: string;
  week_number: number;
  meeting_link: string | null;
  recording_url: string | null;
  meeting_link_2: string | null;
  recording_url_2: string | null;
  status: string;
  status_2: string;
  resources: SessionResource[];
  updated_at: string;
  updated_by: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  objectives: string[] | null;
};

/**
 * Upsert meeting_link, recording_url, and resources for a specific track + week.
 * Uses the service role client so it bypasses RLS.
 */
export async function saveSessionContent(
  track: string,
  weekNumber: number,
  data: SessionContentData
) {
  const { svc, userId } = await requireAdmin();

  // Look up current program ID
  const { getProgram } = await import("@/lib/programs/server");
  const program = await getProgram();
  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", program.slug)
    .single();

  const row: Record<string, unknown> = {
    track,
    week_number: weekNumber,
    program_id: programRow?.id,
    meeting_link: data.meeting_link ?? null,
    recording_url: data.recording_url ?? null,
    resources: data.resources ?? [],
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };

  // Only include optional fields if provided — avoids errors
  // if the DB migration for those columns hasn't been run yet
  if (data.meeting_link_2 !== undefined) row.meeting_link_2 = data.meeting_link_2 || null;
  if (data.recording_url_2 !== undefined) row.recording_url_2 = data.recording_url_2 || null;
  if (data.status !== undefined) row.status = data.status;
  if (data.status_2 !== undefined) row.status_2 = data.status_2;

  // Instructor content overrides (empty string → null = use config default)
  if (data.title !== undefined) row.title = data.title || null;
  if (data.subtitle !== undefined) row.subtitle = data.subtitle || null;
  if (data.description !== undefined) row.description = data.description || null;
  if (data.objectives !== undefined) {
    row.objectives = data.objectives && data.objectives.length > 0 ? data.objectives : null;
  }

  const { error } = await svc.from("session_content").upsert(
    row,
    { onConflict: "program_id,track,week_number" }
  );

  if (error) {
    console.error(`[saveSessionContent] ${track} week ${weekNumber}:`, error.message);
    throw new Error(error.message);
  }

  // Bust cached pages so students see the new meeting link / recording immediately
  revalidatePath(`/dashboard/track/${track}/${weekNumber}`, "page");
  revalidatePath("/dashboard", "page");

  return { success: true };
}

/**
 * Read session content for a single week. Uses service client so it works in
 * server components regardless of the viewer's auth state.
 */
export async function getSessionContent(
  track: string,
  weekNumber: number
): Promise<SessionContentRow | null> {
  const { getProgram } = await import("@/lib/programs/server");
  const program = await getProgram();
  const svc = createServiceClient();

  // Look up program ID to scope the query
  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", program.slug)
    .single();

  const { data, error } = await svc
    .from("session_content")
    .select("*")
    .eq("program_id", programRow?.id ?? "")
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
  track: string
): Promise<SessionContentRow[]> {
  const { getProgram } = await import("@/lib/programs/server");
  const program = await getProgram();
  const svc = createServiceClient();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", program.slug)
    .single();

  const { data, error } = await svc
    .from("session_content")
    .select("*")
    .eq("program_id", programRow?.id ?? "")
    .eq("track", track)
    .order("week_number");

  if (error) {
    console.error("getAllSessionContent error:", error.message);
    return [];
  }
  return (data ?? []) as SessionContentRow[];
}

// ─── Instructor Track Assignments ────────────────────────────────────────────

export type InstructorTrackRow = {
  id: string;
  student_id: string;
  track_slug: string;
  program_id: string;
  created_at: string;
};

export async function getInstructorTracks(programSlug: string): Promise<InstructorTrackRow[]> {
  const svc = createServiceClient();
  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  const { data, error } = await svc
    .from("instructor_tracks")
    .select("*")
    .eq("program_id", programRow.id)
    .order("created_at");

  if (error) {
    console.error("getInstructorTracks error:", error.message);
    return [];
  }
  return (data ?? []) as InstructorTrackRow[];
}

export async function assignInstructorTrack(
  studentId: string,
  trackSlug: string,
  programSlug: string
) {
  const { svc } = await requireManager();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) throw new Error("Program not found");

  const { error } = await svc.from("instructor_tracks").upsert(
    {
      student_id: studentId,
      track_slug: trackSlug,
      program_id: programRow.id,
    },
    { onConflict: "student_id,track_slug,program_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function removeInstructorTrack(
  studentId: string,
  trackSlug: string,
  programSlug: string
) {
  const { svc } = await requireManager();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) throw new Error("Program not found");

  const { error } = await svc
    .from("instructor_tracks")
    .delete()
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .eq("program_id", programRow.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin");
  return { success: true };
}

/** Get the track slugs an instructor is assigned to (for the current user) */
export async function getMyInstructorTracks(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("instructor_tracks")
    .select("track_slug")
    .eq("student_id", user.id);

  if (error) {
    console.error("getMyInstructorTracks error:", error.message);
    return [];
  }
  return (data ?? []).map((r: { track_slug: string }) => r.track_slug);
}

// ─── Survey Stats ─────────────────────────────────────────────────────────────

export type SurveyStatsRow = {
  student_id: string;
  survey_type: string;
  completed_at: string | null;
};

export async function getSurveyStats(
  programSlug: string,
  surveyType: string
): Promise<SurveyStatsRow[]> {
  const svc = createServiceClient();
  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  const { data, error } = await svc
    .from("survey_responses")
    .select("student_id, survey_type, completed_at")
    .eq("program_id", programRow.id)
    .eq("survey_type", surveyType);

  if (error) {
    console.error("getSurveyStats error:", error.message);
    return [];
  }
  return (data ?? []) as SurveyStatsRow[];
}

export async function exportSurveyResponses(
  programSlug: string,
  surveyType: string
): Promise<{ student_name: string; email: string; responses: Record<string, unknown>; completed_at: string | null }[]> {
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  const { data, error } = await svc
    .from("survey_responses")
    .select("student_id, responses, completed_at, students(first_name, last_name, email)")
    .eq("program_id", programRow.id)
    .eq("survey_type", surveyType)
    .not("completed_at", "is", null);

  if (error) {
    console.error("exportSurveyResponses error:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const student = row.students as { first_name: string; last_name: string; email: string } | null;
    return {
      student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
      email: student?.email ?? "",
      responses: row.responses as Record<string, unknown>,
      completed_at: row.completed_at as string | null,
    };
  });
}

// ─── Public (anonymous) survey responses — super_admin only ─────────────────

async function requireSuperAdmin() {
  const result = await requireAdmin();
  if (!canSwitchPrograms(result.role)) throw new Error("Not authorized");
  return result;
}

// Records a super-admin view/export/delete against identifiable respondent
// data. Failures log but never block — we'd rather let the admin see their
// data than hard-fail on an audit insert.
async function logAdminAccess(
  svc: ReturnType<typeof createServiceClient>,
  args: {
    actorUserId: string;
    programId: string | null;
    action: "view" | "export" | "delete";
    resource: string;
    rowCount?: number;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await svc.from("admin_access_log").insert({
    actor_user_id: args.actorUserId,
    program_id: args.programId,
    action: args.action,
    resource: args.resource,
    row_count: args.rowCount ?? null,
    metadata: args.metadata ?? null,
  });
  if (error) {
    console.error("admin_access_log insert failed:", {
      code: error.code,
      message: error.message,
    });
  }
}

export type PublicSurveyStatsRow = {
  program_slug: string;
  program_name: string;
  survey_type: string;
  response_count: number;
};

export async function getPublicSurveyStats(): Promise<PublicSurveyStatsRow[]> {
  const { svc, userId } = await requireSuperAdmin();

  const { data, error } = await svc
    .from("public_survey_responses")
    .select("program_id, survey_type, programs(slug, name)");

  if (error) {
    console.error("getPublicSurveyStats error:", error.message);
    return [];
  }

  await logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: "public_survey_responses.stats",
    rowCount: data?.length ?? 0,
  });

  const counts = new Map<string, PublicSurveyStatsRow>();
  for (const row of data ?? []) {
    const programsField = (row as { programs: { slug: string; name: string } | { slug: string; name: string }[] | null }).programs;
    const program = Array.isArray(programsField) ? programsField[0] : programsField;
    if (!program) continue;
    const surveyType = (row as { survey_type: string }).survey_type;
    const key = `${program.slug}::${surveyType}`;
    const existing = counts.get(key);
    if (existing) {
      existing.response_count += 1;
    } else {
      counts.set(key, {
        program_slug: program.slug,
        program_name: program.name,
        survey_type: surveyType,
        response_count: 1,
      });
    }
  }
  return Array.from(counts.values()).sort((a, b) =>
    a.program_name.localeCompare(b.program_name)
  );
}

export async function exportPublicSurveyResponses(
  programSlug: string,
  surveyType: string
): Promise<
  {
    email: string;
    full_name: string;
    responses: Record<string, unknown>;
    completed_at: string | null;
  }[]
> {
  const { svc, userId } = await requireSuperAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  const { data, error } = await svc
    .from("public_survey_responses")
    .select("email, full_name, responses, completed_at")
    .eq("program_id", programRow.id)
    .eq("survey_type", surveyType)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("exportPublicSurveyResponses error:", error.message);
    return [];
  }

  await logAdminAccess(svc, {
    actorUserId: userId,
    programId: programRow.id as string,
    action: "export",
    resource: "public_survey_responses",
    rowCount: data?.length ?? 0,
    metadata: { survey_type: surveyType, program_slug: programSlug },
  });

  return (data ?? []) as {
    email: string;
    full_name: string;
    responses: Record<string, unknown>;
    completed_at: string | null;
  }[];
}

// ─── Submissions & Reflections (Admin) ──────────────────────────────────────

export type AdminSubmissionRow = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  track_slug: string;
  week_number: number;
  description: string | null;
  links: { url: string; label: string }[];
  files: { url: string; name: string; type: string }[];
  submitted_at: string | null;
  feedback_count: number;
};

export type AdminReflectionRow = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  track_slug: string;
  week_number: number;
  responses: Record<string, string>;
  submitted_at: string | null;
  feedback_count: number;
};

export async function getAllSubmissions(
  programSlug: string,
  trackSlug?: string
): Promise<AdminSubmissionRow[]> {
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  let query = svc
    .from("submissions")
    .select("*, students!submissions_student_id_fkey(first_name, last_name, email), submission_feedback(id)")
    .eq("program_id", programRow.id)
    .not("submitted_at", "is", null)
    .order("week_number")
    .order("submitted_at", { ascending: false });

  if (trackSlug) {
    query = query.eq("track_slug", trackSlug);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAllSubmissions error:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const student = row.students as { first_name: string; last_name: string; email: string } | null;
    const feedbackArr = row.submission_feedback as { id: string }[] | null;
    return {
      id: row.id as string,
      student_id: row.student_id as string,
      student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
      student_email: student?.email ?? "",
      track_slug: row.track_slug as string,
      week_number: row.week_number as number,
      description: row.description as string | null,
      links: (row.links ?? []) as { url: string; label: string }[],
      files: (row.files ?? []) as { url: string; name: string; type: string }[],
      submitted_at: row.submitted_at as string | null,
      feedback_count: feedbackArr?.length ?? 0,
    };
  });
}

export async function getAllReflections(
  programSlug: string,
  trackSlug?: string
): Promise<AdminReflectionRow[]> {
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  let query = svc
    .from("reflections")
    .select("*, students!reflections_student_id_fkey(first_name, last_name, email), submission_feedback(id)")
    .eq("program_id", programRow.id)
    .not("submitted_at", "is", null)
    .order("week_number")
    .order("submitted_at", { ascending: false });

  if (trackSlug) {
    query = query.eq("track_slug", trackSlug);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAllReflections error:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const student = row.students as { first_name: string; last_name: string; email: string } | null;
    const feedbackArr = row.submission_feedback as { id: string }[] | null;
    return {
      id: row.id as string,
      student_id: row.student_id as string,
      student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
      student_email: student?.email ?? "",
      track_slug: row.track_slug as string,
      week_number: row.week_number as number,
      responses: (row.responses ?? {}) as Record<string, string>,
      submitted_at: row.submitted_at as string | null,
      feedback_count: feedbackArr?.length ?? 0,
    };
  });
}

export async function addFeedback(data: {
  submissionId?: string;
  reflectionId?: string;
  comment: string;
}) {
  const { svc, userId } = await requireAdmin();

  if (!data.submissionId && !data.reflectionId) {
    throw new Error("Must provide submissionId or reflectionId");
  }

  const { error } = await svc.from("submission_feedback").insert({
    submission_id: data.submissionId ?? null,
    reflection_id: data.reflectionId ?? null,
    reviewer_id: userId,
    comment: data.comment,
  });

  if (error) throw new Error(error.message);
  return { success: true };
}
