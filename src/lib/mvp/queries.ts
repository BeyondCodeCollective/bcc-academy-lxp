import "server-only";
import { loadMvpEvents } from "./event-queries";
import { calculateMvpGeography, type MvpGeographyProfile } from "./geography";
import { calculateMvpAssessment, calculateMvpVideoProgress } from "./learning-metrics";
import { buildMvpAdditionalSignals, getMvpSignalPolicy } from "./check-in-signals";
import { loadMvpSignalEvidence } from "./check-in-signal-queries";
import { calculateMvpProgramSummaries, type MvpProgramSummaryInput } from "./program-summary";
import { loadMvpAttendanceReviews } from "./attendance-review-queries";
import { calculateMvpSessionsRemaining } from "./sessions-remaining";
import { calculateMvpLocations } from "./location-summary";
import { getMvpOfferingActiveConfig, toMvpActiveRule } from "./active-config";
import { loadMvpSubmissions } from "./submission-queries";
import { evaluateMvpRequiredWork } from "./required-work";
import { parseMvpDateWindow, matchesMvpDateWindow } from "./date-window";
import { calculateMvpAges } from "./demographics";
import { calculateMvpIncome, type MvpIncomeResponse } from "./household-income";
import { loadMvpIncome } from "./income-queries";

import { getSessionContext } from "@/lib/auth/session";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";
import { allowedProgramIds, allowedTrackSlugs, effectiveRoleInProgram, type ProgramGrant } from "@/lib/auth/program-access";
import { canViewMvp } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getEveryProgramConfig, getHomeProgramForTrack } from "@/lib/programs";
import { resolveScopeTrackSlugs } from "@/lib/programs/scope";
import { parseMvpLearnerFilter, selectMvpLearners } from "./learner-filter";
import type { MvpDashboardData, MvpProgramRow } from "./types";
import type { MvpAttendanceRecord } from "./milestones";
import type { MvpScheduleInput } from "./schedule";
import { calculateMvpCoursePerformance, type MvpSessionDelivery } from "./course-performance";
import { calculateMvpStartSummary, type MvpOfferingStarts } from "./start-summary";
import { calculateMvpCompletion } from "./completion";
import { calculateMvpCompletionSummary, type MvpOfferingCompletions } from "./completion-summary";
import { resolveMvpLifecycle, countMvpUpcomingEnrollments } from "./lifecycle";
import { loadMvpSurveyOutcomes, type MvpSurveyOutcomeGroup } from "./survey-queries";

// This data slice accepts program/course/profile-location/date filters. Unsupported
// filters are rejected instead of labeling unfiltered results as filtered.
// Birth dates and household income are sensitive and nothing renders them yet,
// so they are read only when a caller asks for the demographic summaries.
export async function getMvpDashboardData(
  params: Record<string, string | string[] | undefined>,
  { includeDemographics = false, includeLocations = false, includeEvents = false }: { includeDemographics?: boolean; includeLocations?: boolean; includeEvents?: boolean } = {},
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
  const learnerLocations: Array<{ id: string; location: string | null }> = [];
  const geographyProfiles: MvpGeographyProfile[] = [];
  const demographicLearners = new Map<string, { id: string; dateOfBirth: string | null }>();
  const dateWindow = parseMvpDateWindow(selection("startDate"), selection("endDate"));
  const learnerStatus = parseMvpLearnerFilter(selection("learnerStatus"));

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
      .select(`id, student_id, students!inner(id, location${includeDemographics ? ", date_of_birth" : ""}${includeDemographics || includeLocations ? ", zip, state" : ""})`)
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

    if (error || !Array.isArray(data)) {
      throw new Error("Unable to load the complete learner roster.");
    }

    if (!data || data.length === 0) break;

    for (const enrollment of data) {
      type Profile = { location?: unknown; date_of_birth?: unknown; zip?: unknown; state?: unknown };
      const embedded = enrollment.students as unknown as Profile | Profile[];
      const profile = Array.isArray(embedded) ? embedded[0] : embedded;
      const learnerLocation = typeof profile?.location === "string" ? profile.location.trim() : "";
      if (learnerLocation) availableLocations.add(learnerLocation);
      if (!location || learnerLocation === location) {
        if (includeDemographics || includeLocations) learnerLocations.push({ id: enrollment.student_id, location: learnerLocation || null });
        if (includeDemographics || includeLocations) geographyProfiles.push({ id: enrollment.student_id, location: learnerLocation || null,
          zip: typeof profile?.zip === "string" ? profile.zip : null, state: typeof profile?.state === "string" ? profile.state : null });
        learnerIds.add(enrollment.student_id);
        if (includeDemographics) demographicLearners.set(enrollment.student_id, { id: enrollment.student_id,
          dateOfBirth: typeof profile?.date_of_birth === "string" ? profile.date_of_birth : null });
      }
    }

    const nextCursor = data[data.length - 1].id;

    if (!nextCursor || (cursor !== null && nextCursor <= cursor)) {
      throw new Error("Learner roster pagination did not advance.");
    }

    cursor = nextCursor;
  }

  return [...learnerIds];
}

// Activity program stamps can be stale. The selected course is checked
// against resolveScopeTrackSlugs, then attendance is limited to its program-
// scoped roster. Small ID batches avoid oversized request URLs.
// Database failures throw instead of being presented as zero attendance.
async function loadMvpAttendance(
  db: MvpDatabase,
  courseSlug: string,
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
        .in("student_id", batch)
        .order("id", { ascending: true })
        .limit(500);

      if (cursor !== null) {
        query = query.gt("id", cursor);
      }

      const { data, error } =
        await query.returns<MvpAttendanceRecord[]>();

      if (error || !Array.isArray(data)) {
        throw new Error("Unable to load complete attendance records.");
      }

      if (!data || data.length === 0) break;

      records.push(...data);

      const nextCursor = data[data.length - 1].id;

      if (!nextCursor || (cursor !== null && nextCursor <= cursor)) {
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
  const attendance = await loadMvpAttendance(db, courseSlug, learnerIds);

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
  // Hiding is global per course slug (see getHiddenTrackSlugs); read it here
  // so a failed lookup errors instead of quietly showing retired courses.
  const hidden = await db.from("hidden_courses").select("track_slug");
  if (hidden.error) throw new Error("Unable to load hidden courses.");
  const hiddenSlugs = new Set((hidden.data ?? []).map((row) => row.track_slug as string));
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
      if (hiddenSlugs.has(slug) || (trackScope && !trackScope.includes(slug))) continue;
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

  // Select authorized offerings before applying date overlap. Rosters remain
  // scoped by program/course pairs with canonical learner exclusions.
  const candidateRows = rows.filter((row) =>
    (!programId || row.programId === programId) && (!courseSlug || row.courseSlug === courseSlug),
  );

  // Load records only for authorized, selected offerings. Cache by program
// and course so separate program rosters never share an entry.
const courseRecords = new Map<string, MvpCourseRecords>();
const offeringStarts: MvpOfferingStarts[] = [];
const offeringCompletions: MvpOfferingCompletions[] = [];
const programSummaryInputs: MvpProgramSummaryInput[] = [];
const completionReasons = new Set<string>();
const activeReasons = new Set<string>();
const checkInEvaluations: import("./check-ins").MvpCheckInEvaluation[] = [];
const surveyOutcomes: MvpSurveyOutcomeGroup[] = [];
const selectedRows: MvpProgramRow[] = [];
let undatedExcluded = 0;
let statusUnknownExcluded = 0;
const activityScopes = new Map<string, string[]>();

for (const row of candidateRows) {
  if (!row.courseSlug) {
    offeringStarts.push({ programId: row.programId, startedLearnerIds: null });
    offeringCompletions.push({ programId: row.programId, completedLearnerIds: null });
    continue;
  }

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

  // Apply the approved overlap rule before loading any learner evidence so
  // every aggregate and location option describes the same selected offerings.
  const overlap = matchesMvpDateWindow(resolveMvpLifecycle(track, asOf, false), dateWindow);
  if (overlap !== true) {
    if (overlap === null) undatedExcluded++;
    continue;
  }
  selectedRows.push(row);
  const program = programs.find((item) => item.id === row.programId)!;
  let activitySlugs = activityScopes.get(program.id);
  if (!activitySlugs) {
    activitySlugs = await resolveScopeTrackSlugs({ ids: [program.id], slugs: [program.slug] });
    activityScopes.set(program.id, activitySlugs);
  }
  if (!activitySlugs.includes(row.courseSlug)) throw new Error("Unable to establish the course activity scope.");
  const recordsKey = `${row.programId}:${row.courseSlug}`;
  let records = courseRecords.get(recordsKey);
  if (!records) {
    records = await loadMvpCourseRecords(db, row.courseSlug, row.programId);
    courseRecords.set(recordsKey, records);
  }
  row.totalParticipants = records.learnerIds.length;

  // Session content is paginated as well as attendance. No delivery metadata
  // means no verified attendance denominator, rather than zero attendance.
  const delivery: MvpSessionDelivery[] = [];
  let deliveryCursor: string | null = null;
  while (true) {
    let request = db.from("session_content")
      .select("id, week_number, status, status_2, status_3")
      .eq("track", row.courseSlug).order("id").limit(500);
    if (deliveryCursor) request = request.gt("id", deliveryCursor);
    const result = await request;
    if (result.error || !Array.isArray(result.data)) throw new Error("Unable to verify delivered course sessions.");
    if (!result.data.length) break;
    const nextCursor: string = result.data[result.data.length - 1].id;
    if (!nextCursor || (deliveryCursor !== null && nextCursor <= deliveryCursor)) {
      throw new Error("Delivered-session pagination did not advance.");
    }
    delivery.push(...result.data);
    deliveryCursor = nextCursor;
  }
  // Read submission metadata only for offerings with confirmed requirements.
  // Date filters select offerings, never truncate their submission history.
  const activeConfig = getMvpOfferingActiveConfig(program.slug, row.courseSlug);
  const activeRule = toMvpActiveRule(activeConfig);
  const requiredWork = new Map<string, boolean | null>();
  let submissions: Awaited<ReturnType<typeof loadMvpSubmissions>> = [];
  if (activeConfig?.kind === "cohort" && activeConfig.requiredAssignments !== null) {
    submissions = activeConfig.requiredAssignments.length
      ? await loadMvpSubmissions(db, row.courseSlug, records.learnerIds) : [];
    for (const learnerId of records.learnerIds) {
      requiredWork.set(learnerId, evaluateMvpRequiredWork(activeConfig, learnerId, submissions, asOf));
    }
  }
  // Evaluate membership against the full scoped roster first, then recompute
  // every learner-derived result using only matching learners in this offering.
  const verification = { programId: row.programId,
    reviews: await loadMvpAttendanceReviews(db, row.programId, row.courseSlug, records.learnerIds) };
  const configuredSignals = getMvpSignalPolicy(program.slug, row.courseSlug);
  // Video checkpoints are valid only for explicitly self-paced offerings.
  const signalPolicy = configuredSignals && !track?.selfPaced ? { ...configuredSignals, progress: undefined } : configuredSignals;
  const signalEvidence = await loadMvpSignalEvidence(db, row.courseSlug, records.learnerIds, signalPolicy, track?.selfPaced === true);
  const additionalSignals = new Map(records.learnerIds.map(learnerId => [learnerId,
    buildMvpAdditionalSignals({ learnerId, courseSlug: row.courseSlug!, asOf, activeConfig, submissions,
      policy: signalPolicy, ...signalEvidence })]));
  const fullPerformance = calculateMvpCoursePerformance(track, records.learnerIds, records.attendance, delivery, asOf, row.id, activeRule, requiredWork, verification, additionalSignals);
  const fullCompletion = calculateMvpCompletion(track, records.learnerIds, records.attendance, delivery, asOf);
  const fullLifecycle = resolveMvpLifecycle(track, asOf, fullCompletion.completed !== null);
  const membership = selectMvpLearners(learnerStatus, records.learnerIds, {
    active: fullPerformance.activeByLearner,
    started: fullPerformance.startedLearnerIds,
    completed: fullCompletion.completedLearnerIds,
    upcoming: fullLifecycle.status === "unknown" ? null : fullLifecycle.status === "starting_soon",
    checkIns: fullPerformance.checkIns.evaluations,
  });
  statusUnknownExcluded += membership.unknownCount;
  records = { ...records, learnerIds: membership.ids };
  courseRecords.set(recordsKey, records);
  row.totalParticipants = records.learnerIds.length;
  const courseSurveys = await loadMvpSurveyOutcomes(db, {
    programRowId: row.id, programId: row.programId, programSlug: program.slug,
    courseSlug: row.courseSlug, learnerIds: records.learnerIds,
    surveys: configs.find((config) => config.slug === program.slug)?.surveys ?? [], asOf,
  });
  surveyOutcomes.push(courseSurveys);
  row.surveyResponseRate = courseSurveys.anySurveyResponseRate ?? null;
  row.surveyParticipation = courseSurveys.participation ?? [];
  row.assessmentSummary = calculateMvpAssessment(records.learnerIds, signalPolicy?.assessment?.examId ?? null, signalEvidence.exams, asOf);
  row.assessmentAveragePercent = row.assessmentSummary.averagePercent;
  row.videoProgress = calculateMvpVideoProgress(records.learnerIds, row.courseSlug,
    signalPolicy?.progress?.requiredWeeks ?? null, signalEvidence.videos, asOf);
  row.progressRate = row.videoProgress.percent;
  const performance = calculateMvpCoursePerformance(track, records.learnerIds, records.attendance, delivery, asOf, row.id, activeRule, requiredWork, verification, additionalSignals);
  const remaining = calculateMvpSessionsRemaining(track, delivery, asOf);
  row.sessionsRemaining = remaining.remaining;
  row.sessionsRemainingReason = remaining.unavailableReason;
  row.attendanceQualified = performance.attendanceQualified;
  row.active = performance.active;
  if (performance.activeUnavailableReason) activeReasons.add(performance.activeUnavailableReason);
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
  programSummaryInputs.push({ programId: row.programId, programName: row.programName, offeringId: row.id,
    enrolledLearnerIds: records.learnerIds, startedLearnerIds: performance.startedLearnerIds,
    completedLearnerIds: completion.completedLearnerIds });
}

  const startSummary = calculateMvpStartSummary(offeringStarts);
  // Program-wide answers are not course outcomes. Only whole-program admins
  // may see them, and course-filtered requests omit them rather than mislabeling
  // unfiltered totals. Keep the response program stamp as an access boundary.
  if (!courseSlug && !dateWindow.start && !dateWindow.end) {
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
        courseSlug: null, learnerIds, surveys, asOf,
      }));
    }
  }
  const completionSummary = calculateMvpCompletionSummary(offeringCompletions);
  // Deduplicate across courses, but query each program with its own roster so
  // multi-program enrollment cannot broaden the response access boundary.
  const incomeResponses: MvpIncomeResponse[] = [];
  for (const id of includeDemographics ? new Set(selectedRows.map((row) => row.programId)) : []) {
    const ids = [...new Set(selectedRows.filter((row) => row.programId === id).flatMap((row) =>
      row.courseSlug ? courseRecords.get(`${row.programId}:${row.courseSlug}`)?.learnerIds ?? [] : []))];
    incomeResponses.push(...await loadMvpIncome(db, id, ids));
  }
  const upcomingEnrollments = countMvpUpcomingEnrollments(selectedRows);
  const selectedLearnerIds = new Set([...courseRecords.values()].flatMap((records) => records.learnerIds));
  for (const id of demographicLearners.keys()) if (!selectedLearnerIds.has(id)) demographicLearners.delete(id);

  // Events remain a separate, opt-in source; course-only grants never expand
  // to program-wide event access and ticket counts never alter learner KPIs.
  const events = includeEvents ? await loadMvpEvents(db, programs.filter(program =>
    (!programId || program.id === programId) && (role === "super_admin" || allowedTrackSlugs(homeId, mvpGrants, program.id) === null)
  ).map(program => program.id), { programId, courseSlug, city: location, learnerStatus, startDate: dateWindow.start, endDate: dateWindow.end }, asOf) : undefined;

  return {
    scopeLabel: programId ? programs.find((program) => program.id === programId)!.name
      : role === "super_admin" ? "Organization overview" : "Your accessible programs",
    appliedFilters: { programId, courseSlug, city: location, learnerStatus, startDate: dateWindow.start, endDate: dateWindow.end },
    filterOptions: {
      programs: programs.map(({ id, name }) => ({ id, name })),
      courses: rows.map((row) => ({ programId: row.programId, slug: row.courseSlug!, name: row.courseName! })),
      cities: [...availableLocations].sort((a, b) => a.localeCompare(b, "en-US")),
    },
    summary: {
      ...startSummary, ...completionSummary, upcomingEnrollments,
    },
    programs: selectedRows, commitments: [], checkInEvaluations, surveyOutcomes,
    ...(events && { events }),
    ...((includeDemographics || includeLocations) && { geography: calculateMvpGeography(geographyProfiles.filter(profile => selectedLearnerIds.has(profile.id))) }),
    programSummaries: calculateMvpProgramSummaries(programSummaryInputs),
    historicalCoverage: {
      status: "unavailable", allTimeUniqueLearnersStarted: null, allTimeUniqueLearnersCompleted: null,
      reason: "Current rosters do not reconstruct removed enrollments. Alumni enrollments do not establish verified starts or completions.",
    },
    cohortCoverage: { status: "unavailable",
      reason: "Course activity is not linked to historical cohort membership; profile cohort assignments cannot establish cohort-specific results." },
    ...((includeDemographics || includeLocations) && { locations: calculateMvpLocations(learnerLocations.filter((learner) => selectedLearnerIds.has(learner.id))) }),
    ...(includeDemographics && { demographics: [calculateMvpAges([...demographicLearners.values()], asOf),
      calculateMvpIncome([...demographicLearners.keys()], incomeResponses)] }),
    freshness: { fetchedAt: new Date().toISOString(), sourceUpdatedAt: null, lastValidatedAt: null, lastValidatedBy: null },
    metricDefinitions: [
      { key: "progressRate", label: "Configured required-video progress", denominator: "Selected learners × configured required video weeks",
        definition: "Recorded watched learner/week pairs divided by configured required-video opportunities. This is not overall course completion or attendance.",
        unavailableReason: selectedRows.some(row => row.progressRate === null) ? "A self-paced required-video mapping and valid progress records are needed." : null },
      { key: "assessmentAveragePercent", label: "Latest mapped assessment average", denominator: "Learners with a valid latest completed mapped attempt",
        definition: "Mean of learner percentages on the mapped assessment; one latest completed attempt per learner. Missing or invalid attempts are excluded; coverage counts accompany each offering.",
        unavailableReason: selectedRows.some(row => row.assessmentAveragePercent == null) ? "A mapped assessment and valid completed attempts are needed." : null },
      { key: "surveyResponseRate", label: "Responded to any mapped course survey", denominator: "Selected eligible current learners",
        definition: "Distinct selected learners completing at least one explicitly course-mapped survey divided by the selected roster. This does not mean all surveys completed; per-survey rates are supplied separately.",
        unavailableReason: selectedRows.some(row => row.surveyResponseRate === null) ? "No explicitly mapped survey or no eligible learners." : null },
      { key: "sessionsRemaining", label: "Required sessions remaining", denominator: "Complete required teaching schedule",
        definition: "Required sessions not yet verified as delivered, including overdue sessions. Optional extras and future completed flags do not reduce the count.",
        unavailableReason: selectedRows.some((row) => row.sessionsRemaining == null) ? "Some offerings lack complete schedules or verified delivery status." : null },
      { key: "learnerStatus", label: "Learner status selection", denominator: null,
        definition: "Status is evaluated within each offering. Results include only verified matches and use their full-offering evidence. Enrolled before start means current enrollment in a future offering; it does not reconstruct historical enrollment dates. Statuses may overlap.",
        unavailableReason: statusUnknownExcluded ? `${statusUnknownExcluded} learner/offering participation(s) excluded because the selected status cannot be verified. These learners are not classified as inactive; zero matches does not mean nobody qualifies.` : null },
      { key: "attendanceQualified", label: "Meets 80% attendance", denominator: "Required sessions verified as held so far",
        definition: "Current learners with recorded attendance at 80% or more of required sessions verified as held so far, across the selected offering—not only the filter dates. This is the attendance criterion only, not full active status. Future sessions, optional extras, and duplicate check-ins do not add credit.",
        unavailableReason: selectedRows.some((row) => row.attendanceQualified == null) ? "Some offerings have no verified held-session denominator." : null },
      { key: "active", label: "Active learners", denominator: null,
        definition: "Uses the configured offering rule. Required submissions and incomplete attendance evidence must be resolved before reporting a complete active count; no partial totals are shown.",
        unavailableReason: activeReasons.size ? [...activeReasons].join(" ") : null },
      { key: "dateWindow", label: "Selected program dates", denominator: null,
        definition: "Dates select overlapping course offerings. Results cover each selected offering in full, using evidence available now—not only activity during the selected dates. Program-wide surveys are omitted when dates are selected because they cannot be attributed to a dated offering.",
        unavailableReason: undatedExcluded ? `${undatedExcluded} offering(s) excluded because their schedule cannot establish date overlap.` : null },
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
      { key: "learnersNeedingCheckIn", label: "Learners needing a check-in", denominator: null,
        definition: "Evaluates verified missed sessions and configured overdue mandatory work, assessment cutoffs and self-paced video checkpoints. Only mapped rules are evaluated; missing attendance alone does not confirm absence.",
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
