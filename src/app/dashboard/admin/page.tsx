import { redirect } from "next/navigation";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { AdminTabs } from "./admin-tabs";
import type { Student } from "@/lib/types";
import { getProgram } from "@/lib/programs/server";
import type { StudentTrackRow, SurveyStatsRow, InstructorTrackRow, PublicSurveyStatsRow, BCCSurveyResponse } from "./actions";
import { getPublicSurveyStats, getPublicSurveyCountsByType } from "./actions";
import { canAccessAdminPanel, canManageStudents, canSwitchPrograms, canViewInsights, assignableRoles } from "@/lib/roles";
import { isMasterEmail } from "@/lib/auth/admins";
import { getProgramGrants, allowedProgramIds, allowedTrackSlugs } from "@/lib/auth/program-access";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { getHomeProgramForTrack } from "@/lib/programs";
import { getHiddenTrackSlugs } from "@/lib/programs/hidden";
import type { SurveyConfig } from "@/lib/programs/types";
import { buildInsightsData } from "@/lib/analytics/insights-data";
import type { SurveyQuestion } from "@/components/survey-fields";
import { fetchPendingPeople, type PendingPerson } from "@/lib/people-hub";
import { getCourseEngagement, getCourseRosterStats } from "@/lib/course-engagement";
import { resolveCurrentUnit, resolveTrackPhase, formatCohortDate } from "@/lib/utils";
import { getEngagementAnalytics, type EngagementAnalytics } from "./actions-analytics";
import { getCoursesAnalytics, type CoursesAnalytics } from "./actions-courses";
import type { CourseEngagementProps } from "@/components/stats/course-engagement";

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
  searchParams: Promise<{ tab?: string; view?: string; sub?: string; course?: string }>;
}) {
  // `sub` makes the Students sub-view (roster / attendance / progress / work /
  // certificates) addressable, so an analytics number can link straight to the
  // list behind it instead of dead-ending on a figure.
  const {
    tab: initialTab,
    view: initialTrackView,
    sub: initialStudentSubView,
    // Shared Analytics course scope. The ?course= plumbing has been in place
    // since #824; the dimensions never read it, which is why the selector was
    // gated off in #825. The funnel reads it now.
    course: analyticsCourse,
  } = await searchParams;
  const [program, ctx] = await Promise.all([
    getProgram(),
    isSupabaseConfigured() ? getSessionContext() : Promise.resolve(null),
  ]);

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
  const needsAnalyticsData = effectiveTab === "analytics";
  const needsCoursesData = effectiveTab === "course-progress";
  void needsSurveyStats; // kept as a named constant for the gated query below
  let allStudents: Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "is_staff" | "cohort_id" | "last_seen_at" | "last_activity_at" | "zip" | "state" | "date_of_birth">[] = [];
  let allCohorts: { id: string; name: string; display_name: string | null; track_slug: string | null; start_date: string | null; total_weeks: number | null }[] = [];
  let studentTracks: StudentTrackRow[] = [];
  let instructorTracks: InstructorTrackRow[] = [];
  let userRole = "student";
  let actorId: string | null = null;
  let actorEmail: string | null = null;
  let myInstructorTracks: string[] = [];
  // Track narrowing from a course-scoped cross-program grant (e.g. "Catalyst,
  // but only Homes for the Summer"). null = whole program. See
  // lib/auth/program-access.
  let grantTrackScope: string[] | null = null;
  let publicSurveyStats: PublicSurveyStatsRow[] = [];
  let lunchLearnRecordings: LunchLearnRow[] = [];
  let insightsData: InsightsData | null = null;
  let analyticsData: EngagementAnalytics | null = null;
  let coursesData: CoursesAnalytics | null = null;
  let courseEngagement: CourseEngagementProps | null = null;
  // Per-learner attendance for the open course's roster: sessions held once,
  // plus each learner's attended count. Null when nobody has checked in.
  let attendanceRates: { held: number; attended: Record<string, number> } | null = null;
  let courseStats: Record<
    string,
    { total: number; active: number; fullAttendance: number | null; sessionsHeld: number }
  > = {};
  let alumniEnrollments: { track_slug: string; email: string; source: string }[] = [];
  let pendingPeople: PendingPerson[] = [];
  let unviewedAssessments: number | null = null;
  const surveyStats: Record<string, SurveyStatsRow[]> = {};
  const surveyList = [
    ...Object.values(PLATFORM_AUTH_SURVEYS),
    ...(program.surveys ?? []),
  ];
  const engagementScores: Record<string, { total: number; attendance: number; submissions: number; reflections: number; videos: number }> = {};

  if (isSupabaseConfigured() && !ctx) redirect("/");
  if (isSupabaseConfigured() && ctx) {
    // Session context resolved in parallel with getProgram() above.
    const userId = ctx.userId;
    actorId = userId;
    userRole = ctx.student?.role ?? "student";
    actorEmail = ctx.student?.email ?? ctx.userEmail ?? null;

    const svc = createServiceClient();

    // Program ID lookup. Every program is standalone — Catalyst, Beyond the
    // Game (atg), Beyond Code Centers, and Forte each scope to their own
    // program id; students/data live under that id. Cached across requests
    // with a short TTL: program UUIDs never change, so there is zero staleness
    // risk.
    const aggregatedSlugs = [program.slug === "marketing" ? "catalyst" : program.slug];
    const programRows = await getCachedProgramIds(aggregatedSlugs);
    const programIds = (programRows ?? []).map((p) => p.id as string);
    const programTrackSlugs = program.tracks.map((t) => t.slug);
    const programId = programRows?.find((p) => p.slug === program.slug)?.id;

    if (!canAccessAdminPanel(userRole)) redirect("/dashboard");

    // Program boundary for non-super-admins. Holding an admin/instructor role
    // proves you run SOME program — it never proved you run THIS one, so
    // reaching another program's admin surface (its domain, a switcher cookie)
    // showed you its roster. Access = your home program plus your grants.
    if (!canSwitchPrograms(userRole) && !isMasterEmail(actorEmail) && programId) {
      const [grants, homeRow] = await Promise.all([
        getProgramGrants(userId),
        svc
          .from("students")
          .select("program_id")
          .eq("id", userId)
          .maybeSingle<{ program_id: string | null }>(),
      ]);
      const homeProgramId = homeRow.data?.program_id ?? null;
      const allowed = allowedProgramIds(homeProgramId, grants);
      // Only enforce once we actually know where this person belongs — an
      // account with neither a program stamp nor a grant keeps the old
      // behaviour rather than being locked out of the panel.
      if (allowed.length > 0 && !allowed.includes(programId)) {
        redirect("/dashboard");
      }
      grantTrackScope = allowedTrackSlugs(homeProgramId, grants, programId);
    }

    // Survey Insights is open to any admin, but program admins see only their
    // own program's data (scoped server-side in the actions below); super-admins
    // get the BCC-wide view. Instructors have no insights access, so bounce them
    // off ?tab=insights entirely rather than showing an empty state.
    if (effectiveTab === "insights" && !canViewInsights(userRole)) {
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
                  .select("id, first_name, last_name, email, role, is_staff, cohort_id, last_seen_at, last_activity_at, zip, state, date_of_birth")
                  // Program members PLUS every super_admin: cross-program staff
                  // (e.g. someone running both Catalyst and Beyond Code Centers)
                  // should appear in each program's People tab, not only under
                  // the program their account happened to be created in.
                  .or(
                    programIds.length > 0
                      ? `program_id.in.(${programIds.join(",")}),role.eq.super_admin`
                      : "role.eq.super_admin",
                  )
                  // Internal QA logins never belong on a visitor-facing roster,
                  // attendance list, or risk view.
                  .eq("is_test", false)
                  .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "is_staff" | "cohort_id" | "last_seen_at" | "last_activity_at" | "zip" | "state" | "date_of_birth">[] }),
        needsCohorts
          ? svc
              .from("cohorts")
              .select("id, name, display_name, track_slug, start_date, total_weeks")
              .in("program_id", programIds)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as { id: string; name: string; display_name: string | null; track_slug: string | null; start_date: string | null; total_weeks: number | null }[] }),
        // Enrollment scope = THIS program's track slugs (globally unique), not
        // program_id — signups on the apex domain stamp Catalyst, and filtering
        // by program_id blanked standalone program rosters (HS cohort, BCC
        // Centers) whose enrollments were filed under it.
        needsStudentTracks
          ? isHomeTab
              ? svc
                  .from("student_tracks")
                  .select("track_slug, student_id")
                  .in("track_slug", programTrackSlugs)
              : svc
                  .from("student_tracks")
                  .select("id, student_id, track_slug, program_id, created_at")
                  .in("track_slug", programTrackSlugs)
                  .order("created_at")
          : Promise.resolve({ data: [] as StudentTrackRow[] }),
        needsInstructorTracks
          ? svc
              .from("instructor_tracks")
              .select("id, student_id, track_slug, program_id, created_at")
              // Deliberately NOT filtered by program. The staff roster above
              // already spans programs (it ORs in every super_admin), so
              // scoping assignments to the active program made cross-program
              // instructors render as teaching nothing — their rows exist,
              // they're just filed under another program. Re-assigning from
              // the "empty" list then no-ops against the existing row, so the
              // list looks permanently broken and un-fixable. The roster is
              // the scope; this table is small and keyed to it.
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
            // Scoped by track slug (globally unique), not program_id stamp —
            // activity recorded under another program's id (apex-domain flows
            // stamp Catalyst) still belongs to this program's courses.
            svc.from("attendance").select("student_id, track, week_number").in("track", programTrackSlugs),
            svc.from("submissions").select("student_id, track_slug, week_number").in("track_slug", programTrackSlugs).not("submitted_at", "is", null),
            svc.from("reflections").select("student_id, track_slug, week_number").in("track_slug", programTrackSlugs).not("submitted_at", "is", null),
            // Video is a did-the-work engagement signal (self-paced tracks have
            // no attendance); tutor chat was ACTIVITY, not engagement, so it no
            // longer feeds the score.
            svc.from("week_progress").select("user_id, track_slug, week_number").in("track_slug", programTrackSlugs).not("video_watched_at", "is", null),
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

    allStudents = (studentsResult.data ?? []) as Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "is_staff" | "cohort_id" | "last_seen_at" | "last_activity_at" | "zip" | "state" | "date_of_birth">[];
    allCohorts = cohortsResult.data || [];
    studentTracks = (studentTracksRes.data ?? []) as StudentTrackRow[];
    instructorTracks = (instructorTracksRes.data ?? []) as InstructorTrackRow[];

    // Membership is defined by ENROLLMENT, not just the account's program_id
    // stamp. A learner whose account was stamped under another program (signed
    // up on a different surface) but who is enrolled in THIS program's courses
    // belongs on this roster — without this, the HS cohort read "2 enrolled"
    // while its Students list showed zero. Supplement the stamped set with
    // anyone holding an enrollment or instructor assignment here.
    if (needsStudents) {
      const have = new Set(allStudents.map((s) => s.id));
      const missingIds = Array.from(
        new Set(
          [...studentTracks, ...instructorTracks]
            .map((e) => e.student_id)
            .filter((id) => !have.has(id)),
        ),
      );
      if (missingIds.length > 0) {
        const { data: extra } = await svc
          .from("students")
          .select("id, first_name, last_name, email, role, is_staff, cohort_id, last_seen_at, last_activity_at, zip, state, date_of_birth")
          .in("id", missingIds)
          .eq("is_test", false);
        allStudents = [
          ...allStudents,
          ...((extra ?? []) as typeof allStudents),
        ];
      }
    }
    myInstructorTracks = ((myInstrTracksRes.data ?? []) as { track_slug: string }[]).map(
      (r) => r.track_slug
    );

    // People hub: allowlisted/invited emails with no account yet, for the
    // current program's tracks. Only on the People tab.
    // Managers only: instructors are view-only on their course's roster and
    // can't act on invites/allowlists, so don't ship them the pending emails.
    if (
      effectiveTab === "students" &&
      (canManageStudents(userRole) || isMasterEmail(actorEmail))
    ) {
      const studentEmails = new Set(
        allStudents.map((s) => (s.email ?? "").toLowerCase()).filter(Boolean),
      );
      pendingPeople = await fetchPendingPeople(
        program.tracks.map((t) => t.slug),
        studentEmails,
      );
    }
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
      const [attendanceRes, submissionsRes, reflectionsRes, videoRes] = engagementRes;
      const attendanceRows = (attendanceRes.data ?? []) as { student_id: string; track: string; week_number: number }[];
      const submissionRows = (submissionsRes.data ?? []) as { student_id: string; track_slug: string; week_number: number }[];
      const reflectionRows = (reflectionsRes.data ?? []) as { student_id: string; track_slug: string; week_number: number }[];
      const videoRows = (videoRes.data ?? []) as { user_id: string; track_slug: string; week_number: number }[];

      const maxWeeks = Math.max(...program.tracks.map((t) => t.totalWeeks), 1);

      // Canonical engagement (docs/analytics-plan.md): the four did-the-work
      // signals, each worth up to 25 pts → /100. Video replaces the old tutor
      // term so self-paced tracks aren't structurally under-scored.
      for (const s of allStudents) {
        if (s.role !== "student" || s.is_staff) continue;
        const att = new Set(attendanceRows.filter((r) => r.student_id === s.id).map((r) => `${r.track}-${r.week_number}`)).size;
        const sub = new Set(submissionRows.filter((r) => r.student_id === s.id).map((r) => `${r.track_slug}-${r.week_number}`)).size;
        const ref = new Set(reflectionRows.filter((r) => r.student_id === s.id).map((r) => `${r.track_slug}-${r.week_number}`)).size;
        const vid = new Set(videoRows.filter((r) => r.user_id === s.id).map((r) => `${r.track_slug}-${r.week_number}`)).size;

        const attScore = Math.min((att / maxWeeks) * 25, 25);
        const subScore = Math.min((sub / maxWeeks) * 25, 25);
        const refScore = Math.min((ref / maxWeeks) * 25, 25);
        const vidScore = Math.min((vid / maxWeeks) * 25, 25);

        engagementScores[s.id] = {
          total: Math.round(attScore + subScore + refScore + vidScore),
          attendance: att,
          submissions: sub,
          reflections: ref,
          videos: vid,
        };
      }
    }
    } // end !isDashboardlessProgram

    // Unviewed assessment results — shown as a nudge on the home tab.
    if (isHomeTab && canAccessAdminPanel(userRole)) {
      const { count } = await svc
        .from("assessment_results")
        .select("*", { count: "exact", head: true })
        .is("facilitator_viewed_at", null);
      unviewedAssessments = count ?? 0;
    }

    // Lunch & Learns recordings — only fetch when actually on that tab.
    if (canAccessAdminPanel(userRole) && needsLunchLearns) {
      const { data: llRows } = await svc
        .from("lunch_learns")
        .select("id, title, presenter, recording_url, description, recorded_at")
        .order("recorded_at", { ascending: false });
      lunchLearnRecordings = (llRows ?? []) as LunchLearnRow[];
    }

    // Insights data — any admin (program-scoped) or super-admin (BCC-wide),
    // AND only when on the insights tab. Previously fired on every admin nav
    // (~10 extra queries cross-program); now skipped unless ?tab=insights.
    if (needsInsightsData && !canViewInsights(userRole)) {
      // Intentionally silent — admin loaded without insights access; skip fetch.
    }
    if (canViewInsights(userRole) && needsInsightsData) {
      // Scope Survey Insights to the CURRENT program for everyone (incl.
      // super-admins) via the resolved program ids — no cross-program firehose,
      // and the cohort dropdown only lists this program's cohorts. The BCC-wide
      // operational dashboard at /dashboard/insights is scoped separately.
      // Same assembly the PDF export route uses, so screen + PDF never drift.
      insightsData = await buildInsightsData(programIds, aggregatedSlugs);
    }

    // Program-level engagement analytics — scoped to the CURRENT program for
    // every role (the action enforces this), so it tracks the program switcher.
    if (canViewInsights(userRole) && needsAnalyticsData) {
      // Same course scope the learner table already uses, so the funnel and
      // the rows below it describe the same population.
      analyticsData = await getEngagementAnalytics(analyticsCourse).catch(() => null);
    }

    // Courses & Progress analytics — same current-program scoping as Engagement.
    if (canViewInsights(userRole) && needsCoursesData) {
      coursesData = await getCoursesAnalytics().catch(() => null);
    }

    // Enrolled + active per course for the course-picker list. Computed here
    // rather than on the client, which only has program-scoped students and a
    // browsing timestamp: that undercounts the roster (learners whose
    // students.program_id points at another program) and reports a live Zoom
    // camp as "0 active". Same signals as getCourseEngagement, so the list and
    // the course Overview agree.
    courseStats = await getCourseRosterStats(
      program.tracks.map((t) => t.slug),
    ).catch(() => ({}));

    // Per-course engagement snapshot for the open course tab — the admin
    // feedback loop on the learner streak cards. Only the active course's
    // aggregates are fetched.
    if (isTrackTab) {
      const t = program.tracks.find((tk) => tk.slug === effectiveTab);
      if (t) {
        // Per-learner attendance for the roster badge. Keyed on week+session,
        // not week alone — a course meeting twice a week would otherwise read
        // 100% for someone who only ever comes on Tuesdays. "Held" is derived
        // from check-ins, since the schedule can't say a session actually ran.
        const { data: attRows } = await svc
          .from("attendance")
          .select("student_id, week_number, session_number")
          .eq("track", t.slug)
          .not("checked_in_at", "is", null);
        const held = new Set(
          (attRows ?? []).map((r) => `${r.week_number}-${r.session_number}`),
        ).size;
        if (held > 0) {
          const perLearner = new Map<string, Set<string>>();
          for (const r of attRows ?? []) {
            if (!perLearner.has(r.student_id)) perLearner.set(r.student_id, new Set());
            perLearner.get(r.student_id)!.add(`${r.week_number}-${r.session_number}`);
          }
          attendanceRates = { held, attended: {} };
          for (const [id, set] of perLearner) attendanceRates.attended[id] = set.size;
        }
        courseEngagement = await getCourseEngagement(t.name, t.slug, {
          hasVideoContent: t.weeks.some((w) => !!w.videoUrl),
          submissionsEnabled: t.submissionsEnabled !== false,
          unitLabel: t.unitLabel ?? "Week",
        }).catch(() => null);
        // Pre-start, "3/16 active · 12 idle" reads as failure when it's a full
        // roster waiting on day one — lead with enrollment instead.
        if (courseEngagement && resolveTrackPhase(t) === "upcoming") {
          courseEngagement = {
            ...courseEngagement,
            upcoming: true,
            startLabel: t.startDateTbd ? null : formatCohortDate(t.startDate),
          };
        }
      }
    }
  }

  const surveyConfigs = (program.surveys ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    // Which tracks opt out — the per-track Surveys tab hides these, so a
    // Security+ instructor isn't offered AI Fundamentals surveys.
    skipForTracks: s.skipForTracks,
  }));

  // Public surveys tied to a track (e.g. network-plus-post → Network+).
  // Fetched only when an admin is viewing a track-scoped tab — keeps the
  // home/people/etc tabs unaffected by the extra query.
  let activeTrack: typeof program.tracks[0] | undefined;
  let activeTrackPublicSurveyIds: string[] = [];
  let trackPublicSurveys: { id: string; title: string; count: number }[] = [];
  // Auth surveys this course's enrolled students have actually answered.
  // null = not a track tab (no filtering). The course Surveys tab is an
  // insights list, and the old opt-out (skipForTracks) rule surfaced every
  // program survey under every course — an unrelated survey has no business
  // there, and with zero responses there'd be nothing to view anyway.
  let trackAnsweredSurveyIds: string[] | null = null;
  /** Enrolled LEARNERS in the open course — the denominator for response rate. */
  let trackEnrolledCount = 0;
  /** survey id → distinct learners from this course who answered it. */
  let trackSurveyRespondents: Record<string, number> = {};

  if (isSupabaseConfigured()) {
    activeTrack = isTrackTab
      ? program.tracks.find((t) => t.slug === effectiveTab)
      : undefined;
    activeTrackPublicSurveyIds = activeTrack?.publicSurveys ?? [];
    if (activeTrack) {
      // Learners only — staff hold enrollments so they can see a course, and
      // counting them would make a response rate read low for a class that
      // fully responded. Same filter the completion rate uses.
      const learnerIds = new Set(
        allStudents
          .filter((s) => s.role === "student" && !s.is_staff)
          .map((s) => s.id),
      );
      const trackStudentIds = Array.from(
        new Set(
          studentTracks
            .filter((e) => e.track_slug === activeTrack!.slug)
            .map((e) => e.student_id)
            .filter((id) => learnerIds.has(id)),
        ),
      );
      trackEnrolledCount = trackStudentIds.length;
      const surveyIds = (program.surveys ?? []).map((sv) => sv.id);
      if (trackStudentIds.length > 0 && surveyIds.length > 0) {
        const { data: answered } = await createServiceClient()
          .from("survey_responses")
          .select("survey_type, student_id")
          .in("survey_type", surveyIds)
          .in("student_id", trackStudentIds);
        trackAnsweredSurveyIds = Array.from(
          new Set((answered ?? []).map((r) => r.survey_type as string)),
        );
        // Distinct respondents per survey. THE number this page was missing:
        // "15 of 16 answered the pre-survey, 1 of 16 answered the post" is how
        // you notice a cohort never came back — AI Fundamentals sat at 15-vs-1
        // for weeks with nothing anywhere saying so.
        const byS = new Map<string, Set<string>>();
        for (const r of answered ?? []) {
          const id = r.survey_type as string;
          if (!byS.has(id)) byS.set(id, new Set());
          byS.get(id)!.add(r.student_id as string);
        }
        trackSurveyRespondents = Object.fromEntries(
          Array.from(byS, ([id, set]) => [id, set.size]),
        );
      } else {
        trackAnsweredSurveyIds = [];
      }
    }
    const publicSurveyCounts = activeTrackPublicSurveyIds.length > 0
      ? await getPublicSurveyCountsByType(activeTrackPublicSurveyIds).catch((e) => {
          console.error("getPublicSurveyCountsByType failed:", e);
          return [] as { survey_type: string; count: number }[];
        })
      : [];
    trackPublicSurveys = activeTrackPublicSurveyIds.map((id) => {
      const cfg = PLATFORM_PUBLIC_SURVEYS[id];
      const stat = publicSurveyCounts.find((r) => r.survey_type === id);
      return {
        id,
        title: cfg?.title ?? id,
        count: stat?.count ?? 0,
      };
    });
  }

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
      // Correct current unit for day-gated camps (advances by comingSoonUntil,
      // not the 7-day cycle). Computed here where the full config with weeks[]
      // is available; the admin tabs/attendance default to it instead of
      // computeCurrentWeek, which pins at Day 1 all camp.
      currentUnit: resolveCurrentUnit(t),
      // Which headline number is honest for this course: enrolled before it
      // starts, active while it runs, completion once it's over.
      phase: resolveTrackPhase(t),
      unitLabel: t.unitLabel,
      selfPaced: t.selfPaced,
      sessionsPerWeek: t.sessionsPerWeek,
      instructor: t.instructor,
      companionOf: t.companionOf,
      sessionTimes: t.sessionTimes,
      startDate: t.startDate,
      startDateTbd: t.startDateTbd,
      lastSessionDayOffset: t.lastSessionDayOffset,
      weekSummaries: t.weekSummaries,
      defaultReflectionPrompts: t.defaultReflectionPrompts,
      submissionsEnabled: t.submissionsEnabled,
      reflectionsEnabled: t.reflectionsEnabled,
      sequentialGating: t.sequentialGating,
      officeHours: t.officeHours ?? [],
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

  // Catalyst is an umbrella that aggregates other programs' tracks (Forte's
  // ai-literacy, etc.). In the program-first admin, show only Catalyst's OWN
  // courses here — the aggregated ones are managed under their home program.
  const ownTracks =
    program.slug === "catalyst"
      ? allTracks.filter((t) => {
          const home = getHomeProgramForTrack(t.slug);
          return !home || home.slug === "catalyst";
        })
      : allTracks;

  // Drop courses the super-admin has hidden via Manage Courses — they vanish
  // from the admin home (and catalog) but keep all data and are one click to
  // restore. Works for hardcoded and DB courses alike.
  const hiddenSlugs = await getHiddenTrackSlugs();
  const visibleTracks = ownTracks.filter((t) => !hiddenSlugs.has(t.slug));

  // A course-scoped grant confines someone to the named courses inside a
  // program they don't otherwise belong to — the same narrowing instructors
  // get from their assignments, just sourced from the grant.
  const grantScopedTracks = grantTrackScope
    ? visibleTracks.filter((t) => grantTrackScope.includes(t.slug))
    : visibleTracks;

  // Instructors only see their assigned tracks
  const tracks = userRole === "instructor" && myInstructorTracks.length > 0
    ? grantScopedTracks.filter((t) => myInstructorTracks.includes(t.slug))
    : grantScopedTracks;

  // Instructors see only the PEOPLE in their own courses, not the whole
  // program roster. Without this, the People and Attendance tabs listed every
  // student in the program (tracks were scoped above, students weren't).
  // Enrollments are trimmed to the same tracks so nothing else re-derives the
  // full picture from them.
  // Same for a course-scoped grant: courses were narrowed above, so narrow the
  // people and enrollments too or the roster still lists the whole program.
  if (grantTrackScope) {
    const scope = new Set(grantTrackScope);
    const visibleIds = new Set(
      studentTracks.filter((e) => scope.has(e.track_slug)).map((e) => e.student_id),
    );
    if (actorId) visibleIds.add(actorId);
    allStudents = allStudents.filter((s) => visibleIds.has(s.id));
    studentTracks = studentTracks.filter((e) => scope.has(e.track_slug));
    instructorTracks = instructorTracks.filter((e) => scope.has(e.track_slug));
  }

  if (userRole === "instructor" && myInstructorTracks.length > 0) {
    const myTrackSet = new Set(myInstructorTracks);
    const visibleIds = new Set(
      studentTracks
        .filter((e) => myTrackSet.has(e.track_slug))
        .map((e) => e.student_id),
    );
    if (actorId) visibleIds.add(actorId);
    allStudents = allStudents.filter((s) => visibleIds.has(s.id));
    studentTracks = studentTracks.filter((e) => myTrackSet.has(e.track_slug));
  }

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl space-y-6 px-4 sm:px-8 md:px-5 py-8">
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
        trackAnsweredSurveyIds={trackAnsweredSurveyIds}
        trackEnrolledCount={trackEnrolledCount}
        trackSurveyRespondents={trackSurveyRespondents}
        userRole={userRole}
        isMaster={isMasterEmail(actorEmail)}
        assignableRoles={assignableRoles(userRole, isMasterEmail(actorEmail))}
        engagementScores={engagementScores}
        courseStats={courseStats}
        initialTab={initialTab}
        initialTrackView={initialTrackView}
        initialStudentSubView={initialStudentSubView}
        lunchLearnRecordings={lunchLearnRecordings}
        insightsData={insightsData}
        analyticsData={analyticsData}
        analyticsCourse={analyticsCourse}
        coursesData={coursesData}
        courseEngagement={courseEngagement}
        attendanceRates={attendanceRates}
        pendingPeople={pendingPeople}
        alumniEnrollments={alumniEnrollments}
        unviewedAssessments={unviewedAssessments ?? 0}
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
