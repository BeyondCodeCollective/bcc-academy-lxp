import { createServiceClient } from "@/lib/supabase/server";
import type { ProgramScope } from "@/lib/programs/scope";

// All queries are scoped to the program(s) in `scope` (catalyst aggregates its
// underlying programs). `.in("program_id", …)` goes right after `.select()` so
// it precedes any `.order()/.limit()` transforms.
export async function fetchAllInsightsData(scope: ProgramScope) {
  const svc = createServiceClient();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const ids = scope.ids;

  const [
    allStudentsRes,
    studentTracksRes,
    alumniRes,
    recentSubmissionsRes,
    recentReflectionsRes,
    activeAttendanceRes,
    activeSubmissionsRes,
    activeReflectionsRes,
    engagedAttendanceRes,
    engagedSubmissionsRes,
    engagedReflectionsRes,
    engagedVideoRes,
  ] = await Promise.all([
    // Learners only. Excluding just "admin" let instructors + super_admins (and
    // is_test QA logins) leak into per-track and phase totals via student_tracks.
    svc
      .from("students")
      .select("id, role, email, first_name, last_name, last_seen_at, last_activity_at")
      .in("program_id", ids)
      .eq("role", "student")
      .eq("is_test", false)
      .eq("is_staff", false),
    svc.from("student_tracks").select("student_id, track_slug").in("program_id", ids),
    svc.from("alumni_enrollments").select("email").in("program_id", ids),
    svc
      .from("submissions")
      .select("id, student_id, track_slug, week_number, submitted_at")
      .in("program_id", ids)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(10),
    svc
      .from("reflections")
      .select("id, student_id, track_slug, week_number, submitted_at")
      .in("program_id", ids)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(10),
    svc
      .from("attendance")
      .select("student_id")
      .in("program_id", ids)
      .gte("checked_in_at", sevenDaysAgoIso),
    svc
      .from("submissions")
      .select("student_id")
      .in("program_id", ids)
      .not("submitted_at", "is", null)
      .gte("submitted_at", sevenDaysAgoIso),
    svc
      .from("reflections")
      .select("student_id")
      .in("program_id", ids)
      .not("submitted_at", "is", null)
      .gte("submitted_at", sevenDaysAgoIso),
    svc.from("attendance").select("student_id").in("program_id", ids),
    svc
      .from("submissions")
      .select("student_id")
      .in("program_id", ids)
      .not("submitted_at", "is", null),
    svc
      .from("reflections")
      .select("student_id")
      .in("program_id", ids)
      .not("submitted_at", "is", null),
    // Video is a "did the work" signal too — omitting it made "Engaged ever"
    // undercount on-demand tracks and disagree with the canonical definition.
    svc
      .from("week_progress")
      .select("user_id")
      .in("program_id", ids)
      .not("video_watched_at", "is", null),
  ]);

  return {
    allStudents: allStudentsRes.data ?? [],
    studentTracks: studentTracksRes.data ?? [],
    alumni: alumniRes.data ?? [],
    recentSubmissions: recentSubmissionsRes.data ?? [],
    recentReflections: recentReflectionsRes.data ?? [],
    activeAttendance: activeAttendanceRes.data ?? [],
    activeSubmissions: activeSubmissionsRes.data ?? [],
    activeReflections: activeReflectionsRes.data ?? [],
    engagedAttendance: engagedAttendanceRes.data ?? [],
    engagedSubmissions: engagedSubmissionsRes.data ?? [],
    engagedReflections: engagedReflectionsRes.data ?? [],
    engagedVideo: engagedVideoRes.data ?? [],
  };
}
