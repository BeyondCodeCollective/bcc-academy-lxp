import { redirect } from "next/navigation";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminTabs } from "./admin-tabs";
import type { Student } from "@/lib/types";
import { getProgram } from "@/lib/programs/server";
import type { SurveyStatsRow } from "./actions";
import { canAccessAdminPanel, canSwitchPrograms } from "@/lib/roles";
import { getAllPrograms } from "@/lib/programs";

export default async function AdminPage() {
  const program = await getProgram();
  let allStudents: Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">[] = [];
  let allCohorts: { id: string; name: string; display_name: string | null; start_date: string; total_weeks: number }[] = [];
  let userRole = "student";
  let myInstructorTracks: string[] = [];
  const surveyStats: Record<string, SurveyStatsRow[]> = {};
  const surveyList = program.surveys ?? [];

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

    // Batch 2: only the data the default (program) tab needs. The Enrollments
    // tab lazy-loads its own student_tracks + instructor_tracks client-side on
    // activation — most admin visits never click it, so we skip two queries.
    const [coreRes, surveyStatsResults] = await Promise.all([
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
    ]);

    const [studentsResult, cohortsResult, myInstrTracksRes] = coreRes;

    allStudents = studentsResult.data || [];
    allCohorts = cohortsResult.data || [];
    myInstructorTracks = ((myInstrTracksRes.data ?? []) as { track_slug: string }[]).map(
      (r) => r.track_slug
    );
    surveyList.forEach((s, i) => {
      surveyStats[s.id] = (surveyStatsResults[i].data ?? []) as SurveyStatsRow[];
    });
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
        programSlug={program.slug}
        surveyStats={surveyStats}
        surveyConfigs={surveyConfigs}
        userRole={userRole}
        allPrograms={allProgramsList}
      />
    </div>
  );
}
