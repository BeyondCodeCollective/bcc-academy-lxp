import { redirect } from "next/navigation";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminTabs } from "./admin-tabs";
import type { Student } from "@/lib/types";
import { getProgram } from "@/lib/programs/server";
import { getStudentTracks, getSurveyStats, getInstructorTracks, getMyInstructorTracks } from "./actions";
import type { StudentTrackRow, SurveyStatsRow, InstructorTrackRow } from "./actions";
import { canAccessAdminPanel, canSwitchPrograms, canManageStudents } from "@/lib/roles";
import { getAllPrograms } from "@/lib/programs";

export default async function AdminPage() {
  const program = await getProgram();
  let allStudents: Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">[] = [];
  let allCohorts: { id: string; name: string; display_name: string | null; start_date: string; total_weeks: number }[] = [];
  let studentTracks: StudentTrackRow[] = [];
  let instructorTracks: InstructorTrackRow[] = [];
  let userRole = "student";
  let myInstructorTracks: string[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) redirect("/");

    // Look up program ID for filtering
    const svc = createServiceClient();
    const { data: programRow } = await svc
      .from("programs")
      .select("id")
      .eq("slug", program.slug)
      .single();

    const programId = programRow?.id;

    // Get current user's role
    const { data: studentCheck } = await svc
      .from("students")
      .select("role")
      .eq("id", session.user.id)
      .single();

    userRole = studentCheck?.role ?? "student";

    if (!canAccessAdminPanel(userRole)) redirect("/dashboard");

    // Run all queries in parallel — scoped to this program
    const [studentsResult, cohortsResult] = await Promise.all([
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
    ]);

    allStudents = studentsResult.data || [];
    allCohorts = cohortsResult.data || [];
    studentTracks = await getStudentTracks(program.slug);
    instructorTracks = await getInstructorTracks(program.slug);

    // If instructor, get their assigned tracks
    if (userRole === "instructor") {
      myInstructorTracks = await getMyInstructorTracks();
    }
  }

  // Fetch survey stats for each configured survey
  const surveyStats: Record<string, SurveyStatsRow[]> = {};
  for (const survey of program.surveys ?? []) {
    surveyStats[survey.id] = await getSurveyStats(program.slug, survey.id);
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
        userRole={userRole}
        allPrograms={allProgramsList}
      />
    </div>
  );
}
