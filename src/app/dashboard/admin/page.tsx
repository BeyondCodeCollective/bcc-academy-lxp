import { redirect } from "next/navigation";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminTabs } from "./admin-tabs";
import type { Student } from "@/lib/types";
import { getProgram } from "@/lib/programs/server";
import type { StudentTrackRow, SurveyStatsRow, InstructorTrackRow, PublicSurveyStatsRow, BCCSurveyResponse } from "./actions";
import { getPublicSurveyStats, getDashboardSurveyStats, getDashboardSurveyResponses } from "./actions";
import { canAccessAdminPanel, canSwitchPrograms } from "@/lib/roles";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { getAllPrograms } from "@/lib/programs";
import type { SurveyConfig } from "@/lib/programs/types";
import { getSurveySchema } from "@/lib/surveys/schemas";
import type { SurveyQuestion } from "@/components/survey-fields";

export type InsightsData = {
  sections: {
    survey: SurveyConfig;
    schema: SurveyQuestion[] | null;
    responses: BCCSurveyResponse[];
  }[];
  programs: { slug: string; name: string }[];
  totalResponses: number;
};

type LunchLearnRow = {
  id: string;
  title: string;
  presenter: string;
  recording_url: string;
  description: string | null;
  recorded_at: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: initialTab } = await searchParams;
  const program = await getProgram();

  // Tab-gated data fetching. The admin page re-renders on every ?tab=
  // change, so we only pay the cost for queries the active tab actually
  // needs. Default-tab heuristic mirrors AdminTabs's own initial state:
  // managers land on "program", instructors on their first track.
  const effectiveTab = initialTab ?? "program";
  const isTrackTab = program.tracks.some((t) => t.slug === effectiveTab);
  const needsEngagement = effectiveTab === "program" || effectiveTab === "students";
  const needsSurveyStats = effectiveTab === "program";
  const needsLunchLearns = effectiveTab === "lunch-learn";
  const needsInsightsData = effectiveTab === "insights";
  void isTrackTab; // reserved — track-tab queries are already inside the core batch
  let allStudents: Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">[] = [];
  let allCohorts: { id: string; name: string; display_name: string | null; start_date: string; total_weeks: number }[] = [];
  let studentTracks: StudentTrackRow[] = [];
  let instructorTracks: InstructorTrackRow[] = [];
  let userRole = "student";
  let myInstructorTracks: string[] = [];
  let publicSurveyStats: PublicSurveyStatsRow[] = [];
  let lunchLearnRecordings: LunchLearnRow[] = [];
  let insightsData: InsightsData | null = null;
  const surveyStats: Record<string, SurveyStatsRow[]> = {};
  const surveyList = [
    ...Object.values(PLATFORM_AUTH_SURVEYS),
    ...(program.surveys ?? []),
  ];
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

    // Public-survey stats are only shown on dashboardless programs
    // (marketing apex BCC-wide view, Catalyst, etc.). On Forge/ATG the
    // widget is hidden entirely, so fetching across the whole
    // public_survey_responses table is pure waste — that query is the
    // single biggest contributor to admin-page latency for super-admins.
    // tracks.length is known synchronously from the resolved program
    // config; no DB round-trip needed to decide.
    const needsPublicSurveyStats =
      canSwitchPrograms(userRole) && program.tracks.length === 0;

    // Dashboardless programs (marketing apex BCC-wide view, Catalyst) have no
    // tracks, cohorts, students, etc. — every program-scoped query would
    // return empty. Skip the heavy batch entirely and only resolve public
    // survey stats. This makes /dashboard/admin on bccacademy.io render in
    // one round-trip instead of ~12 empty queries.
    const isDashboardlessProgram = program.tracks.length === 0;

    if (isDashboardlessProgram) {
      publicSurveyStats = needsPublicSurveyStats
        ? await getPublicSurveyStats().catch((e) => {
            console.error("getPublicSurveyStats failed:", e);
            return [] as PublicSurveyStatsRow[];
          })
        : [];
    } else {
      // Tab-gated batch. The previous version fired every query on every
      // admin page load; now we only pay for what the current tab renders.
      // Core entities (students/cohorts/tracks/instructor enrollments) are
      // always fetched — they're cheap and used as nav metadata everywhere.
      // Survey stats, engagement scores, lunch_learns are skipped on tabs
      // that don't render them.
      const surveyIds = surveyList.map((s) => s.id);

      const [
        coreRes,
        surveyResponsesRes,
        publicStatsRes,
        engagementRes,
      ] = await Promise.all([
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
      // Single .in() query replaces N per-survey queries. Bucketed below.
      needsSurveyStats && surveyIds.length > 0
        ? svc
            .from("survey_responses")
            .select("student_id, survey_type, completed_at")
            .eq("program_id", programId!)
            .in("survey_type", surveyIds)
        : Promise.resolve({ data: null as { student_id: string; survey_type: string; completed_at: string | null }[] | null }),
      needsPublicSurveyStats
        ? getPublicSurveyStats().catch((e) => {
            console.error("getPublicSurveyStats failed:", e);
            return [] as PublicSurveyStatsRow[];
          })
        : Promise.resolve([] as PublicSurveyStatsRow[]),
      needsEngagement
        ? Promise.all([
            svc.from("attendance").select("student_id, track, week_number").eq("program_id", programId!),
            svc.from("submissions").select("student_id, track_slug, week_number").eq("program_id", programId!).not("submitted_at", "is", null),
            svc.from("reflections").select("student_id, track_slug, week_number").eq("program_id", programId!).not("submitted_at", "is", null),
            svc.from("tutor_messages").select("student_id").eq("program_id", programId!),
          ])
        : Promise.resolve(null),
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
    // Bucket the single survey_responses fetch by survey_type.
    if (needsSurveyStats) {
      const allRows = (surveyResponsesRes.data ?? []) as SurveyStatsRow[];
      for (const s of surveyList) surveyStats[s.id] = [];
      for (const row of allRows) {
        (surveyStats[row.survey_type] ??= []).push(row);
      }
    }
    publicSurveyStats = publicStatsRes;

    // Compute engagement scores only when the active tab needs them.
    if (engagementRes) {
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
    } // end !isDashboardlessProgram

    // Lunch & Learns recordings — only fetch when actually on that tab.
    if (canAccessAdminPanel(userRole) && needsLunchLearns) {
      const { data: llRows } = await svc
        .from("lunch_learns")
        .select("id, title, presenter, recording_url, description, recorded_at")
        .order("recorded_at", { ascending: false });
      lunchLearnRecordings = (llRows ?? []) as LunchLearnRow[];
    }

    // Insights data — super-admins only, AND only when on the insights tab.
    // Previously fired on every admin nav (~10 extra queries cross-program);
    // now skipped unless ?tab=insights.
    if (canSwitchPrograms(userRole) && needsInsightsData) {
      const stats = await getDashboardSurveyStats();
      const programSurveys: SurveyConfig[] = getAllPrograms().flatMap(
        (p) => p.surveys ?? [],
      );
      const allSurveysById = new Map<string, SurveyConfig>();
      for (const s of [
        ...Object.values(PLATFORM_AUTH_SURVEYS),
        ...Object.values(PLATFORM_PUBLIC_SURVEYS),
        ...programSurveys,
      ]) {
        if (!allSurveysById.has(s.id)) allSurveysById.set(s.id, s);
      }
      const surveysWithData = Array.from(allSurveysById.values())
        .filter((s) => stats.some((r) => r.survey_type === s.id))
        .sort((a, b) => a.title.localeCompare(b.title));

      const sections = await Promise.all(
        surveysWithData.map(async (survey) => {
          const responses = await getDashboardSurveyResponses(survey.id);
          const schema = getSurveySchema(survey.id);
          return { survey, schema, responses };
        }),
      );

      insightsData = {
        sections,
        programs: getAllPrograms().map((p) => ({ slug: p.slug, name: p.name })),
        totalResponses: sections.reduce((sum, s) => sum + s.responses.length, 0),
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
    startDate: t.startDate,
    lastSessionDayOffset: t.lastSessionDayOffset,
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

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl space-y-6 px-4 sm:px-5 py-8">
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
        engagementScores={engagementScores}
        initialTab={initialTab}
        lunchLearnRecordings={lunchLearnRecordings}
        insightsData={insightsData}
      />
    </div>
  );
}
