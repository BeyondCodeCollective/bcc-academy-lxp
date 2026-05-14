"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasCapability, canSwitchPrograms } from "@/lib/roles";
import type { Capability } from "@/lib/roles";

async function requireCapability(capability: Capability) {
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

  const role = student?.role ?? "";
  if (!hasCapability(role, capability)) throw new Error("Not authorized");
  return { svc, userId: user.id, role };
}

// Shorthand aliases used by the existing call sites below.
const requireAdmin = () => requireCapability("access_admin_panel");
const requireManager = () => requireCapability("manage_students");

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

// Resolves a program UUID from its slug using the service client.
// Used by actions that receive programSlug as a parameter rather than
// resolving it from the current host.
async function programIdFromSlug(
  svc: ReturnType<typeof createServiceClient>,
  slug: string,
): Promise<string> {
  const { data, error } = await svc
    .from("programs")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error || !data) throw new Error(`Program not found: ${slug}`);
  return data.id;
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
  let programId: string;
  try { programId = await programIdFromSlug(svc, programSlug); }
  catch { return []; }

  const { data, error } = await svc
    .from("student_tracks")
    .select("*")
    .eq("program_id", programId)
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
  const programId = await programIdFromSlug(svc, programSlug);

  const { error } = await svc.from("student_tracks").upsert(
    { student_id: studentId, track_slug: trackSlug, program_id: programId },
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
  const programId = await programIdFromSlug(svc, programSlug);

  const { error } = await svc
    .from("student_tracks")
    .delete()
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .eq("program_id", programId);

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
  const programId = await programIdFromSlug(svc, programSlug);

  const rows = studentIds.map((sid) => ({
    student_id: sid,
    track_slug: trackSlug,
    program_id: programId,
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
// data. Fire-and-forget — we'd rather let the admin see their data than
// make them wait on an audit insert or hard-fail on its failure. Errors
// log asynchronously.
function logAdminAccess(
  svc: ReturnType<typeof createServiceClient>,
  args: {
    actorUserId: string;
    programId: string | null;
    action: "view" | "export" | "delete" | "send_invite";
    resource: string;
    rowCount?: number;
    metadata?: Record<string, unknown>;
  },
): void {
  void svc
    .from("admin_access_log")
    .insert({
      actor_user_id: args.actorUserId,
      program_id: args.programId,
      action: args.action,
      resource: args.resource,
      row_count: args.rowCount ?? null,
      metadata: args.metadata ?? null,
    })
    .then(({ error }) => {
      if (error) {
        console.error("admin_access_log insert failed:", {
          code: error.code,
          message: error.message,
        });
      }
    });
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

  logAdminAccess(svc, {
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

  logAdminAccess(svc, {
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

export type PublicSurveyResponseRow = {
  email: string;
  full_name: string;
  completed_at: string | null;
  invited_at: string | null;
  responses: Record<string, unknown>;
};

export async function listPublicSurveyResponses(
  programSlug: string,
  surveyType: string,
): Promise<PublicSurveyResponseRow[]> {
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  const { data, error } = await svc
    .from("public_survey_responses")
    .select("email, full_name, completed_at, invited_at, responses")
    .eq("program_id", programRow.id)
    .eq("survey_type", surveyType)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("listPublicSurveyResponses error:", error.message);
    return [];
  }
  return (data ?? []) as PublicSurveyResponseRow[];
}

export async function sendInviteAction(
  email: string,
  programSlug: string,
  surveyType: string,
): Promise<{ success: boolean; error?: string }> {
  const { svc, userId } = await requireManager();

  const { getProgramBySlug } = await import("@/lib/programs");
  const program = getProgramBySlug(programSlug);
  const defaultTrack = program.tracks[0];

  if (!defaultTrack) {
    return { success: false, error: "Program has no tracks" };
  }

  const inviteUrl = `https://${program.domain}?track=${defaultTrack.slug}&email=${encodeURIComponent(email)}`;

  const { Resend } = await import("resend");
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { success: false, error: "Email not configured" };
  }
  const resend = new Resend(resendKey);
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS ?? "BCC Academy <noreply@bccacademy.io>";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:${program.colors.primary};padding:32px 24px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">
              You're in!
            </h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
              You've been accepted to ${program.name}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.5;">
              Congratulations! Your application has been reviewed and you're ready to get started.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#1a1a1a;line-height:1.5;">
              Click below to create your account and join your cohort.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
              <tr>
                <td style="background:${program.colors.primary};border-radius:10px;text-align:center;">
                  <a href="${inviteUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Create Your Account →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#999;text-align:center;">
              This link is unique to you. Don't share it with others.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px 24px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;text-align:center;">
              ${program.organization} · ${program.name}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const { error: sendError } = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: `You've been accepted to ${program.name}!`,
    html,
  });

  if (sendError) {
    console.error("[sendInvite] email failed:", sendError);
    return { success: false, error: "Failed to send email" };
  }

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (programRow) {
    await svc
      .from("public_survey_responses")
      .update({ invited_at: new Date().toISOString() })
      .eq("email", email)
      .eq("survey_type", surveyType)
      .eq("program_id", programRow.id);
  }

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: programRow?.id ?? null,
    action: "send_invite",
    resource: "public_survey_responses",
    metadata: { email, programSlug, surveyType },
  });

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function deleteSurveyResponse(
  studentId: string,
  surveyType: string,
  programSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return { ok: false, error: "Program not found" };

  const { error } = await svc
    .from("survey_responses")
    .delete()
    .eq("student_id", studentId)
    .eq("survey_type", surveyType)
    .eq("program_id", programRow.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin");
  return { ok: true };
}

export async function deletePublicSurveyResponse(
  email: string,
  surveyType: string,
  programSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return { ok: false, error: "Program not found" };

  const { error } = await svc
    .from("public_survey_responses")
    .delete()
    .eq("email", email)
    .eq("survey_type", surveyType)
    .eq("program_id", programRow.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin");
  return { ok: true };
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

// ─── Announcements ───────────────────────────────────────────────────────────

export async function createAnnouncement(data: {
  programSlug: string;
  trackSlug?: string;
  message: string;
  expiresAt: string;
}) {
  const { svc, userId } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", data.programSlug)
    .single();

  if (!programRow) throw new Error("Program not found");

  const { error } = await svc.from("announcements").insert({
    program_id: programRow.id,
    track_slug: data.trackSlug || null,
    instructor_id: userId,
    message: data.message,
    expires_at: data.expiresAt,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string) {
  const { svc } = await requireAdmin();
  const { error } = await svc.from("announcements").delete().eq("id", announcementId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getActiveAnnouncements(programSlug: string) {
  const svc = createServiceClient();
  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  const { data, error } = await svc
    .from("announcements")
    .select("id, message, track_slug, created_at, expires_at, instructor_id")
    .eq("program_id", programRow.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getActiveAnnouncements error:", error.message);
    return [];
  }
  return data ?? [];
}

// ─── Track Completions / Certificates ────────────────────────────────────────

export async function grantCompletion(
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

  const { data: completion, error } = await svc
    .from("track_completions")
    .upsert(
      {
        student_id: studentId,
        track_slug: trackSlug,
        program_id: programRow.id,
      },
      { onConflict: "student_id,track_slug,program_id" }
    )
    .select("certificate_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  return { success: true, certificateId: completion?.certificate_id };
}

export async function revokeCompletion(
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
    .from("track_completions")
    .delete()
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .eq("program_id", programRow.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Feedback ────────────────────────────────────────────────────────────────

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

// ─── BCC-wide survey data (cross-program) — super_admin only ─────────────────

export type BCCSurveyResponse = {
  survey_type: string;
  full_name: string;
  email: string;
  program_slug: string;
  program_name: string;
  completed_at: string | null;
  responses: Record<string, unknown>;
  source: "public" | "authenticated";
};

export type BCCSurveyStat = {
  survey_type: string;
  program_slug: string;
  program_name: string;
  count: number;
  source: "public" | "authenticated";
};

export async function getBCCSurveyStats(): Promise<BCCSurveyStat[]> {
  const { svc, userId } = await requireSuperAdmin();

  const [publicRes, authRes] = await Promise.all([
    svc
      .from("public_survey_responses")
      .select("survey_type, program_id, programs(slug, name)")
      .is("withdrawn_at", null),
    svc
      .from("survey_responses")
      .select("survey_type, program_id, programs(slug, name)")
      .eq("survey_type", "bcc-learner-intake")
      .not("completed_at", "is", null),
  ]);

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: "bcc_survey_stats",
  });

  const counts = new Map<string, BCCSurveyStat>();

  function tally(
    rows: { survey_type: string; programs: unknown }[] | null,
    source: "public" | "authenticated",
  ) {
    for (const row of rows ?? []) {
      const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
        slug: string;
        name: string;
      } | null;
      if (!p) continue;
      const key = `${source}::${row.survey_type}::${p.slug}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          survey_type: row.survey_type,
          program_slug: p.slug,
          program_name: p.name,
          count: 1,
          source,
        });
      }
    }
  }

  tally(publicRes.data as { survey_type: string; programs: unknown }[] | null, "public");
  tally(authRes.data as { survey_type: string; programs: unknown }[] | null, "authenticated");

  return Array.from(counts.values());
}

export async function getBCCSurveyResponses(
  surveyType: string,
): Promise<BCCSurveyResponse[]> {
  const { svc, userId } = await requireSuperAdmin();

  const [publicRes, authRes] = await Promise.all([
    svc
      .from("public_survey_responses")
      .select("email, full_name, responses, completed_at, programs(slug, name)")
      .eq("survey_type", surveyType)
      .is("withdrawn_at", null)
      .order("completed_at", { ascending: false }),
    surveyType === "bcc-learner-intake"
      ? svc
          .from("survey_responses")
          .select(
            "responses, completed_at, program_id, programs(slug, name), students(first_name, last_name, email)",
          )
          .eq("survey_type", surveyType)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: `bcc_survey_responses.${surveyType}`,
    rowCount: (publicRes.data?.length ?? 0) + ((authRes.data as unknown[])?.length ?? 0),
  });

  const publicRows: BCCSurveyResponse[] = (publicRes.data ?? []).map((row) => {
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
      slug: string;
      name: string;
    } | null;
    return {
      survey_type: surveyType,
      full_name: (row as { full_name: string }).full_name,
      email: (row as { email: string }).email,
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: (row as { completed_at: string | null }).completed_at,
      responses: (row as { responses: Record<string, unknown> }).responses,
      source: "public",
    };
  });

  const authData = authRes.data as {
    responses: Record<string, unknown>;
    completed_at: string | null;
    programs: { slug: string; name: string } | { slug: string; name: string }[] | null;
    students: { first_name: string; last_name: string; email: string } | null;
  }[] | null;

  const authRows: BCCSurveyResponse[] = (authData ?? []).map((row) => {
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
      slug: string;
      name: string;
    } | null;
    return {
      survey_type: surveyType,
      full_name: row.students
        ? `${row.students.first_name} ${row.students.last_name}`
        : "Unknown",
      email: row.students?.email ?? "",
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: row.completed_at,
      responses: row.responses,
      source: "authenticated",
    };
  });

  return [...publicRows, ...authRows].sort((a, b) => {
    if (!a.completed_at) return 1;
    if (!b.completed_at) return -1;
    return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
  });
}

// ─── Dashboard: all surveys, all sources ─────────────────────────────────────
// Powers the Survey Insights dashboard. Unlike getBCCSurveyStats (which only
// folds in auth responses for bcc-learner-intake), these include every survey
// type that has any responses in either table — so program-bound auth surveys
// like mid-program-spring-2026 and pre-survey-spring-2026 show up.

export async function getDashboardSurveyStats(): Promise<BCCSurveyStat[]> {
  const { svc, userId } = await requireSuperAdmin();

  const [publicRes, authRes] = await Promise.all([
    svc
      .from("public_survey_responses")
      .select("survey_type, program_id, programs(slug, name)")
      .is("withdrawn_at", null),
    svc
      .from("survey_responses")
      .select("survey_type, program_id, programs(slug, name)")
      .not("completed_at", "is", null),
  ]);

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: "dashboard_survey_stats",
  });

  const counts = new Map<string, BCCSurveyStat>();

  function tally(
    rows: { survey_type: string; programs: unknown }[] | null,
    source: "public" | "authenticated",
  ) {
    for (const row of rows ?? []) {
      const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
        slug: string;
        name: string;
      } | null;
      if (!p) continue;
      const key = `${source}::${row.survey_type}::${p.slug}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          survey_type: row.survey_type,
          program_slug: p.slug,
          program_name: p.name,
          count: 1,
          source,
        });
      }
    }
  }

  tally(publicRes.data as { survey_type: string; programs: unknown }[] | null, "public");
  tally(authRes.data as { survey_type: string; programs: unknown }[] | null, "authenticated");

  return Array.from(counts.values());
}

export async function getDashboardSurveyResponses(
  surveyType: string,
): Promise<BCCSurveyResponse[]> {
  const { svc, userId } = await requireSuperAdmin();

  const [publicRes, authRes] = await Promise.all([
    svc
      .from("public_survey_responses")
      .select("email, full_name, responses, completed_at, programs(slug, name)")
      .eq("survey_type", surveyType)
      .is("withdrawn_at", null)
      .order("completed_at", { ascending: false }),
    svc
      .from("survey_responses")
      .select(
        "responses, completed_at, program_id, programs(slug, name), students(first_name, last_name, email)",
      )
      .eq("survey_type", surveyType)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
  ]);

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: `dashboard_survey_responses.${surveyType}`,
    rowCount:
      (publicRes.data?.length ?? 0) + ((authRes.data as unknown[])?.length ?? 0),
  });

  const publicRows: BCCSurveyResponse[] = (publicRes.data ?? []).map((row) => {
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
      slug: string;
      name: string;
    } | null;
    return {
      survey_type: surveyType,
      full_name: (row as { full_name: string }).full_name,
      email: (row as { email: string }).email,
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: (row as { completed_at: string | null }).completed_at,
      responses: (row as { responses: Record<string, unknown> }).responses,
      source: "public",
    };
  });

  const authData = authRes.data as
    | {
        responses: Record<string, unknown>;
        completed_at: string | null;
        programs: { slug: string; name: string } | { slug: string; name: string }[] | null;
        students: { first_name: string; last_name: string; email: string } | null;
      }[]
    | null;

  const authRows: BCCSurveyResponse[] = (authData ?? []).map((row) => {
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
      slug: string;
      name: string;
    } | null;
    return {
      survey_type: surveyType,
      full_name: row.students
        ? `${row.students.first_name} ${row.students.last_name}`
        : "Unknown",
      email: row.students?.email ?? "",
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: row.completed_at,
      responses: row.responses,
      source: "authenticated",
    };
  });

  return [...publicRows, ...authRows].sort((a, b) => {
    if (!a.completed_at) return 1;
    if (!b.completed_at) return -1;
    return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
  });
}
