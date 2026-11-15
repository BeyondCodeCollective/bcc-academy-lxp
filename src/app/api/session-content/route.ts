import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAllSessionContent } from "@/app/dashboard/admin/actions";
import { canAccessAdminPanel } from "@/lib/roles";

/**
 * GET /api/session-content?track=mass|techplus
 *
 * Returns all session_content rows for the given track.
 * Admin-only — any other role gets 403.
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ rows: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { createServiceClient } = await import("@/lib/supabase/server");
  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (!canAccessAdminPanel(student?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const track = searchParams.get("track");

  if (!track) {
    return NextResponse.json({ error: "Missing track parameter" }, { status: 400 });
  }

  if (student?.role === "instructor") {
    const { data: own } = await svc
      .from("instructor_tracks")
      .select("track_slug")
      .eq("student_id", user.id)
      .eq("track_slug", track)
      .limit(1);
    if (!own?.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await getAllSessionContent(track);
  return NextResponse.json({ rows });
}
