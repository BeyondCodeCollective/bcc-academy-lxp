import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAllSessionContent } from "@/app/dashboard/admin/actions";

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

  if (student?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const track = searchParams.get("track");

  if (!track || !["mass", "techplus"].includes(track)) {
    return NextResponse.json({ error: "Invalid track" }, { status: 400 });
  }

  const rows = await getAllSessionContent(track as "mass" | "techplus");
  return NextResponse.json({ rows });
}
