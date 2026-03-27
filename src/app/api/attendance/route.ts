import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

// POST: student checks in (or admin marks attendance)
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { track, week_number, session_number = 1, student_id } = body;

  // Validate track
  if (!track || !["mass", "techplus"].includes(track)) {
    return NextResponse.json({ error: "Invalid track" }, { status: 400 });
  }
  if (!week_number || typeof week_number !== "number") {
    return NextResponse.json({ error: "Invalid week_number" }, { status: 400 });
  }

  // Determine who we're checking in
  const { data: currentStudent } = await supabase
    .from("students")
    .select("id, role")
    .eq("id", session.user.id)
    .single<{ id: string; role: string }>();

  if (!currentStudent) {
    return NextResponse.json({ error: "Student record not found" }, { status: 404 });
  }

  // Admins can mark attendance for any student; students can only check themselves in
  const targetStudentId =
    currentStudent.role === "admin" && student_id ? student_id : session.user.id;

  const markedBy =
    currentStudent.role === "admin" && student_id ? session.user.id : null;

  // Upsert — ignore if already checked in
  const { error } = await supabase.from("attendance").upsert(
    {
      student_id: targetStudentId,
      track,
      week_number,
      session_number,
      marked_by: markedBy,
    },
    { onConflict: "student_id,track,week_number,session_number", ignoreDuplicates: true }
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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { track, week_number, session_number = 1, student_id } = body;

  if (!student_id || !track || !week_number) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: currentStudent } = await supabase
    .from("students")
    .select("role")
    .eq("id", session.user.id)
    .single<{ role: string }>();

  if (currentStudent?.role !== "admin") {
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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const track = searchParams.get("track");
  const studentId = searchParams.get("student_id");

  const { data: currentStudent } = await supabase
    .from("students")
    .select("role")
    .eq("id", session.user.id)
    .single<{ role: string }>();

  let query = supabase
    .from("attendance")
    .select("id, student_id, track, week_number, session_number, checked_in_at, marked_by");

  if (currentStudent?.role === "admin") {
    if (track) query = query.eq("track", track);
    if (studentId) query = query.eq("student_id", studentId);
  } else {
    // Non-admin: can only see their own
    query = query.eq("student_id", session.user.id);
    if (track) query = query.eq("track", track);
  }

  const { data, error } = await query.order("week_number").order("session_number");

  if (error) {
    console.error("Attendance fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data || [] });
}
