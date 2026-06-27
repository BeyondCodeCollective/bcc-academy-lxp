"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireManager, resolveProgramForActor } from "./actions-shared";
import { getSessionContext } from "@/lib/auth/session";
import type { OfficeHour } from "@/lib/programs/types";

// ─── Track Enrollment ─────────────────────────────────────────────────────────

export type StudentTrackRow = {
  id: string;
  student_id: string;
  track_slug: string;
  program_id: string;
  created_at: string;
};

export async function getStudentTracks(programSlug: string): Promise<StudentTrackRow[]> {
  const actor = await requireAdmin();
  const { svc } = actor;
  let programId: string;
  try { programId = await resolveProgramForActor(actor, svc, programSlug); }
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
  const actor = await requireAdmin();
  const { svc } = actor;
  const programId = await resolveProgramForActor(actor, svc, programSlug);

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
  const actor = await requireAdmin();
  const { svc } = actor;
  const programId = await resolveProgramForActor(actor, svc, programSlug);

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
  const actor = await requireAdmin();
  const { svc } = actor;
  const programId = await resolveProgramForActor(actor, svc, programSlug);

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
  meeting_link_3?: string;
  recording_url_3?: string;
  status?: string;
  status_2?: string;
  status_3?: string;
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
  meeting_link_3: string | null;
  recording_url_3: string | null;
  status: string;
  status_2: string;
  status_3: string;
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
  data: SessionContentData,
  programSlug?: string
) {
  const actor = await requireAdmin();
  const { svc, userId } = actor;

  // Resolve program slug — prefer explicit arg, fall back to request context
  let slug = programSlug;
  if (!slug) {
    const { getProgram } = await import("@/lib/programs/server");
    const program = await getProgram();
    slug = program.slug;
  }
  const programId = await resolveProgramForActor(actor, svc, slug);

  const row: Record<string, unknown> = {
    track,
    week_number: weekNumber,
    program_id: programId,
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
  // Only write session-3 columns when they have real values — PostgREST schema
  // cache may lag behind migrations and rejects unknown columns if included
  if (data.meeting_link_3) row.meeting_link_3 = data.meeting_link_3;
  if (data.recording_url_3) row.recording_url_3 = data.recording_url_3;
  if (data.status !== undefined) row.status = data.status;
  if (data.status_2 !== undefined) row.status_2 = data.status_2;
  if (data.status_3 && data.status_3 !== "upcoming") row.status_3 = data.status_3;

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
  // Auth gate: this is an exported "use server" action, so it's invokable
  // directly (not just via the authed page/route that wrap it). Without this,
  // an unauthenticated caller could harvest every meeting/recording link for
  // the program. getSessionContext() is the React-cached session — no extra
  // round-trip for the legit callers, who are already authenticated.
  if (!(await getSessionContext())) return null;
  const { getProgramId } = await import("@/lib/programs/server");
  const programId = await getProgramId();
  const svc = createServiceClient();

  const { data, error } = await svc
    .from("session_content")
    .select("*")
    .eq("program_id", programId)
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
  // Auth gate — see getSessionContent above. Both legit callers (the admin
  // panel and /api/session-content) already authenticate; this stops direct
  // unauthenticated invocation of the action from harvesting links.
  if (!(await getSessionContext())) return [];
  const { getProgramId } = await import("@/lib/programs/server");
  const programId = await getProgramId();
  const svc = createServiceClient();

  const { data, error } = await svc
    .from("session_content")
    .select("*")
    .eq("program_id", programId)
    .eq("track", track)
    .order("week_number");

  if (error) {
    console.error("getAllSessionContent error:", error.message);
    return [];
  }
  return (data ?? []) as SessionContentRow[];
}

// ─── Track Overview (track_overrides) ───────────────────────────────────────
//
// Non-engineer admins edit the track shell (name, instructor, description,
// dates, weekSummaries, etc.) via this action. The DB row overrides the TS
// config field-by-field; null = "use TS default". See merge logic in
// src/lib/programs/server.ts:mergeTrack and the migration in
// supabase/migrations/track_overrides.sql.

export type TrackOverviewPatch = {
  name?: string | null;
  short_name?: string | null;
  description?: string | null;
  instructor?: string | null;
  start_date?: string | null;
  total_weeks?: number | null;
  sessions_per_week?: number | null;
  last_session_day_offset?: number | null;
  session_times?: string[] | null;
  week_summaries?: { week: number; topic: string; icon: string }[] | null;
  default_reflection_prompts?: string[] | null;
  submissions_enabled?: boolean | null;
  reflections_enabled?: boolean | null;
  sequential_gating?: boolean | null;
  office_hours?: OfficeHour[] | null;
};

export async function saveTrackOverview(
  trackSlug: string,
  patch: TrackOverviewPatch,
  programSlug: string,
) {
  const actor = await requireAdmin();
  const { svc, userId } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  // Empty-string text fields become null (= "use TS default") so admins can
  // clear an override without nuking their row. Numeric/array fields pass
  // through unchanged; the caller is expected to send null when clearing.
  const blankToNull = <V>(v: V | undefined): V | null | undefined => {
    if (v === undefined) return undefined;
    if (typeof v === "string" && v.trim() === "") return null;
    return v;
  };

  const row: Record<string, unknown> = {
    program_id: programId,
    track_slug: trackSlug,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };
  if ("name" in patch) row.name = blankToNull(patch.name);
  // Keep short_name in sync with name unless the caller explicitly overrides it.
  if ("short_name" in patch) row.short_name = blankToNull(patch.short_name);
  else if ("name" in patch) row.short_name = blankToNull(patch.name);
  if ("description" in patch) row.description = blankToNull(patch.description);
  if ("instructor" in patch) row.instructor = blankToNull(patch.instructor);
  if ("start_date" in patch) row.start_date = blankToNull(patch.start_date);
  if ("total_weeks" in patch) row.total_weeks = patch.total_weeks;
  if ("sessions_per_week" in patch) row.sessions_per_week = patch.sessions_per_week;
  if ("last_session_day_offset" in patch)
    row.last_session_day_offset = patch.last_session_day_offset;
  if ("session_times" in patch) row.session_times = patch.session_times;
  if ("week_summaries" in patch) row.week_summaries = patch.week_summaries;
  if ("default_reflection_prompts" in patch)
    row.default_reflection_prompts = patch.default_reflection_prompts;
  if ("submissions_enabled" in patch)
    row.submissions_enabled = patch.submissions_enabled;
  if ("reflections_enabled" in patch)
    row.reflections_enabled = patch.reflections_enabled;
  if ("sequential_gating" in patch)
    row.sequential_gating = patch.sequential_gating;
  if ("office_hours" in patch) row.office_hours = patch.office_hours;

  const { error } = await svc.from("track_overrides").upsert(row, {
    onConflict: "program_id,track_slug",
  });
  if (error) {
    console.error(`[saveTrackOverview] ${trackSlug}:`, error.message);
    throw new Error(error.message);
  }

  // Bust every page that renders track metadata so the edit propagates
  // immediately — dashboard grid, track overview, week pages, admin.
  revalidatePath("/dashboard", "page");
  revalidatePath(`/dashboard/track/${trackSlug}`, "page");
  revalidatePath(`/dashboard/track/${trackSlug}/[week]`, "page");
  revalidatePath("/dashboard/admin", "page");
  revalidatePath(`/join/${programSlug}`, "page");

  return { success: true };
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
  const actor = await requireAdmin();
  const { svc } = actor;
  let programId: string;
  try { programId = await resolveProgramForActor(actor, svc, programSlug); }
  catch { return []; }

  const { data, error } = await svc
    .from("instructor_tracks")
    .select("*")
    .eq("program_id", programId)
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
  const actor = await requireManager();
  const { svc } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { error } = await svc.from("instructor_tracks").upsert(
    {
      student_id: studentId,
      track_slug: trackSlug,
      program_id: programId,
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
  const actor = await requireManager();
  const { svc } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { error } = await svc
    .from("instructor_tracks")
    .delete()
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .eq("program_id", programId);

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
