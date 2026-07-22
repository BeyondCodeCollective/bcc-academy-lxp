import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { canAccessAdminPanel, canSwitchPrograms } from "@/lib/roles";
import { resolveTrackProgram } from "@/lib/programs/server";
import { unitHasArrived } from "@/lib/attendance/compute";

/** Instructors are track-scoped: they may only read or write attendance for a
 *  track they're assigned to (instructor_tracks). Other admin-capable roles
 *  pass through; a missing/invalid track fails closed for instructors. */
async function instructorOwnsTrack(
  role: string,
  userId: string,
  track: unknown,
): Promise<boolean> {
  if (role !== "instructor") return true;
  if (typeof track !== "string" || !track) return false;
  const { data } = await createServiceClient()
    .from("instructor_tracks")
    .select("track_slug")
    .eq("student_id", userId)
    .eq("track_slug", track)
    .limit(1);
  return (data ?? []).length > 0;
}

// POST: admin marks attendance for a student
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: currentStudent } = await supabase
    .from("students")
    .select("id, role, program_id")
    .eq("id", user.id)
    .single<{ id: string; role: string; program_id: string | null }>();

  if (!currentStudent || !canAccessAdminPanel(currentStudent.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { track, week_number, session_number = 1, student_id } = body;

  // Track is a free-form slug — must be present and well-shaped, but no
  // hardcoded allowlist. Any program/cohort/track combination can write
  // attendance; admin role + program_id cross-check below already gate this.
  // Slug format check keeps absurd payloads (SQL strings, long blobs) out
  // of the DB.
  if (!track || typeof track !== "string" || !/^[a-z0-9-]{1,64}$/.test(track)) {
    return NextResponse.json({ error: "Invalid track slug" }, { status: 400 });
  }
  if (!week_number || typeof week_number !== "number") {
    return NextResponse.json({ error: "Invalid week_number" }, { status: 400 });
  }
  if (!student_id) {
    return NextResponse.json({ error: "student_id is required" }, { status: 400 });
  }

  if (!(await instructorOwnsTrack(currentStudent.role, user.id, track))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // No marking sessions that haven't happened. The UI disables future units,
  // but this is the backstop — clicking ahead through the week navigator is
  // exactly how the Security+ launch data got phantom check-ins for sessions
  // that were weeks away. Unknown tracks skip the check rather than break.
  const resolved = await resolveTrackProgram(track);
  if (resolved && !unitHasArrived(resolved.track, week_number)) {
    return NextResponse.json(
      { error: "This session hasn't happened yet — attendance opens on its date" },
      { status: 422 },
    );
  }

  // Program-scope check. RLS isn't enforced cross-tenant here, so verify in app
  // code that the admin and the target student share a program.
  // IMPORTANT: Both IDs must be non-null and match. The comparison `null !== null`
  // evaluates to false, which would incorrectly allow cross-tenant access.
  const { data: targetStudent } = await supabase
    .from("students")
    .select("id, program_id")
    .eq("id", student_id)
    .single<{ id: string; program_id: string | null }>();

  const currentProgramId = currentStudent.program_id;
  const targetProgramId = targetStudent?.program_id;

  // Both must have non-null program_ids and they must match
  if (!currentProgramId || !targetProgramId || currentProgramId !== targetProgramId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // attendance.program_id is NOT NULL and part of the unique key
  // (program_id, student_id, track, week_number, session_number). Resolve the
  // program the student is enrolled under for this track — the same source the
  // Zoom auto-writer uses — and fall back to the already-verified matching
  // program so an admin can still mark a student who predates a student_tracks
  // row. Omitting program_id, or using the old 4-column onConflict target, made
  // every manual mark fail (NOT NULL violation / no matching unique constraint),
  // which is why manual attendance never stuck and the overview read "0 students".
  const { data: enrollment } = await createServiceClient()
    .from("student_tracks")
    .select("program_id")
    .eq("student_id", student_id)
    .eq("track_slug", track)
    .maybeSingle<{ program_id: string }>();
  const attendanceProgramId = enrollment?.program_id ?? targetProgramId;

  const { error } = await supabase.from("attendance").upsert(
    {
      program_id: attendanceProgramId,
      student_id,
      track,
      week_number,
      session_number,
      marked_by: user.id,
    },
    { onConflict: "program_id,student_id,track,week_number,session_number", ignoreDuplicates: true }
  );

  if (error) {
    console.error("Attendance upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE: admin removes an attendance record
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { track, week_number, session_number = 1, student_id } = body;

  if (!student_id || !track || !week_number) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: currentStudent } = await supabase
    .from("students")
    .select("role, program_id")
    .eq("id", user.id)
    .single<{ role: string; program_id: string | null }>();

  if (!canAccessAdminPanel(currentStudent?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!(await instructorOwnsTrack(currentStudent?.role ?? "", user.id, track))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Program-scope check (same reason as POST — verify shared program in app code).
  // IMPORTANT: Both IDs must be non-null and match. `null !== null` is false.
  const { data: targetStudent } = await supabase
    .from("students")
    .select("program_id")
    .eq("id", student_id)
    .single<{ program_id: string | null }>();

  const currentProgramId = currentStudent?.program_id;
  const targetProgramId = targetStudent?.program_id;

  // Both must have non-null program_ids and they must match
  if (!currentProgramId || !targetProgramId || currentProgramId !== targetProgramId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("student_id", student_id)
    .eq("track", track)
    .eq("week_number", week_number)
    .eq("session_number", session_number);

  if (error) {
    console.error("Attendance delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET: fetch attendance records
// - Admin: all students (optionally filtered by track)
// - Student: their own attendance
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ records: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const track = searchParams.get("track");
  const studentId = searchParams.get("student_id");

  const { data: currentStudent } = await supabase
    .from("students")
    .select("role, program_id")
    .eq("id", user.id)
    .single<{ role: string; program_id: string | null }>();

  let query = supabase
    .from("attendance")
    .select("id, student_id, track, week_number, session_number, checked_in_at, marked_by");

  const role = currentStudent?.role ?? "";
  if (canAccessAdminPanel(role)) {
    // Instructors must name one of their own tracks; no track = fail closed.
    if (!(await instructorOwnsTrack(role, user.id, track))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Cross-tenant scope: attendance has no program_id, so a non-super admin is
    // restricted to attendance rows for students in their own program. Without
    // this, passing another program's student_id leaked their records.
    if (!canSwitchPrograms(role)) {
      const svc = createServiceClient();
      const { data: progStudents } = await svc
        .from("students")
        .select("id")
        .eq("program_id", currentStudent?.program_id ?? "");
      const ids = (progStudents ?? []).map((s) => s.id as string);
      // Empty sentinel guarantees no cross-program rows leak if the list is empty.
      query = query.in("student_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    }
    if (track) query = query.eq("track", track);
    if (studentId) query = query.eq("student_id", studentId);
  } else {
    // Non-admin: can only see their own
    query = query.eq("student_id", user.id);
    if (track) query = query.eq("track", track);
  }

  const { data, error } = await query.order("week_number").order("session_number");

  if (error) {
    console.error("Attendance fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data || [] });
}
