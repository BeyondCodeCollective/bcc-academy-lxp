import "server-only";
import { calculateMvpAges } from "./demographics";
import { calculateMvpIncome, type MvpIncomeResponse } from "./household-income";
import { loadMvpIncome } from "./income-queries";

import { getSessionContext } from "@/lib/auth/session";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";
import { allowedProgramIds, allowedTrackSlugs, effectiveRoleInProgram, type ProgramGrant } from "@/lib/auth/program-access";
import { canViewMvp } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getEveryProgramConfig, getHomeProgramForTrack } from "@/lib/programs";
import type { MvpDashboardData, MvpProgramRow } from "./types";
import type { MvpAttendanceRecord } from "./milestones";
import type { MvpScheduleInput } from "./schedule";
import { calculateMvpCoursePerformance, type MvpSessionDelivery } from "./course-performance";
import { calculateMvpStartSummary, type MvpOfferingStarts } from "./start-summary";
import { calculateMvpCompletion } from "./completion";
import { calculateMvpCompletionSummary, type MvpOfferingCompletions } from "./completion-summary";
import { resolveMvpLifecycle, countMvpUpcomingEnrollments } from "./lifecycle";
import { loadMvpSurveyOutcomes, type MvpSurveyOutcomeGroup } from "./survey-queries";

// This data slice accepts program/course/profile-location filters. Unsupported
// filters are rejected instead of labeling unfiltered results as filtered.
export async function getMvpDashboardData(
  params: Record<string, string | string[] | undefined>,
): Promise<MvpDashboardData> {
  const context = await getSessionContext();
  const role = context?.student?.role ?? "student";
  if (!context || !canViewMvp(role) || await isPreviewingAsStudent(role)) {
    throw new Error("MVP access is required.");
  }
  function selection(key: string): string | null {
    const value = params[key];
    if (Array.isArray(value)) throw new Error("Choose one value per filter.");
    return value || null;
  }
  const programId = selection("programId");
  const courseSlug = selection("courseSlug");
  // Keep the existing URL contract; city now means the full profile location,
  // not a verified city. Match trimmed text exactly, without geocoding guesses.
  const location = selection("city")?.trim() || null;
  const availableLocations = new Set<string>();
  const demographicLearners = new Map<string, { id: string; dateOfBirth: string | null }>();
  if (selection("startDate") || selection("endDate") ||
      (selection("learnerStatus") && selection("learnerStatus") !== "all")) {
    throw new Error("Only program and course filters are connected yet.");
  }

// These loaders are private to this module. Call them only after the
// existing permission checks resolve the user's accessible course rows.
type MvpDatabase = ReturnType<typeof createServiceClient>;

type MvpCourseRecords = {
  learnerIds: string[];
  attendance: MvpAttendanceRecord[];
};

// Read every eligible enrollment using a stable ID cursor.
// Continue until an empty page so a lower database response limit
// does not cause us to mistake a partial page for the complete roster.
async function loadMvpLearnerIds(
  db: MvpDatabase,
  courseSlug: string,
  courseProgramId: string,
): Promise<string[]> {
  const learnerIds = new Set<string>();
  let cursor: string | null = null;

  while (true) {
    let query = db
      .from("student_tracks")
      .select("id, student_id, students!inner(id, location, date_of_birth)")
      .eq("track_slug", courseSlug)
      .eq("program_id", courseProgramId)
      .eq("students.role", "student")
      .or("is_test.is.null,is_test.eq.false", {
        referencedTable: "students",
      })
      .or("is_staff.is.null,is_staff.eq.false", {
        referencedTable: "students",
      })
      .order("id", { ascending: true })
      .limit(500);

    if (cursor !== null) {
      query = query.gt("id", cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error("Unable to load the complete learner roster.");
    }

    if (!data || data.length === 0) break;

    for (const enrollment of data) {
      const embedded = enrollment.students as unknown as { location?: unknown; date_of_birth?: unknown } | { location?: unknown; date_of_birth?: unknown }[];
      const profile = Array.isArray(embedded) ? embedded[0] : embedded;
      const learnerLocation = typeof profile?.location === "string" ? profile.location.trim() : "";
      if (learnerLocation) availableLocations.add(learnerLocation);
      if (!location || learnerLocation === location) {
        learnerIds.add(enrollment.student_id);
        demographicLearners.set(enrollment.student_id, { id: enrollment.student_id,
          dateOfBirth: typeof profile?.date_of_birth === "string" ? profile.date_of_birth : null });
      }
    }

    const nextCursor = data[data.length - 1].id;

    if (nextCursor === cursor) {
      throw new Error("Learner roster pagination did not advance.");
    }

    cursor = nextCursor;
  }

  return [...learnerIds];
}

// Attendance queries are restricted to the selected course and its
// eligible learner IDs. Small ID batches avoid oversized request URLs.
// Database failures throw instead of being presented as zero attendance.
async function loadMvpAttendance(
  db: MvpDatabase,
  courseSlug: string,
  courseProgramId: string,
  learnerIds: string[],
): Promise<MvpAttendanceRecord[]> {
  const records: MvpAttendanceRecord[] = [];

  for (let offset = 0; offset < learnerIds.length; offset += 100) {
    const batch = learnerIds.slice(offset, offset + 100);
    let cursor: string | null = null;

    while (true) {
      let query = db
        .from("attendance")
        .select(
          "id, student_id, track, week_number, session_number, checked_in_at",
        )
        .eq("track", courseSlug)
        .eq("program_id", courseProgramId)
        .in("student_id", batch)
        .order("id", { ascending: true })
        .limit(500);

      if (cursor !== null) {
        query = query.gt("id", cursor);
      }

      const { data, error } =
        await query.returns<MvpAttendanceRecord[]>();

      if (error) {
        throw new Error("Unable to load complete attendance records.");
      }

      if (!data || data.length === 0) break;

      records.push(...data);

      const nextCursor = data[data.length - 1].id;

      if (nextCursor === cursor) {
        throw new Error("Attendance pagination did not advance.");
      }

      cursor = nextCursor;
    }
  }

  return records;
}

// Course slugs are the existing enrollment/attendance identifiers.
// The caller supplies a course from the already-authorized program rows.
async function loadMvpCourseRecords(
  db: MvpDatabase,
  courseSlug: string,
  courseProgramId: string,
): Promise<MvpCourseRecords> {
  const learnerIds = await loadMvpLearnerIds(db, courseSlug, courseProgramId);
  const attendance = await loadMvpAttendance(db, courseSlug, courseProgramId, learnerIds);

  return { learnerIds, attendance };
}

  // Read grants directly so a database failure cannot become a permissive
  // fallback. Existing helpers resolve home-program and course-level access.
  const db = createServiceClient();
  const asOf = new Date();
  let homeId: string | null = null;
  let grants: ProgramGrant[] = [];
  if (role !== "super_admin") {
    const [home, access] = await Promise.all([
      db.from("students").select("program_id").eq("id", context.userId).single(),
      db.from("staff_program_access").select("program_id, role, track_slug").eq("student_id", context.userId),
    ]);
    if (home.error || access.error) throw new Error("Unable to verify program access.");
    homeId = home.data.program_id;
    grants = (access.data ?? []).map((grant) => ({
      programId: grant.program_id,
      role: grant.role as ProgramGrant["role"],
      trackSlug: grant.track_slug,
    }));
  }

  // Only grants carrying MVP permission may expand program or course scope.
  // An instructor grant must not borrow permission from another course's
  // admin grant, including when the instructor grant covers a whole program.
  const mvpGrants = grants.filter((grant) => canViewMvp(grant.role));
  const allowed = allowedProgramIds(homeId, mvpGrants).filter((id) =>
    canViewMvp(effectiveRoleInProgram(role, homeId, mvpGrants, id)),
  );
  let programQuery = db.from("programs").select("id, slug, name").order("id");
  if (role !== "super_admin") programQuery = programQuery.in("id", allowed);
  const programResult = role !== "super_admin" && allowed.length === 0
    ? { data: [], error: null }
    : await programQuery;
  if (programResult.error) throw new Error("Unable to load programs.");
  const programs = programResult.data ?? [];
  if (programId && !programs.some((program) => program.id === programId)) {
    throw new Error("The selected program is unavailable.");
  }

  // Merge configured courses with database names/dates and builder courses.
  // Rows are course aggregates; cohort metrics are not inferred from profiles.
  const rows: MvpProgramRow[] = [];
  const configs = getEveryProgramConfig();
  for (const program of programs) {
    const overrides = await db.from("track_overrides")
      .select("track_slug, name, start_date").eq("program_id", program.id);
    if (overrides.error) throw new Error("Unable to load course definitions.");
    const courses = new Map<string, { name: string; startDate: string | null }>();
    for (const track of configs.find((config) => config.slug === program.slug)?.tracks ?? []) {
      courses.set(track.slug, {
        name: track.name,
        startDate: track.startDateTbd ? null : track.startDate || null,
      });
    }
    for (const track of overrides.data ?? []) {
      const previous = courses.get(track.track_slug);
      courses.set(track.track_slug, {
        name: track.name ?? previous?.name ?? track.track_slug,
        startDate: track.start_date ?? previous?.startDate ?? null,
      });
    }
    const trackScope = role === "super_admin" ? null : allowedTrackSlugs(homeId, mvpGrants, program.id);
    for (const [slug, course] of courses) {
      if (trackScope && !trackScope.includes(slug)) continue;
      rows.push({
        id: `${program.id}:${slug}`, programId: program.id, programName: program.name,
        courseSlug: slug, courseName: course.name, cohortId: null, cohortName: null,
        status: "unknown", startDate: course.startDate, endDate: null,
        totalParticipants: null, enrolledBeforeStart: null, started: null, active: null,
        completed: null, attendanceRate: null, progressRate: null, completionRate: null,
        surveyResponseRate: null, learnersNeedingCheckIn: null,
      });
    }
  }
  if (courseSlug && (!programId || !rows.some((row) => row.programId === programId && row.courseSlug === courseSlug))) {
    throw new Error("The selected course is unavailable.");
  }

  // Exact server counts avoid API row-limit truncation. Enrollment membership
  // uses globally unique course slugs and the canonical learner exclusions.
  const selectedRows = rows.filter((row) =>
    (!programId || row.programId === programId) && (!courseSlug || row.courseSlug === courseSlug),
  );

  // Load records only for authorized, selected offerings. Cache by course
// so the same course does not trigger repeated database requests.
const courseRecords = new Map<string, MvpCourseRecords>();
const offeringStarts: MvpOfferingStarts[] = [];
const offeringCompletions: MvpOfferingCompletions[] = [];
const completionReasons = new Set<string>();
const checkInEvaluations: import("./check-ins").MvpCheckInEvaluation[] = [];
const surveyOutcomes: MvpSurveyOutcomeGroup[] = [];

for (const row of selectedRows) {
  if (!row.courseSlug) {
    offeringStarts.push({ programId: row.programId, startedLearnerIds: null });
    offeringCompletions.push({ programId: row.programId, completedLearnerIds: null });
    continue;
  }

  // student_tracks is program-scoped, and one slug can be offered by two
  // programs, so the roster (and its cache entry) is per program and course.
  const recordsKey = `${row.programId}:${row.courseSlug}`;
  let records = courseRecords.get(recordsKey);

  if (!records) {
    records = await loadMvpCourseRecords(db, row.courseSlug, row.programId);
    courseRecords.set(recordsKey, records);
  }

  row.totalParticipants = records.learnerIds.length;
  const program = programs.find((item) => item.id === row.programId)!;
  surveyOutcomes.push(await loadMvpSurveyOutcomes(db, {
    programRowId: row.id, programId: row.programId, programSlug: program.slug,
    courseSlug: row.courseSlug, learnerIds: records.learnerIds,
    surveys: configs.find((config) => config.slug === program.slug)?.surveys ?? [],
  }));

  // Resolve the canonical course owner's overrides, including shared courses.
  // Missing required builder settings remain unknown instead of using defaults.
  const home = getHomeProgramForTrack(row.courseSlug);
  const base = home?.tracks.find((track) => track.slug === row.courseSlug);
  let ownerId = row.programId;
  if (home) {
    const owner = await db.from("programs").select("id").eq("slug", home.slug).single();
    if (owner.error || !owner.data) throw new Error("Unable to resolve course schedule ownership.");
    ownerId = owner.data.id;
  }
  const override = await db.from("track_overrides")
    .select("start_date, total_weeks, sessions_per_week, unit_label, last_session_day_offset, week_summaries, self_paced")
    .eq("program_id", ownerId).eq("track_slug", row.courseSlug).maybeSingle();
  if (override.error) throw new Error("Unable to resolve course schedule overrides.");
  let o = override.data;
  if (!o && ownerId !== row.programId) {
    const fallback = await db.from("track_overrides")
      .select("start_date, total_weeks, sessions_per_week, unit_label, last_session_day_offset, week_summaries, self_paced")
      .eq("program_id", row.programId).eq("track_slug", row.courseSlug).maybeSingle();
    if (fallback.error) throw new Error("Unable to resolve shared course overrides.");
    o = fallback.data;
  }
  const startDate = o?.start_date ?? base?.startDate;
  const totalWeeks = o?.total_weeks ?? base?.totalWeeks;
  const sessionsPerWeek = o?.sessions_per_week ?? base?.sessionsPerWeek;
  const dayOffset = o?.last_session_day_offset ?? base?.lastSessionDayOffset;
  const track: MvpScheduleInput["track"] = startDate && totalWeeks != null && sessionsPerWeek != null && dayOffset != null ? {
    slug: row.courseSlug, name: row.courseName ?? row.courseSlug, shortName: row.courseName ?? row.courseSlug,
    startDate, totalWeeks, sessionsPerWeek, lastSessionDayOffset: dayOffset,
    startDateTbd: o?.start_date ? false : base?.startDateTbd,
    unitLabel: o?.unit_label ?? base?.unitLabel,
    weekSummaries: o?.week_summaries ?? base?.weekSummaries ?? [],
    selfPaced: o?.self_paced ?? base?.selfPaced,
  } : null;

  // Session content is paginated as well as attendance. No delivery metadata
  // means no verified attendance denominator, rather than zero attendance.
  const delivery: MvpSessionDelivery[] = [];
  let deliveryCursor: string | null = null;
  while (true) {
    let request = db.from("session_content")
      .select("id, week_number, status, status_2, status_3")
      .eq("track", row.courseSlug).eq("program_id", row.programId).order("id").limit(500);
    if (deliveryCursor) request = request.gt("id", deliveryCursor);
    const result = await request;
    if (result.error) throw new Error("Unable to verify delivered course sessions.");
    if (!result.data?.length) break;
    delivery.push(...result.data);
    deliveryCursor = result.data[result.data.length - 1].id;
  }
  const performance = calculateMvpCoursePerformance(track, records.learnerIds, records.attendance, delivery, asOf, row.id);
  checkInEvaluations.push(...performance.checkIns.evaluations);
  row.learnersNeedingCheckIn = performance.checkIns.learnersNeedingCheckIn;
  row.started = performance.started;
  row.attendanceRate = performance.attendanceRate;
  const completion = calculateMvpCompletion(track, records.learnerIds, records.attendance, delivery, asOf);
  row.completed = completion.completed;
  offeringCompletions.push({ programId: row.programId, completedLearnerIds: completion.completedLearnerIds });
  row.completionRate = completion.completionRate;
  const lifecycle = resolveMvpLifecycle(track, asOf, completion.completed !== null);
  row.status = lifecycle.status;
  row.startDate = lifecycle.startDate;
  row.endDate = lifecycle.endDate;
  row.enrolledBeforeStart = lifecycle.status === "starting_soon" ? records.learnerIds.length : null;
  if (completion.unavailableReason) completionReasons.add(completion.unavailableReason);
  offeringStarts.push({ programId: row.programId, startedLearnerIds: performance.startedLearnerIds });
}

  const startSummary = calculateMvpStartSummary(offeringStarts);
  // Program-wide answers are not course outcomes. Only whole-program admins
  // may see them, and course-filtered requests omit them rather than mislabeling
  // unfiltered totals. Keep the response program stamp as an access boundary.
  if (!courseSlug) {
    for (const program of programs.filter((item) => !programId || item.id === programId)) {
      if (role !== "super_admin" && allowedTrackSlugs(homeId, mvpGrants, program.id) !== null) continue;
      const programRows = selectedRows.filter((row) => row.programId === program.id);
      if (!programRows.length) continue;
      const learnerIds = [...new Set(programRows.flatMap((row) =>
        row.courseSlug ? courseRecords.get(`${row.programId}:${row.courseSlug}`)?.learnerIds ?? [] : []))];
      const surveys = configs.find((config) => config.slug === program.slug)?.surveys ?? [];
      if (!surveys.some((survey) => !survey.appliesToTracks?.length && !survey.skipForTracks?.length)) continue;
      surveyOutcomes.push(await loadMvpSurveyOutcomes(db, {
        programRowId: `program:${program.id}`, programId: program.id, programSlug: program.slug,
        courseSlug: null, learnerIds, surveys,
      }));
    }
  }
  const completionSummary = calculateMvpCompletionSummary(offeringCompletions);
  // Deduplicate across courses, but query each program with its own roster so
  // multi-program enrollment cannot broaden the response access boundary.
  const incomeResponses: MvpIncomeResponse[] = [];
  for (const id of new Set(selectedRows.map((row) => row.programId))) {
    const ids = [...new Set(selectedRows.filter((row) => row.programId === id).flatMap((row) =>
      row.courseSlug ? courseRecords.get(`${row.programId}:${row.courseSlug}`)?.learnerIds ?? [] : []))];
    incomeResponses.push(...await loadMvpIncome(db, id, ids));
  }
  const upcomingEnrollments = countMvpUpcomingEnrollments(selectedRows);

  return {
    scopeLabel: programId ? programs.find((program) => program.id === programId)!.name
      : role === "super_admin" ? "Organization overview" : "Your accessible programs",
    appliedFilters: { programId, courseSlug, city: location, learnerStatus: "all", startDate: null, endDate: null },
    filterOptions: {
      programs: programs.map(({ id, name }) => ({ id, name })),
      courses: rows.map((row) => ({ programId: row.programId, slug: row.courseSlug!, name: row.courseName! })),
      cities: [...availableLocations].sort((a, b) => a.localeCompare(b, "en-US")),
    },
    summary: {
      ...startSummary, ...completionSummary, upcomingEnrollments,
    },
    programs: selectedRows, commitments: [], checkInEvaluations, surveyOutcomes,
    demographics: [calculateMvpAges([...demographicLearners.values()], asOf),
      calculateMvpIncome([...demographicLearners.keys()], incomeResponses)],
    freshness: { fetchedAt: new Date().toISOString(), sourceUpdatedAt: null, lastValidatedAt: null, lastValidatedBy: null },
    metricDefinitions: [
      { key: "uniqueLearnersCompleted", label: "Learners with a course completion", denominator: null,
        definition: "Distinct current learners with at least one verified attendance-based course completion across the selected accessible courses. This is not graduation from an entire program or an all-time historical count.",
        unavailableReason: completionSummary.uniqueLearnersCompleted === null ? "At least one selected course cannot yet be evaluated for completion; partial totals are not shown." : null },
      { key: "programParticipationsCompleted", label: "Learner/program pairs with a course completion", denominator: null,
        definition: "Distinct learner/program pairs with at least one verified course completion. Multiple completed courses in one program count once per learner; completion of all program requirements is not established.",
        unavailableReason: completionSummary.programParticipationsCompleted === null ? "At least one selected course cannot yet be evaluated for completion; partial totals are not shown." : null },
      { key: "status", label: "Course lifecycle", denominator: null,
        definition: "Starting soon means a future scheduled start, without a fixed look-ahead window. Active covers the dated schedule. Completed requires the scheduled end to have passed and required delivery to be verified. Undated and self-paced courses may remain unknown.",
        unavailableReason: selectedRows.some((row) => row.status === "unknown") ? "Some courses lack complete schedule or delivery information." : null },
      { key: "upcomingEnrollments", label: "Upcoming enrollments", denominator: null,
        definition: "Current enrollment counts across selected future courses; repeat learners may count in multiple courses. No enrollment target comparison is implied.",
        unavailableReason: upcomingEnrollments === null ? "Some selected courses lack lifecycle or enrollment information; partial totals are not shown." : null },
      { key: "learnersNeedingCheckIn", label: "Missed-session check-ins", denominator: null,
        definition: "Evaluates the two-missed-sessions rule over explicitly completed required sessions for the current roster. Other check-in rules are not connected. Missing check-ins alone do not confirm absence.",
        unavailableReason: checkInEvaluations.some((item) => item.checkInStatus === "not_evaluated")
          ? "Some learners require verified absence/eligibility information before this count can be calculated." : null },
      { key: "completed", label: "Course completions", denominator: null,
        definition: "Current enrolled learners with at least 80% attendance across the full required course schedule, after every required session is marked completed. This does not issue or count certificates.",
        unavailableReason: completionReasons.size ? [...completionReasons].join(" ") : null },
      { key: "completionRate", label: "Course completion rate", denominator: "Current eligible learner roster for the course",
        definition: "Attendance-based course completions divided by current course participants. Historical enrollment changes are not reconstructed.",
        unavailableReason: completionReasons.size ? [...completionReasons].join(" ") : null },
      { key: "uniqueLearnersStarted", label: "Unique learners started", denominator: null,
        definition: "Distinct current learners with kickoff/first-session attendance across the selected accessible courses. This is recorded evidence, not a historical all-time service count.",
        unavailableReason: startSummary.uniqueLearnersStarted === null ? "At least one selected course lacks a verified start mapping; a partial total is not shown." : null },
      { key: "programParticipationsStarted", label: "Program participations started", denominator: null,
        definition: "Distinct learner/program pairs with recorded kickoff/first-session attendance. Multiple courses in the same program count once per learner.",
        unavailableReason: startSummary.programParticipationsStarted === null ? "At least one selected course lacks a verified start mapping; a partial total is not shown." : null },
      { key: "totalParticipants", label: "Participants", denominator: null,
      definition: "Current course enrollment records for students, excluding staff and test accounts. This is not a people-served count. Courses include historical definitions; lifecycle filtering is not connected yet.", unavailableReason: null },
      { key: "started", label: "Started", denominator: null,
        definition: "Current learners with recorded attendance at an explicitly dated kickoff or first teaching session. Weekly multi-session start mappings remain unavailable.",
        unavailableReason: selectedRows.some((row) => row.started === null) ? "Some course start mappings are unavailable." : null },
      { key: "attendanceRate", label: "Recorded session attendance", denominator: "Current learners multiplied by eligible sessions explicitly marked completed",
        definition: "Attendance across required sessions explicitly marked completed in the course editor. This may cover only part of the delivered program and uses the current roster, not historical eligibility.",
        unavailableReason: selectedRows.some((row) => row.attendanceRate === null) ? "Some courses lack a verified schedule, completed sessions, or a nonempty roster." : null }],
  };
}
