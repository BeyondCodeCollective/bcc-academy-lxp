import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { canAccessAdminPanel } from "@/lib/roles";
import { getProgramId } from "@/lib/programs/server";

export type ProgressRecord = {
  student_id: string;
  track_slug: string;
  week_number: number;
  video_watched: boolean;
  homework_submitted: boolean;
};

export async function GET(_request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ records: [] });
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: currentStudent } = await supabase
    .from("students")
    .select("role")
    .eq("id", session.user.id)
    .single<{ role: string }>();

  if (!canAccessAdminPanel(currentStudent?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = createServiceClient();
  const programId = await getProgramId();

  const [progressRes, submissionsRes] = await Promise.all([
    svc
      .from("week_progress")
      .select("user_id, track_slug, week_number, video_watched_at")
      .eq("program_id", programId),
    svc
      .from("submissions")
      .select("student_id, track_slug, week_number, submitted_at")
      .eq("program_id", programId),
  ]);

  if (progressRes.error || submissionsRes.error) {
    console.error("[week-progress] query error", progressRes.error ?? submissionsRes.error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }

  const progressRows = progressRes.data ?? [];
  const submissionRows = submissionsRes.data ?? [];

  // Build a lookup keyed by `${student_id}|${track_slug}|${week_number}`
  const map = new Map<string, { video_watched: boolean; homework_submitted: boolean }>();

  for (const row of progressRows) {
    const key = `${row.user_id}|${row.track_slug}|${row.week_number}`;
    const existing = map.get(key) ?? { video_watched: false, homework_submitted: false };
    map.set(key, { ...existing, video_watched: !!row.video_watched_at });
  }

  for (const row of submissionRows) {
    const key = `${row.student_id}|${row.track_slug}|${row.week_number}`;
    const existing = map.get(key) ?? { video_watched: false, homework_submitted: false };
    map.set(key, { ...existing, homework_submitted: !!row.submitted_at });
  }

  const records: ProgressRecord[] = Array.from(map.entries()).map(([key, val]) => {
    const [student_id, track_slug, weekStr] = key.split("|");
    return { student_id, track_slug, week_number: Number(weekStr), ...val };
  });

  return NextResponse.json({ records });
}
