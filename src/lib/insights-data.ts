import { createServiceClient } from "@/lib/supabase/server";
import { resolveScopeTrackSlugs, type ProgramScope } from "@/lib/programs/scope";

// Membership is by TRACK SLUG, not program_id — the same rule every admin tab
// uses (programs/scope.ts). Signups on the apex domain stamp students and
// activity rows with Catalyst's program_id, so a program_id-scoped Overview
// silently dropped those learners: Beyond the Game read 11 students / 18%
// engaged here vs 14 / 36% on its own Engagement tab (audit 2026-08-18, F7).
// A learner belongs to the scope if enrolled in one of its tracks; activity is
// then filtered by those learners' ids and the scope's track slugs.
export async function fetchAllInsightsData(scope: ProgramScope) {
  const svc = createServiceClient();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const ids = scope.ids;
  const slugs = await resolveScopeTrackSlugs(scope);

  // Membership first: who is enrolled in this scope's tracks.
  const { data: enrollRows } = slugs.length
    ? await svc.from("student_tracks").select("student_id, track_slug").in("track_slug", slugs)
    : { data: [] as { student_id: string; track_slug: string }[] };
  const memberIds = Array.from(new Set((enrollRows ?? []).map((r) => r.student_id)));

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
    memberIds.length
      ? svc
          .from("students")
          .select("id, role, email, first_name, last_name, last_seen_at, last_activity_at")
          .in("id", memberIds)
          .eq("role", "student")
          .eq("is_test", false)
          .eq("is_staff", false)
      : Promise.resolve({ data: [] as { id: string; role: string; email: string; first_name: string | null; last_name: string | null; last_seen_at: string | null; last_activity_at: string | null }[] }),
    Promise.resolve({ data: enrollRows ?? [] }),
    svc.from("alumni_enrollments").select("email").in("program_id", ids),
    svc
      .from("submissions")
      .select("id, student_id, track_slug, week_number, submitted_at")
      .in("track_slug", slugs)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(10),
    svc
      .from("reflections")
      .select("id, student_id, track_slug, week_number, submitted_at")
      .in("track_slug", slugs)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(10),
    svc
      .from("attendance")
      .select("student_id")
      .in("track", slugs)
      .gte("checked_in_at", sevenDaysAgoIso),
    svc
      .from("submissions")
      .select("student_id")
      .in("track_slug", slugs)
      .not("submitted_at", "is", null)
      .gte("submitted_at", sevenDaysAgoIso),
    svc
      .from("reflections")
      .select("student_id")
      .in("track_slug", slugs)
      .not("submitted_at", "is", null)
      .gte("submitted_at", sevenDaysAgoIso),
    svc.from("attendance").select("student_id").in("track", slugs),
    svc
      .from("submissions")
      .select("student_id")
      .in("track_slug", slugs)
      .not("submitted_at", "is", null),
    svc
      .from("reflections")
      .select("student_id")
      .in("track_slug", slugs)
      .not("submitted_at", "is", null),
    // Video is a "did the work" signal too — omitting it made "Engaged ever"
    // undercount on-demand tracks and disagree with the canonical definition.
    svc
      .from("week_progress")
      .select("user_id")
      .in("track_slug", slugs)
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
