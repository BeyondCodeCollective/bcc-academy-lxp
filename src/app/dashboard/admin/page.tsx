import { redirect } from "next/navigation";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminTabs } from "./admin-tabs";
import type { Student } from "@/lib/types";
import { getProgram } from "@/lib/programs/server";
import type { StudentTrackRow, SurveyStatsRow, InstructorTrackRow, PublicSurveyStatsRow } from "./actions";
import { getPublicSurveyStats } from "./actions";
import { canAccessAdminPanel, canSwitchPrograms } from "@/lib/roles";
import { getAllPrograms } from "@/lib/programs";

export default async function AdminPage() {
  const program = await getProgram();
  let allStudents: Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">[] = [];
  let allCohorts: { id: string; name: string; display_name: string | null; start_date: string; total_weeks: number }[] = [];
  let studentTracks: StudentTrackRow[] = [];
  let instructorTracks: InstructorTrackRow[] = [];
  let userRole = "student";
  let myInstructorTracks: string[] = [];
  let publicSurveyStats: PublicSurveyStatsRow[] = [];
  const surveyStats: Record<string, SurveyStatsRow[]> = {};
  const surveyList = program.surveys ?? [];
  const engagementScores: Record<string, { total: number; attendance: number; submissions: number; reflections: number; tutorMessages: number }> = {};

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) redirect("/");

    const svc = createServiceClient();

    // Batch 1: program lookup + current user's role. Needed to authorize the
    // page and to scope every subsequent query to this program.
    const [programRowRes, studentCheckRes] = await Promise.all([
      svc.from("programs").select("id").eq("slug", program.slug).single(),
      svc.from("students").select("role").eq("id", session.user.id).single(),
    ]);

    const programId = programRowRes.data?.id;
    userRole = studentCheckRes.data?.role ?? "student";

    if (!canAccessAdminPanel(userRole)) redirect("/dashboard");

    // Public-survey stats are only shown on dashboardless programs (e.g.
    // Catalyst). On Forge/ATG the widget is hidden entirely, so fetching
    // across the whole public_survey_responses table is pure waste.
    const needsPublicSurveyStats =
      canSwitchPrograms(userRole) && program.tracks.length === 0;

    // Batch 2: every data query the admin page needs, fired in one round trip.
    // Previously each helper re-looked-up the program row and they ran
    // serially, stacking ~8 round-trips. This collapses them to one concurrent
    // batch. publicSurveyStats now lives inside the parallel batch too, so
    // super-admins on Catalyst don't pay a serial round-trip for it.
    const [coreRes, surveyStatsResults, publicStatsRes, engagementRes] = await Promise.all([
      Promise.all([
        svc
          .from("students")
          .select("id, first_name, last_name, email, role, cohort_id")
          .eq("program_id", programId!)
          .order("created_at", { ascending: true }),
        svc
          .from("cohorts")
          .select("id, name, display_name, start_date, total_weeks")
          .eq("program_id", programId!)
          .order("created_at", { ascending: true }),
        svc
          .from("student_tracks")
          .select("*")
          .eq("program_id", programId!)
          .order("created_at"),
        svc
          .from("instructor_tracks")
          .select("*")
          .eq("program_id", programId!)
          .order("created_at"),
        userRole === "instructor"
          ? svc
              .from("instructor_tracks")
              .select("track_slug")
              .eq("student_id", session.user.id)
          : Promise.resolve({ data: null as { track_slug: string }[] | null }),
      ]),
      Promise.all(
        surveyList.map((s) =>
          svc
            .from("survey_responses")
            .select("student_id, survey_type, completed_at")
            .eq("program_id", programId!)
            .eq("survey_type", s.id)
        )
      ),
      needsPublicSurveyStats
        ? getPublicSurveyStats().catch((e) => {
            console.error("getPublicSurveyStats failed:", e);
            return [] as PublicSurveyStatsRow[];
          })
        : Promise.resolve([] as PublicSurveyStatsRow[]),
      Promise.all([
        svc.from("attendance").select("student_id, track, week_number").eq("program_id", programId!),
        svc.from("submissions").select("student_id, track_slug, week_number").eq("program_id", programId!).not("submitted_at", "is", null),
        svc.from("reflections").select("student_id, track_slug, week_number").eq("program_id", programId!).not("submitted_at", "is", null),
        svc.from("tutor_messages").select("student_id").eq("program_id", programId!),
      ]),
    ]);

    const [
      studentsResult,
      cohortsResult,
      studentTracksRes,
      instructorTracksRes,
      myInstrTracksRes,
    ] = coreRes;

    allStudents = studentsResult.data || [];
    allCohorts = cohortsResult.data || [];
    studentTracks = (studentTracksRes.data ?? []) as StudentTrackRow[];
    instructorTracks = (instructorTracksRes.data ?? []) as InstructorTrackRow[];
    myInstructorTracks = ((myInstrTracksRes.data ?? []) as { track_slug: string }[]).map(
      (r) => r.track_slug
    );
    surveyList.forEach((s, i) => {
      surveyStats[s.id] = (surveyStatsResults[i].data ?? []) as SurveyStatsRow[];
    });
    publicSurveyStats = publicStatsRes;

    // Compute engagement scores
    const [attendanceRes, submissionsRes, reflectionsRes, tutorRes] = engagementRes;
    const attendanceRows = (attendanceRes.data ?? []) as { student_id: string; track: string; week_number: number }[];
    const submissionRows = (submissionsRes.data ?? []) as { student_id: string; track_slug: string; week_number: number }[];
    const reflectionRows = (reflectionsRes.data ?? []) as { student_id: string; track_slug: string; week_number: number }[];
    const tutorRows = (tutorRes.data ?? []) as { student_id: string }[];

    const maxWeeks = Math.max(...program.tracks.map((t) => t.totalWeeks), 1);

    for (const s of allStudents) {
      if (s.role !== "student") continue;
      const att = new Set(attendanceRows.filter((r) => r.student_id === s.id).map((r) => `${r.track}-${r.week_number}`)).size;
      const sub = new Set(submissionRows.filter((r) => r.student_id === s.id).map((r) => `${r.track_slug}-${r.week_number}`)).size;
      const ref = new Set(reflectionRows.filter((r) => r.student_id === s.id).map((r) => `${r.track_slug}-${r.week_number}`)).size;
      const tut = tutorRows.filter((r) => r.student_id === s.id).length;

      const attScore = Math.min((att / maxWeeks) * 25, 25);
      const subScore = Math.min((sub / maxWeeks) * 25, 25);
      const refScore = Math.min((ref / maxWeeks) * 25, 25);
      const tutScore = Math.min((tut / 10) * 25, 25);

      engagementScores[s.id] = {
        total: Math.round(attScore + subScore + refScore + tutScore),
        attendance: att,
        submissions: sub,
        reflections: ref,
        tutorMessages: tut,
      };
    }
  }

  const surveyConfigs = (program.surveys ?? []).map((s) => ({
    id: s.id,
    title: s.title,
  }));

  // Serialize track configs for the client component
  const allTracks = program.tracks.map((t) => ({
    slug: t.slug,
    name: t.name,
    shortName: t.shortName,
    totalWeeks: t.totalWeeks,
    sessionsPerWeek: t.sessionsPerWeek,
    instructor: t.instructor,
    sessionTimes: t.sessionTimes,
    weekSummaries: t.weekSummaries,
    weeks: t.weeks.map((w) => ({
      week: w.week,
      title: w.title,
      icon: w.icon,
      sessions: w.sessions.map((s) => ({ title: s.title })),
    })),
  }));

  // Instructors only see their assigned tracks
  const tracks = userRole === "instructor" && myInstructorTracks.length > 0
    ? allTracks.filter((t) => myInstructorTracks.includes(t.slug))
    : allTracks;

  // For super_admin: list all programs for the switcher
  const allProgramsList = canSwitchPrograms(userRole)
    ? getAllPrograms().map((p) => ({ slug: p.slug, name: p.name }))
    : [];

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl space-y-6 px-5 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">Admin Panel</h1>
      <AdminTabs
        cohorts={allCohorts}
        students={allStudents}
        tracks={tracks}
        studentTracks={studentTracks}
        instructorTracks={instructorTracks}
        programSlug={program.slug}
        surveyStats={surveyStats}
        surveyConfigs={surveyConfigs}
        publicSurveyStats={publicSurveyStats}
        userRole={userRole}
        allPrograms={allProgramsList}
        engagementScores={engagementScores}
      />
    </div>
  );
}
