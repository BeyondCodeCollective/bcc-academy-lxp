import { redirect } from "next/navigation";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { AdminTabs } from "./admin-tabs";
import type { Student } from "@/lib/types";
import { getProgram } from "@/lib/programs/server";
import type { StudentTrackRow, SurveyStatsRow, InstructorTrackRow, PublicSurveyStatsRow, BCCSurveyResponse } from "./actions";
import { getPublicSurveyStats, getDashboardSurveyStats, getDashboardAllSurveyResponses, getPublicSurveyCountsByType } from "./actions";
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
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const { tab: initialTab, view: initialTrackView } = await searchParams;
  const program = await getProgram();

  // Tab-gated data fetching. The admin page re-renders on every ?tab=
  // change, so we only pay the cost for queries the active tab actually
  // needs. Default-tab heuristic mirrors AdminTabs's own initial state:
  // no ?tab= → Admin Home picker, which only needs the basic tracks +
  // students + studentTracks already in the core batch.
  const effectiveTab = initialTab ?? "home";
  const isTrackTab = program.tracks.some((t) => t.slug === effectiveTab);
  // Engagement scores only feed the per-track People sub-view now that the
  // cross-track People tab is gone.
  const needsEngagement = isTrackTab;
  const needsSurveyStats = false;
  // Home tab only needs id+role for enrollment-count filtering; tabs that
  // display student details need the full row. Similarly, student_tracks are
  // fetched as full rows only for tabs that manage individual enrollments.
  const needsStudents = isTrackTab || effectiveTab === "students" || effectiveTab === "student-work" || effectiveTab === "attendance" || effectiveTab === "home";
  const needsStudentTracks = isTrackTab || effectiveTab === "students" || effectiveTab === "student-work" || effectiveTab === "attendance" || effectiveTab === "home";
  const isHomeTab = effectiveTab === "home";
  const needsInstructorTracks = isTrackTab || effectiveTab === "students";
  const needsCohorts = isHomeTab || isTrackTab || effectiveTab === "students";
  const needsLunchLearns = effectiveTab === "lunch-learn";
  const needsInsightsData = effectiveTab === "insights";
  void needsSurveyStats; // kept as a named constant for the gated query below
  let allStudents: Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">[] = [];
  let allCohorts: { id: string; name: string; display_name: string | null; track_slug: string | null; start_date: string | null; total_weeks: number | null }[] = [];
  let studentTracks: StudentTrackRow[] = [];
  let instructorTracks: InstructorTrackRow[] = [];
  let userRole = "student";
  let myInstructorTracks: string[] = [];
  let publicSurveyStats: PublicSurveyStatsRow[] = [];
  let lunchLearnRecordings: LunchLearnRow[] = [];
  let insightsData: InsightsData | null = null;
  let alumniEnrollments: { track_slug: string; email: string; source: string }[] = [];
  const surveyStats: Record<string, SurveyStatsRow[]> = {};
  const surveyList = [
    ...Object.values(PLATFORM_AUTH_SURVEYS),
    ...(program.surveys ?? []),
  ];
  const engagementScores: Record<string, { total: number; attendance: number; submissions: number; reflections: number; tutorMessages: number }> = {};

  if (isSupabaseConfigured()) {
    // Reuse the React-cached session context resolved by the layout — avoids
    // a duplicate students.select("role") query on every admin page render.
    const ctx = await getSessionContext();
    if (!ctx) redirect("/");
    const userId = ctx.userId;
    userRole = ctx.student?.role ?? "student";

    const svc = createServiceClient();

    // Program ID lookup. Catalyst is an "umbrella" program — its track list
    // is spread from ATG / BCC Centers / Upskill Bahamas configs, but the
    // students enrolled in those tracks are stored with the source program's
    // ID (e.g. a MASS enrollee from /join/atg has program_id = atg). Filtering
    // by catalyst.id alone returns 0 across the board. For Catalyst we
    // aggregate IDs from every underlying program plus Catalyst itself; for
    // any other program we keep the single-program scope.
    //
    // Cached across requests with a short TTL: program UUIDs never change,
    // so there is zero staleness risk.
    const aggregatedSlugs = program.slug === "catalyst"
      ? ["catalyst", "atg", "forge", "forte"]
      : [program.slug];
    const programRows = await getCachedProgramIds(aggregatedSlugs);
    const programIds = (programRows ?? []).map((p) => p.id as string);
    const programId = programRows?.find((p) => p.slug === program.slug)?.id;

    if (!canAccessAdminPanel(userRole)) redirect("/dashboard");

    // The cross-program Survey Insights tab is super-admin-only by content
    // (renders nothing useful for a regular admin), so bounce non-super-admins
    // off ?tab=insights entirely instead of showing them the "Insights are
    // only available to super-admins" empty state. Per-track Surveys sub-tabs
    // are the regular-admin surface for survey data.
    if (effectiveTab === "insights" && !canSwitchPrograms(userRole)) {
      redirect("/dashboard/admin");
    }

    // No auto-redirect away from /dashboard/admin. The previous version
    // bounced super-admins to /dashboard/insights, which meant clicking
    // "Admin" in the sidebar appeared to do nothing whenever you were
    // already on Insights. AdminTabs' defaultTab handles landing inside
    // a useful tab (People for managers/super-admins, first track for
    // instructors); dashboardless programs render their own empty state.

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
        alumniRes,
      ] = await Promise.all([
      Promise.all([
        needsStudents
          ? svc
                  .from("students")
                  .select("id, first_name, last_name, email, role, cohort_id")
                  .in("program_id", programIds)
                  .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">[] }),
        needsCohorts
          ? svc
              .from("cohorts")
              .select("id, name, display_name, track_slug, start_date, total_weeks")
              .in("program_id", programIds)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as { id: string; name: string; display_name: string | null; track_slug: string | null; start_date: string | null; total_weeks: number | null }[] }),
        needsStudentTracks
          ? isHomeTab
              ? svc
                  .from("student_tracks")
                  .select("track_slug, student_id")
                  .in("program_id", programIds)
              : svc
                  .from("student_tracks")
                  .select("id, student_id, track_slug, program_id, created_at")
                  .in("program_id", programIds)
                  .order("created_at")
          : Promise.resolve({ data: [] as StudentTrackRow[] }),
        needsInstructorTracks
          ? svc
              .from("instructor_tracks")
              .select("id, student_id, track_slug, program_id, created_at")
              .in("program_id", programIds)
              .order("created_at")
          : Promise.resolve({ data: [] as InstructorTrackRow[] }),
        userRole === "instructor"
          ? svc
              .from("instructor_tracks")
              .select("track_slug")
              .eq("student_id", userId)
          : Promise.resolve({ data: null as { track_slug: string }[] | null }),
      ]),
      // Single .in() query replaces N per-survey queries. Bucketed below.
      needsSurveyStats && surveyIds.length > 0
        ? svc
            .from("survey_responses")
            .select("student_id, survey_type, completed_at")
            .in("program_id", programIds)
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
            svc.from("attendance").select("student_id, track, week_number").in("program_id", programIds),
            svc.from("submissions").select("student_id, track_slug, week_number").in("program_id", programIds).not("submitted_at", "is", null),
            svc.from("reflections").select("student_id, track_slug, week_number").in("program_id", programIds).not("submitted_at", "is", null),
            svc.from("tutor_messages").select("student_id").in("program_id", programIds),
          ])
        : Promise.resolve(null),
      // Historical alumni (imported from Circle and similar). Only fetched
      // on the program overview tab where the metric and chart use it.
      effectiveTab === "program"
        ? svc
            .from("alumni_enrollments")
            .select("track_slug, email, source")
            .in("program_id", programIds)
        : Promise.resolve({ data: null as { track_slug: string; email: string; source: string }[] | null }),
    ]);

    const [
      studentsResult,
      cohortsResult,
      studentTracksRes,
      instructorTracksRes,
      myInstrTracksRes,
    ] = coreRes;

    allStudents = (studentsResult.data ?? []) as Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id">[];
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

    alumniEnrollments = (alumniRes.data ?? []) as { track_slug: string; email: string; source: string }[];

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
    if (needsInsightsData && !canSwitchPrograms(userRole)) {
      // Diagnostic: a user landed on ?tab=insights but isn't being treated as
      // super-admin. Captures the actual role string we resolved so we can
      // tell legitimate non-super-admin hits from a role-lookup mismatch.
      console.warn("[admin/insights] skipping fetch — role=%s, userId=%s", userRole, userId);
    }
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

      // Single batched fetch replaces N individual getDashboardSurveyResponses
      // calls — two DB round-trips total regardless of how many surveys exist.
      const allResponses = await getDashboardAllSurveyResponses(
        surveysWithData.map((s) => s.id),
      );
      const sections = surveysWithData.map((survey) => ({
        survey,
        schema: getSurveySchema(survey.id),
        responses: allResponses[survey.id] ?? [],
      }));

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

  // Public surveys tied to a track (e.g. network-plus-post → Network+).
  // Fetched only when an admin is viewing a track-scoped tab — keeps the
  // home/people/etc tabs unaffected by the extra query.
  const activeTrack = isTrackTab
    ? program.tracks.find((t) => t.slug === effectiveTab)
    : undefined;
  const activeTrackPublicSurveyIds = activeTrack?.publicSurveys ?? [];
  const publicSurveyCounts = activeTrackPublicSurveyIds.length > 0
    ? await getPublicSurveyCountsByType(activeTrackPublicSurveyIds).catch((e) => {
        console.error("getPublicSurveyCountsByType failed:", e);
        return [] as { survey_type: string; count: number }[];
      })
    : [];
  const trackPublicSurveys = activeTrackPublicSurveyIds.map((id) => {
    const cfg = PLATFORM_PUBLIC_SURVEYS[id];
    const stat = publicSurveyCounts.find((r) => r.survey_type === id);
    return {
      id,
      title: cfg?.title ?? id,
      count: stat?.count ?? 0,
    };
  });

  // Serialize track configs for the client component. Home/insights/lunch-learn
  // tabs only show track cards (basic metadata + enrollment counts), not the
  // week/session details. Skipping weeks for those tabs reduces serialized
  // payload dramatically — ~200 weeks + ~400 sessions objects for a typical
  // 5-track, 10-week, 2-session program.
  const needsFullTrackConfig = isTrackTab || effectiveTab === "students" || effectiveTab === "student-work" || effectiveTab === "attendance";
  const allTracks = program.tracks.map((t) => {
    const base = {
      slug: t.slug,
      name: t.name,
      shortName: t.shortName,
      description: t.description,
      type: t.type,
      totalWeeks: t.totalWeeks,
      sessionsPerWeek: t.sessionsPerWeek,
      instructor: t.instructor,
      sessionTimes: t.sessionTimes,
      startDate: t.startDate,
      startDateTbd: t.startDateTbd,
      lastSessionDayOffset: t.lastSessionDayOffset,
      weekSummaries: t.weekSummaries,
      defaultReflectionPrompts: t.defaultReflectionPrompts,
      submissionsEnabled: t.submissionsEnabled,
      reflectionsEnabled: t.reflectionsEnabled,
    };
    if (needsFullTrackConfig) {
      return {
        ...base,
        weeks: t.weeks.map((w) => ({
          week: w.week,
          title: w.title,
          icon: w.icon,
          sessions: w.sessions.map((s) => ({ title: s.title })),
          submissionPrompts: w.submissionPrompts,
        })),
      };
    }
    return { ...base, weeks: [] };
  });

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
        trackPublicSurveys={trackPublicSurveys}
        userRole={userRole}
        engagementScores={engagementScores}
        initialTab={initialTab}
        initialTrackView={initialTrackView}
        lunchLearnRecordings={lunchLearnRecordings}
        insightsData={insightsData}
        alumniEnrollments={alumniEnrollments}
      />
    </div>
  );
}

/**
 * Cross-request TTL cache for the program-slugs-to-UUIDs lookup. Program
 * UUIDs never change, so this is safe to cache and saves one Supabase
 * round-trip per admin page navigation.
 *
 * IMPORTANT: only cache non-empty results. An empty result is almost
 * always transient (cold-start auth race, RLS context not yet warm) and
 * caching it for 60 seconds was making the admin home read "0 students
 * across every track" for up to a minute after a deploy. Re-query on the
 * next request instead.
 */
const _progIdCache = new Map<string, { data: { id: string; slug: string }[]; ts: number }>();
async function getCachedProgramIds(
  slugs: string[],
): Promise<{ id: string; slug: string }[]> {
  const key = slugs.sort().join(",");
  const cached = _progIdCache.get(key);
  if (cached && Date.now() - cached.ts < 60_000) return cached.data;
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("programs")
    .select("id, slug")
    .in("slug", slugs);
  const result = (data ?? []) as { id: string; slug: string }[];
  if (error || result.length === 0) {
    if (error) console.error("[admin] getCachedProgramIds query failed:", error);
    return result;
  }
  _progIdCache.set(key, { data: result, ts: Date.now() });
  return result;
}
