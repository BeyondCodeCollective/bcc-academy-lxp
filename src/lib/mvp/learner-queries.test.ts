import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), preview: vi.fn(), client: vi.fn(), configs: vi.fn(), home: vi.fn() }));
vi.mock("@/lib/programs", () => ({ getEveryProgramConfig: mocks.configs, getHomeProgramForTrack: mocks.home }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: mocks.session }));
vi.mock("@/lib/auth/preview-mode", () => ({ isPreviewingAsStudent: mocks.preview }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: mocks.client }));
import { getMvpLearnersData, getMvpLearnerFilterOptions } from "./learner-queries";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let requests: string[];
let failure: string;
let serverCap: number;
let ignoreRosterCursor: boolean;
let failRosterAfter: number;
let ignoreDeliveryCursor: boolean;
let failDeliveryAfter: number;
let ignoreAttendanceCursor: boolean;
let failAttendanceAfter: number;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
  mocks.preview.mockResolvedValue(false);
  mocks.configs.mockReturnValue([]);
  mocks.home.mockReturnValue(undefined);
  requests = []; failure = "";
  serverCap = 1; ignoreRosterCursor = false; failRosterAfter = Infinity;
  ignoreDeliveryCursor = false; failDeliveryAfter = Infinity;
  ignoreAttendanceCursor = false; failAttendanceAfter = Infinity;
  tables = { students: [{ id: "actor", program_id: "p1" }], staff_program_access: [], programs: [{ id: "p1", name: "One", slug: "one" }, { id: "p2", name: "Two", slug: "two" }] };
  Object.assign(tables, { track_overrides: [], hidden_courses: [], cohorts: [], student_tracks: [] });
  Object.assign(tables, { submissions: [], reflections: [], week_progress: [], session_content: [], attendance: [], mvp_attendance_reviews: [] });
  mocks.client.mockReturnValue({ from(table: string) {
    const predicates: ((row: Row) => boolean)[] = [];
    let single = false;
    const chain = {
      select: () => chain, order: () => chain, limit: () => chain,
      eq: (key: string, value: unknown) => { predicates.push(row => key.split(".").reduce<unknown>((current, part) => (current as Row)?.[part], row) === value); return chain; },
      or: (expression: string) => { const key = expression.split(".")[0]; predicates.push(row => { const value = (row.students as Row)[key]; return value === null || value === false; }); return chain; },
      in: (key: string, values: unknown[]) => { predicates.push(row => values.includes(row[key])); return chain; },
      gt: (key: string, value: string) => { if (!(table === "student_tracks" && ignoreRosterCursor) && !(table === "session_content" && ignoreDeliveryCursor) && !(table === "attendance" && ignoreAttendanceCursor)) predicates.push(row => String(row[key]) > value); return chain; },
      single: () => { single = true; return chain; },
      then: (resolve: (value: unknown) => unknown) => {
        requests.push(table);
        if (requests.length > 1000) throw new Error("Pagination loop");
        const rows = tables[table].filter(row => predicates.every(p => p(row))).slice(0, serverCap);
        const laterFailure = (table === "student_tracks" && requests.filter(t => t === table).length > failRosterAfter) ||
          (table === "session_content" && requests.filter(t => t === table).length > failDeliveryAfter) ||
          (table === "attendance" && requests.filter(t => t === table).length > failAttendanceAfter);
        return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: failure === table || laterFailure ? new Error("DB error") : null }).then(resolve);
      },
    }; return chain;
  } });
});
describe("Learners loader access boundary", () => {
  const seedSummary = () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "a", name: "A" }, { slug: "b", name: "B" }] }]);
    tables.track_overrides = ["a", "b"].map(track_slug => ({ id: `o${track_slug}`, program_id: "p1", track_slug, name: track_slug,
      start_date: "2000-01-01", total_weeks: 3, sessions_per_week: 1, unit_label: "Session", last_session_day_offset: 0,
      week_summaries: [{ week: 1, date: "2000-01-01" }, { week: 2, date: "2000-01-02" },
        { week: 3, date: "2999-01-01" }, { week: 4, date: "2000-01-03", label: "Exam" }], self_paced: false }));
    tables.cohorts = [{ id: "c1", program_id: "p1", track_slug: "a", name: "Cohort", display_name: null }];
    tables.student_tracks = Array.from({ length: 26 }, (_, index) => ["a", "b"].map(track_slug => {
      const id = String(index).padStart(2, "0");
      return { id: `e${id}${track_slug}`, student_id: `s${id}`, program_id: "p1", track_slug,
        students: { id: `s${id}`, first_name: `Learner${id}`, last_name: "Test", email: null, cohort_id: index === 0 ? "c1" : null,
          role: "student", is_test: false, is_staff: false } };
    })).flat();
    tables.student_tracks.push({ ...tables.student_tracks[0], id: "zzduplicate" });
    tables.session_content = ["a", "b"].flatMap(track => [1, 2, 3, 4].map(week_number => ({ id: `${track}${week_number}`, track,
      week_number, status: track === "b" && week_number === 2 ? "upcoming" : "completed", status_2: "upcoming", status_3: "upcoming" })));
  };
  it("summarizes the full matching population before pagination without multiplying sessions by learners", async () => {
    seedSummary();
    const first = await getMvpLearnersData({ pageSize: "10" });
    requests = [];
    const last = await getMvpLearnersData({ page: "3", pageSize: "10", sortOrder: "desc" });
    for (const result of [first, last]) expect(result.summary).toMatchObject({ totalEnrolled: 26, sessionsHeld: 3, sessionsHeldUnavailableReason: null });
    expect(first.directory).toHaveLength(10);
    expect(last.directory).toHaveLength(6);
    expect(first.attendanceBySession).toEqual(last.attendanceBySession);
    expect(first.attendanceBySession.state).toBe("ready");
    if (first.attendanceBySession.state === "ready") {
      expect(first.attendanceBySession.rows).toHaveLength(3);
      for (const row of first.attendanceBySession.rows) {
        expect(row.total).toBe(26);
        expect(row.counts).toEqual({ verified_present: 0, verified_absent: 0, excused: 0, unrecorded: 26, unresolved: 0, not_eligible: 0 });
      }
    }
    expect(Number.isFinite(Date.parse(first.summary.asOf))).toBe(true);
  });
  it("aggregates weekly activity over all matching learners independently of paging and sorting", async () => {
    seedSummary();
    tables.submissions = Array.from({ length: 26 }, (_, i) => ({ id: `submission-${String(i).padStart(2, "0")}`,
      student_id: `s${String(i).padStart(2, "0")}`, track_slug: "a", week_number: 1, submitted_at: "2000-01-02T12:00:00Z" }));
    tables.reflections = tables.submissions.slice(0, 13).map(row => ({ ...row, id: `reflection-${row.id}` }));
    const first = await getMvpLearnersData({ pageSize: "10" });
    requests = [];
    const last = await getMvpLearnersData({ page: "3", pageSize: "10", sortOrder: "desc" });
    expect(first.weeklyMilestones).toEqual({ state: "ready", rows: [{ programId: "p1", courseSlug: "a", weekNumber: 1,
      total: 26, submissions: 26, reflections: 13, markedWatched: 0 }] });
    expect(last.weeklyMilestones).toEqual(first.weeklyMilestones);
    requests = [];
    expect((await getMvpLearnersData({ search: "Learner00" })).weeklyMilestones).toEqual({ state: "suppressed" });
    requests = [];
    expect((await getMvpLearnersData({ programId: "p1", courseSlug: "b" })).weeklyMilestones).toEqual({ state: "empty" });
    requests = [];
    expect((await getMvpLearnersData({ search: "No match" })).weeklyMilestones).toEqual({ state: "empty" });
  });
  const seedAttendance = () => {
    seedSummary();
    tables.mvp_attendance_reviews = ["a", "b"].flatMap(track_slug => [1, 2, 3, 4].map(week_number => ({
      id: `${track_slug}${week_number}`, revision: 1, program_id: "p1", student_id: "s00", track_slug, week_number, session_number: 1,
      session_held_at: "2000-01-02T12:00:00Z", eligibility: "eligible", eligibility_basis: "PRIVATE BASIS",
      outcome: track_slug === "a" && week_number === 2 ? "absent" : "present", recorded_by: "PRIVATE ACTOR", recorded_at: "2000-01-03T12:00:00Z",
    })));
  };
  it("filters supported check-in statuses before pagination with accurate learner and summary counts", async () => {
    seedAttendance();
    tables.mvp_attendance_reviews[0].outcome = "absent";
    const result = await getMvpLearnersData({ status: "needs_check_in", page: "2", pageSize: "10" });
    expect(result.pagination).toMatchObject({ totalMatching: 1, page: 1 });
    expect(result.summary.totalEnrolled).toBe(1);
    expect(result.summary.needsCheckIn).toBe(1);
    expect(result.directory[0].enrollments.map(row => row.courseSlug)).toEqual(["a"]);
    expect(result.directory[0].enrollments[0].checkIn.attentionFlags[0].reason).toBe("missed_sessions");
    expect(result.directory[0].enrollments[0].checkIn.attentionFlags[0]).toMatchObject({ learnerId: "s00", programId: "p1", courseSlug: "a",
      supportingEvidence: { kind: "verified_absences", count: 2, threshold: 2, sessions: [
        { weekNumber: 1, sessionNumber: 1, state: "verified_absent" }, { weekNumber: 2, sessionNumber: 1, state: "verified_absent" },
      ] } });
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    requests = [];
    expect((await getMvpLearnersData({ status: "on_track" })).pagination.totalMatching).toBe(0);
    requests = [];
    const unknown = await getMvpLearnersData({ status: "not_evaluated", page: "3", pageSize: "10" });
    expect(unknown.pagination.totalMatching).toBe(26);
    expect(unknown.directory).toHaveLength(6);
  });
  it("counts flagged learners across all pages once, even with multiple flagged enrollments", async () => {
    seedAttendance();
    tables.session_content.find(row => row.id === "b2")!.status = "completed";
    const reviews = tables.mvp_attendance_reviews;
    tables.mvp_attendance_reviews = ["s00", "s25"].flatMap(student_id => reviews.map(row => ({
      ...row, id: `${student_id}${row.id}`, student_id, outcome: "absent",
    })));
    for (const params of [{ page: "1", pageSize: "10" }, { page: "3", pageSize: "10" }, { sortOrder: "desc", pageSize: "25" }]) {
      requests = [];
      const result = await getMvpLearnersData(params);
      expect(result.summary).toMatchObject({ totalEnrolled: 26, needsCheckIn: 2 });
      expect(result.directory.length).toBeLessThanOrEqual(Number(params.pageSize));
    }
    requests = [];
    expect((await getMvpLearnersData({ search: "Learner25" })).summary.needsCheckIn).toBe(1);
    requests = [];
    expect((await getMvpLearnersData({ search: "Learner01" })).summary.needsCheckIn).toBe(0);
    requests = [];
    expect((await getMvpLearnersData({ status: "not_evaluated" })).summary.needsCheckIn).toBe(0);
    requests = [];
    const flagged = await getMvpLearnersData({ status: "needs_check_in" });
    expect(flagged.summary.needsCheckIn).toBe(flagged.pagination.totalMatching);
    requests = [];
    expect((await getMvpLearnersData({ search: "No match" })).summary.needsCheckIn).toBe(0);
  });
  it("returns privacy-safe attendance states per enrollment even when its ratio is unavailable", async () => {
    seedAttendance();
    tables.mvp_attendance_reviews[1].outcome = "excused";
    tables.mvp_attendance_reviews = tables.mvp_attendance_reviews.filter(row => row.track_slug !== "b");
    const result = await getMvpLearnersData({ search: "Learner00" });
    const [a, b] = result.directory[0].enrollments;
    expect(a.attendanceSessions).toEqual([
      { weekNumber: 1, sessionNumber: 1, state: "verified_present" },
      { weekNumber: 2, sessionNumber: 1, state: "excused" },
    ]);
    expect(b.attendanceSessions).toEqual([{ weekNumber: 1, sessionNumber: 1, state: "unrecorded" }]);
    expect(a.attendance).toBeNull();
    expect(b.attendance).toBeNull();
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(JSON.stringify(result)).not.toContain("recorded_by");
  });
  it("returns separate verified course ratios using complete reviews, excluding future, optional, and upcoming sessions", async () => {
    seedAttendance();
    const result = await getMvpLearnersData({ search: "Learner00" });
    expect(result.directory[0].enrollments.map(row => row.attendance)).toEqual([{ present: 1, eligibleHeld: 2 }, { present: 1, eligibleHeld: 1 }]);
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(result.directory[0].enrollments.every(row => row.attendanceUnavailableReason === null)).toBe(true);
  });
  it.each(["missing", "conflict", "excused", "ineligible", "unknown", "duplicate", "future-review"])("does not invent attendance for %s evidence", async kind => {
    seedAttendance();
    const review = tables.mvp_attendance_reviews[1];
    if (kind === "missing") tables.mvp_attendance_reviews.splice(1, 1);
    if (kind === "conflict") tables.attendance = [{ id: "checkin", student_id: "s00", track: "a", week_number: 2, session_number: 1, checked_in_at: null }];
    if (kind === "excused") review.outcome = "excused";
    if (kind === "ineligible") { review.eligibility = "not_eligible"; review.outcome = "unknown"; }
    if (kind === "unknown") review.eligibility = "unknown";
    if (kind === "duplicate") tables.mvp_attendance_reviews.push({ ...review, id: "zduplicate" });
    if (kind === "future-review") review.recorded_at = "2999-01-01T00:00:00Z";
    const result = await getMvpLearnersData({ search: "Learner00" });
    expect(result.directory[0].enrollments[0].attendance).toBeNull();
    expect(result.directory[0].enrollments[0].attendanceUnavailableReason).toBeTruthy();
    expect(result.directory[0].enrollments[1].attendance).toEqual({ present: 1, eligibleHeld: 1 });
  });
  it("uses latest review revisions and ignores other programs, courses, and learners", async () => {
    seedAttendance();
    const review = tables.mvp_attendance_reviews[1];
    tables.mvp_attendance_reviews.push({ ...review, id: "zcorrection", revision: 2, outcome: "present" });
    tables.mvp_attendance_reviews.push({ ...review, id: "zzprivate", program_id: "p2", revision: 99 });
    tables.attendance = [{ id: "other", student_id: "other", track: "a", week_number: 2, session_number: 1, checked_in_at: null }];
    const result = await getMvpLearnersData({ search: "Learner00" });
    expect(result.directory[0].enrollments[0].attendance).toEqual({ present: 2, eligibleHeld: 2 });
    requests = [];
    const page = await getMvpLearnersData({ page: "3", pageSize: "10" });
    expect(page.directory.every(learner => learner.enrollments.every(row => row.attendance === null))).toBe(true);
  });
  it("returns known zero without claiming an attendance percentage and skips evidence reads", async () => {
    seedAttendance();
    tables.session_content.forEach(row => { row.status = "upcoming"; });
    const result = await getMvpLearnersData({ search: "Learner00" });
    expect(result.directory[0].enrollments[0].attendance).toEqual({ present: 0, eligibleHeld: 0 });
    expect(requests).not.toContain("attendance");
    expect(requests).not.toContain("mvp_attendance_reviews");
  });
  it.each(["attendance", "mvp_attendance_reviews"])("fails closed on %s read errors", async source => {
    seedAttendance(); failure = source;
    await expect(getMvpLearnersData({ search: "Learner00" })).rejects.toThrow("Unable to load complete");
  });
  it("finds conflicting check-ins on later pages and rejects partial or stalled attendance reads", async () => {
    seedAttendance();
    tables.attendance = [1, 2].map(week_number => ({ id: `check${week_number}`, student_id: "s00", track: "a", week_number, session_number: 1, checked_in_at: null }));
    const result = await getMvpLearnersData({ search: "Learner00" });
    expect(result.directory[0].enrollments[0].attendance).toBeNull();
    requests = []; failAttendanceAfter = 1;
    await expect(getMvpLearnersData({ search: "Learner00" })).rejects.toThrow("Unable to load complete learner attendance");
    requests = []; failAttendanceAfter = Infinity; ignoreAttendanceCursor = true;
    await expect(getMvpLearnersData({ search: "Learner00" })).rejects.toThrow("Learner attendance pagination did not advance");
  });
  it("scopes summary counts to search, course, and reliably linked cohort and returns zero for no matches", async () => {
    seedSummary();
    expect((await getMvpLearnersData({ search: "Learner00" })).summary).toMatchObject({ totalEnrolled: 1, sessionsHeld: 3 });
    requests = [];
    expect((await getMvpLearnersData({ programId: "p1", courseSlug: "a", cohortId: "c1" })).summary).toMatchObject({ totalEnrolled: 1, sessionsHeld: 2 });
    requests = [];
    expect((await getMvpLearnersData({ search: "No match" })).summary).toMatchObject({ totalEnrolled: 0, sessionsHeld: 0 });
    expect(requests).not.toContain("session_content");
  });
  it("does not read unauthorized programs or unmatched course delivery for the summary", async () => {
    seedSummary();
    tables.track_overrides.push({ ...tables.track_overrides[0], id: "secret", program_id: "p2", track_slug: "secret" });
    tables.session_content.push({ id: "secret", track: "secret", week_number: 1, status: "completed" });
    expect((await getMvpLearnersData({ programId: "p1", courseSlug: "b" })).summary).toMatchObject({ totalEnrolled: 26, sessionsHeld: 1 });
  });
  it.each(["missing", "conflicting", "incomplete", "self-paced"])("returns unavailable, not a partial total, for %s evidence", async kind => {
    seedSummary();
    if (kind === "missing") tables.session_content = tables.session_content.filter(row => row.id !== "a1");
    if (kind === "conflicting") tables.session_content.push({ ...tables.session_content[0], id: "z1", status: "upcoming" });
    if (kind === "incomplete") tables.track_overrides[0].week_summaries = [];
    if (kind === "self-paced") tables.track_overrides[0].self_paced = true;
    const { summary } = await getMvpLearnersData();
    expect(summary.totalEnrolled).toBe(26);
    expect(summary.sessionsHeld).toBeNull();
    expect(summary.sessionsHeldUnavailableReason).toBeTruthy();
  });
  it("accepts known zero and matching duplicate delivery, excluding future sessions and optional extras", async () => {
    seedSummary();
    tables.session_content.push({ ...tables.session_content[0], id: "z1" });
    expect((await getMvpLearnersData()).summary.sessionsHeld).toBe(3);
    requests = [];
    tables.session_content.forEach(row => { row.status = "upcoming"; });
    expect((await getMvpLearnersData()).summary).toMatchObject({ sessionsHeld: 0, sessionsHeldUnavailableReason: null });
  });
  it("uses canonical owner schedule overrides for shared courses", async () => {
    seedSummary();
    mocks.home.mockReturnValue({ slug: "two", tracks: [{ slug: "a" }] });
    tables.track_overrides.push({ ...tables.track_overrides[0], id: "owner", program_id: "p2", self_paced: true });
    expect((await getMvpLearnersData({ programId: "p1", courseSlug: "a" })).summary.sessionsHeld).toBeNull();
  });
  it("fails closed on duplicate schedule overrides and delivery read errors", async () => {
    seedSummary();
    tables.track_overrides.push({ ...tables.track_overrides[0], id: "zoverride" });
    await expect(getMvpLearnersData()).rejects.toThrow("Ambiguous learner session schedule");
    tables.track_overrides.pop();
    requests = []; failure = "session_content";
    await expect(getMvpLearnersData()).rejects.toThrow("Unable to verify delivered learner sessions");
  });
  it("fails closed on later delivery pages and non-advancing delivery cursors", async () => {
    seedSummary();
    failDeliveryAfter = 1;
    await expect(getMvpLearnersData()).rejects.toThrow("Unable to verify delivered learner sessions");
    requests = []; failDeliveryAfter = Infinity; ignoreDeliveryCursor = true;
    await expect(getMvpLearnersData()).rejects.toThrow("Learner session pagination did not advance");
  });
  const seedActivityLearner = () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "a", name: "A" }, { slug: "b", name: "B" }] }]);
    const students = { id: "s1", first_name: "Test", last_name: "Learner", email: null, cohort_id: null, role: "student", is_test: false, is_staff: false };
    tables.student_tracks = ["a", "b"].map(track_slug => ({ id: `e${track_slug}`, student_id: "s1", program_id: "p1", track_slug, students }));
  };
  it("returns weekly timestamp-only milestones across all source pages without mixing learners or courses", async () => {
    seedActivityLearner();
    tables.submissions = [
      { id: "s1", student_id: "s1", track_slug: "a", week_number: 2, submitted_at: "2026-01-02T09:00:00-05:00", content: "PRIVATE" },
      { id: "s2", student_id: "s1", track_slug: "a", week_number: 1, submitted_at: "2026-01-01T12:00:00Z" },
      { id: "s3", student_id: "s1", track_slug: "a", week_number: 2, submitted_at: "2026-01-03T12:00:00Z" },
      { id: "s4", student_id: "other", track_slug: "a", week_number: 9, submitted_at: "2026-01-03T12:00:00Z" },
      { id: "s5", student_id: "s1", track_slug: "private", week_number: 9, submitted_at: "2026-01-03T12:00:00Z" },
    ];
    tables.reflections = [{ id: "r1", student_id: "s1", track_slug: "a", week_number: 2, submitted_at: "2026-01-03T16:00:00+01:00", answers: "PRIVATE" }];
    tables.week_progress = [
      { id: "v1", user_id: "s1", track_slug: "a", week_number: 2, video_watched_at: "2026-01-04T12:00:00Z" },
      { id: "v2", user_id: "s1", track_slug: "b", week_number: 1, video_watched_at: "2026-01-05T12:00:00Z" },
    ];
    const [a, b] = (await getMvpLearnersData()).directory[0].enrollments;
    const none = { at: null, state: "none_recorded" };
    expect(a.weeklyMilestones).toEqual([
      { weekNumber: 1, submission: { at: "2026-01-01T12:00:00.000Z", state: "recorded" }, reflection: none, markedWatched: none },
      { weekNumber: 2, submission: { at: "2026-01-03T12:00:00.000Z", state: "recorded" },
        reflection: { at: "2026-01-03T15:00:00.000Z", state: "recorded" }, markedWatched: { at: "2026-01-04T12:00:00.000Z", state: "recorded" } },
    ]);
    expect(b.weeklyMilestones).toEqual([{ weekNumber: 1, submission: none, reflection: none, markedWatched: { at: "2026-01-05T12:00:00.000Z", state: "recorded" } }]);
    expect(JSON.stringify([a, b])).not.toContain("PRIVATE");
  });
  it.each(["bad", "2999-01-01T00:00:00Z", "2026-01-01T12:00:00"])("isolates invalid milestone timestamps to their week and source: %s", async submitted_at => {
    seedActivityLearner();
    tables.submissions = [
      { id: "s1", student_id: "s1", track_slug: "a", week_number: 1, submitted_at },
      { id: "s2", student_id: "s1", track_slug: "a", week_number: 2, submitted_at: "2026-01-02T12:00:00Z" },
    ];
    tables.reflections = [{ id: "r1", student_id: "s1", track_slug: "a", week_number: 1, submitted_at: "2026-01-01T12:00:00Z" }];
    const [a, b] = (await getMvpLearnersData()).directory[0].enrollments;
    expect(a.weeklyMilestones[0].submission).toEqual({ at: null, state: "unavailable" });
    expect(a.weeklyMilestones[0].reflection.state).toBe("recorded");
    expect(a.weeklyMilestones[1].submission.state).toBe("recorded");
    expect(b.weeklyMilestones).toEqual([]);
  });
  it("preserves unmapped activity and null marks without inferring completion or deadlines", async () => {
    seedActivityLearner();
    tables.submissions = [{ id: "s1", student_id: "s1", track_slug: "a", week_number: null, submitted_at: "2026-01-01T12:00:00Z" }];
    tables.week_progress = [{ id: "v1", user_id: "s1", track_slug: "a", week_number: 1, video_watched_at: null, updated_at: "2026-01-01T12:00:00Z" }];
    const a = (await getMvpLearnersData()).directory[0].enrollments[0];
    expect(a.weeklyMilestones.map(row => row.weekNumber)).toEqual([1, null]);
    expect(a.weeklyMilestones[0].markedWatched).toEqual({ at: null, state: "none_recorded" });
    expect(a.weeklyMilestones[1].submission.state).toBe("recorded");
  });
  it("returns the latest course action in UTC across complete timestamp-only source pages", async () => {
    seedActivityLearner();
    tables.submissions = [
      { id: "a1", student_id: "s1", track_slug: "a", submitted_at: "2026-01-01T09:00:00-05:00" },
      { id: "a2", student_id: "s1", track_slug: "a", submitted_at: "2026-01-02T09:00:00-05:00", content: "PRIVATE" },
      { id: "a3", student_id: "other", track_slug: "a", submitted_at: "2026-01-09T00:00:00Z" },
      { id: "a4", student_id: "s1", track_slug: "private", submitted_at: "2026-01-09T00:00:00Z" },
    ];
    tables.reflections = [{ id: "r1", student_id: "s1", track_slug: "a", submitted_at: "2026-01-03T09:00:00-05:00", answers: "PRIVATE" }];
    tables.week_progress = [
      { id: "v1", user_id: "s1", track_slug: "a", video_watched_at: "2026-01-03T16:00:00+01:00" },
      { id: "v2", user_id: "s1", track_slug: "b", video_watched_at: "2026-01-01T12:00:00Z" },
    ];
    const result = await getMvpLearnersData();
    expect(result.directory[0].enrollments.map(e => e.lastActivity)).toEqual([
      { at: "2026-01-03T15:00:00.000Z", state: "recorded" },
      { at: "2026-01-01T12:00:00.000Z", state: "recorded" },
    ]);
    expect(JSON.stringify(result.directory)).not.toContain("PRIVATE");
    expect(requests).not.toContain("attendance");
  });
  it.each(["bad", "2999-01-01T00:00:00Z", "2026-01-01T12:00:00"])("marks invalid activity unavailable without contaminating other courses: %s", async submitted_at => {
    seedActivityLearner();
    tables.submissions = [{ id: "a1", student_id: "s1", track_slug: "a", submitted_at }];
    const result = await getMvpLearnersData();
    expect(result.directory[0].enrollments.map(e => e.lastActivity.state)).toEqual(["unavailable", "none_recorded"]);
  });
  it("does not treat draft timestamps or staff changes as learner activity", async () => {
    seedActivityLearner();
    tables.submissions = [{ id: "a1", student_id: "s1", track_slug: "a", submitted_at: null, updated_at: "2026-01-01T12:00:00Z" }];
    expect((await getMvpLearnersData()).directory[0].enrollments[0].lastActivity).toEqual({ at: null, state: "none_recorded" });
  });
  it.each(["submissions", "reflections", "week_progress"])("fails rather than reporting no activity when %s cannot be read", async source => {
    seedActivityLearner(); failure = source;
    await expect(getMvpLearnersData()).rejects.toThrow("complete learner activity");
  });
  it("does not read activity when the authorized search has no matching learners", async () => {
    seedActivityLearner();
    expect((await getMvpLearnersData({ search: "no match" })).directory).toEqual([]);
    expect(requests.some(source => ["submissions", "reflections", "week_progress"].includes(source))).toBe(false);
  });
  it("batches over 100 courses without dropping enrollments or cohorts", async () => {
    serverCap = 500;
    const tracks = Array.from({ length: 101 }, (_, i) => ({ slug: `course-${String(i).padStart(3, "0")}`, name: `Course ${i}` }));
    mocks.configs.mockReturnValue([{ slug: "one", tracks }]);
    const students = { id: "s1", first_name: "Test", last_name: "Learner", email: "test@example.test", cohort_id: null, role: "student", is_test: false, is_staff: false };
    tables.student_tracks = tracks.map((track, i) => ({ id: `e${String(i).padStart(3, "0")}`, program_id: "p1", track_slug: track.slug, student_id: "s1", students }));
    tables.cohorts = tracks.map((track, i) => ({ id: `c${String(i).padStart(3, "0")}`, program_id: "p1", track_slug: track.slug, name: `Cohort ${i}`, display_name: null }));
    const result = await getMvpLearnersData();
    expect(result.directory[0].enrollments).toHaveLength(101);
    expect(result.pagination.totalMatching).toBe(1);
    expect(result.options.cohorts).toHaveLength(101);
    // Two bounded batches, each followed by an empty-page completeness check.
    expect(requests.filter(t => t === "student_tracks")).toHaveLength(4);
    expect(requests.filter(t => t === "cohorts")).toHaveLength(4);
  });
  it("rejects stuck cursors and late-page failures instead of returning partial rosters", async () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "a", name: "A" }] }]);
    tables.student_tracks = [{ id: "e1", program_id: "p1", track_slug: "a", student_id: "s1", students: { id: "s1", first_name: "Test", last_name: "Learner", email: null, cohort_id: null, role: "student", is_test: false, is_staff: false } }];
    ignoreRosterCursor = true;
    await expect(getMvpLearnersData()).rejects.toThrow("pagination did not advance");
    requests = []; ignoreRosterCursor = false; failRosterAfter = 1;
    await expect(getMvpLearnersData()).rejects.toThrow("complete learner directory");
  });
  it("keeps all matching cross-program enrollments without borrowing access from one course", async () => {
    mocks.configs.mockReturnValue([
      { slug: "one", tracks: [{ slug: "a", name: "A" }, { slug: "hidden", name: "Hidden" }] },
      { slug: "two", tracks: [{ slug: "b", name: "B" }, { slug: "private", name: "Private" }] },
    ]);
    tables.staff_program_access = [{ id: "g1", student_id: "actor", program_id: "p2", role: "admin", track_slug: "b" }];
    tables.hidden_courses = [{ track_slug: "hidden" }];
    tables.cohorts = [{ id: "c1", program_id: "p2", track_slug: "b", name: "Current", display_name: null }];
    const students = { id: "s1", first_name: "Test", last_name: "Learner", email: "test@example.test", cohort_id: "c1", role: "student", is_test: false, is_staff: false };
    tables.student_tracks = [
      { id: "e1", program_id: "p1", track_slug: "a", student_id: "s1", students },
      { id: "e2", program_id: "p2", track_slug: "b", student_id: "s1", students },
      { id: "e3", program_id: "p2", track_slug: "b", student_id: "s1", students },
      { id: "e4", program_id: "p2", track_slug: "private", student_id: "s1", students },
      { id: "e5", program_id: "p1", track_slug: "hidden", student_id: "s1", students },
    ];
    const run = async (params: Parameters<typeof getMvpLearnersData>[0] = {}) => { requests = []; return getMvpLearnersData(params); };
    const all = await run();
    expect(all.pagination.totalMatching).toBe(1);
    expect(all.directory[0].enrollments).toMatchObject([
      { programId: "p1", programName: "One", courseSlug: "a", courseName: "A", cohort: null, attendance: null, lastActivity: { at: null, state: "none_recorded" }, status: "not_evaluated" },
      { programId: "p2", programName: "Two", courseSlug: "b", courseName: "B", cohort: { id: "c1", name: "Current" }, attendance: null, lastActivity: { at: null, state: "none_recorded" }, status: "not_evaluated" },
    ]);
    expect(all.directory[0].enrollments.every(row => row.caughtUp.percent === null && !!row.caughtUp.unavailableReason)).toBe(true);
    expect((await run({ search: "TEST@EXAMPLE" })).directory[0].enrollments).toHaveLength(2);
    expect((await run({ programId: "p1" })).directory[0].enrollments.map(e => e.courseSlug)).toEqual(["a"]);
    expect((await run({ programId: "p2", courseSlug: "b", cohortId: "c1" })).directory[0].enrollments.map(e => e.courseSlug)).toEqual(["b"]);
    await expect(run({ programId: "p2", courseSlug: "private" })).rejects.toThrow("course is unavailable");
    // Revoking the cross-program grant removes that enrollment on the next call.
    tables.staff_program_access = [];
    expect((await run()).directory[0].enrollments.map(e => e.programId)).toEqual(["p1"]);
  });
  it("does not return a partial enrollment list when later course data fails", async () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "a", name: "A" }, { slug: "b", name: "B" }] }]);
    const students = { id: "s1", first_name: "Test", last_name: "Learner", email: "test@example.test", cohort_id: null, role: "student", is_test: false, is_staff: false };
    tables.student_tracks = [
      { id: "e1", program_id: "p1", track_slug: "a", student_id: "s1", students },
      { id: "e2", program_id: "p1", track_slug: "b", student_id: "s1", students: { ...students, email: "conflict@example.test" } },
    ];
    await expect(getMvpLearnersData()).rejects.toThrow("Conflicting learner profile records");
  });
  it("deduplicates before pagination, retaining every matching course and accurate counts", async () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "a", name: "A" }, { slug: "b", name: "B" }] }]);
    tables.student_tracks = Array.from({ length: 26 }, (_, index) => {
      const id = String(index).padStart(2, "0");
      const students = { id: `s${id}`, first_name: "Same", last_name: "Name", email: `learner${id}@example.test`, cohort_id: null, role: "student", is_test: false, is_staff: false };
      return ["a", "b"].map(track_slug => ({ id: `e${id}${track_slug}`, student_id: students.id, program_id: "p1", track_slug, students }));
    }).flat();
    // Duplicate enrollment must not create another learner or course entry.
    tables.student_tracks.push({ ...tables.student_tracks[0], id: "zzduplicate" });
    const first = await getMvpLearnersData();
    requests = [];
    const second = await getMvpLearnersData({ page: "2" });
    expect(first.directory).toHaveLength(25);
    expect(second.directory).toHaveLength(1);
    expect(first.pagination).toMatchObject({ totalMatching: 26, page: 1, totalPages: 2, start: 1, end: 25, hasNext: true });
    expect(second.pagination).toMatchObject({ totalMatching: 26, start: 26, end: 26, hasPrevious: true, hasNext: false });
    const all = [...first.directory, ...second.directory];
    expect(new Set(all.map(row => row.id)).size).toBe(26);
    expect(all.every(row => row.enrollments.length === 2)).toBe(true);
    expect(all.map(row => row.id)).toEqual(Array.from({ length: 26 }, (_, i) => `s${String(i).padStart(2, "0")}`));
    requests = [];
    const filtered = await getMvpLearnersData({ search: "learner00@", page: "999" });
    expect(filtered.pagination).toMatchObject({ page: 1, totalMatching: 1, totalPages: 1 });
    requests = [];
    const empty = await getMvpLearnersData({ search: "no match", page: "2" });
    expect(empty.pagination).toMatchObject({ page: 1, totalMatching: 0, start: 0, end: 0 });
  });
  it("searches authorized names/emails literally and returns only matching enrollments", async () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "a", name: "A" }, { slug: "b", name: "B" }] }]);
    const profile = { id: "s1", first_name: "Ada", last_name: "Example", email: "ada@example.test", cohort_id: "c1", role: "student", is_test: false, is_staff: false };
    tables.cohorts = [{ id: "c1", program_id: "p1", track_slug: "a", name: "One", display_name: null }];
    tables.student_tracks = [
      { id: "e1", student_id: "s1", program_id: "p1", track_slug: "a", students: profile },
      { id: "e2", student_id: "s1", program_id: "p1", track_slug: "b", students: profile },
      { id: "e3", student_id: "s2", program_id: "p2", track_slug: "a", students: { ...profile, id: "s2", first_name: "Secret" } },
      { id: "e4", student_id: "s3", program_id: "p1", track_slug: "a", students: { ...profile, id: "s3", is_test: true } },
      { id: "e5", student_id: "s4", program_id: "p1", track_slug: "a", students: { ...profile, id: "s4", is_staff: true } },
    ];
    const run = async (params: Parameters<typeof getMvpLearnersData>[0]) => { requests = []; return getMvpLearnersData(params); };
    const result = await run({ search: " ADA EXAMPLE " });
    expect(result.directory).toHaveLength(1);
    expect(result.directory[0].enrollments).toHaveLength(2);
    expect(result.directory[0].enrollments[1].cohort).toBeNull();
    expect((await run({ search: "ADA@EXAMPLE" })).directory).toHaveLength(1);
    expect((await run({ search: "%" })).directory).toEqual([]);
    expect((await run({ search: "Secret" })).directory).toEqual([]);
    const filtered = await run({ programId: "p1", courseSlug: "a", cohortId: "c1", status: "not_evaluated" });
    expect(filtered.directory[0].enrollments).toHaveLength(1);
    expect(filtered.directory[0].enrollments[0].status).toBe("not_evaluated");
    await expect(run({ programId: "p1", courseSlug: "b", cohortId: "c1" })).rejects.toThrow("cohort is unavailable");
    await expect(run({ programId: "p1", courseSlug: "secret" })).rejects.toThrow("course is unavailable");
  });
  it("rejects malformed filters and unsupported status evaluation without reading learners", async () => {
    for (const params of [{ search: ["a", "b"] }, { search: "a".repeat(201) }, { courseSlug: "a" }, { cohortId: "c1" }, { status: "invalid" }]) {
      await expect(getMvpLearnersData(params)).rejects.toThrow();
    }
    expect(requests).not.toContain("student_tracks");
  });
  it("fails closed when the roster cannot be read", async () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "a", name: "A" }] }]);
    failure = "student_tracks";
    await expect(getMvpLearnersData()).rejects.toThrow("complete learner directory");
  });
  it("returns only granted courses and explicitly linked cohorts, including later pages", async () => {
    tables.students[0].program_id = null;
    tables.staff_program_access = [{ id: "g1", student_id: "actor", program_id: "p2", role: "admin", track_slug: "a" }, { id: "g2", student_id: "actor", program_id: "p2", role: "instructor", track_slug: null }];
    mocks.configs.mockReturnValue([{ slug: "two", tracks: [{ slug: "a", name: "Original" }, { slug: "b", name: "Secret course" }] }]);
    tables.track_overrides = [{ id: "o1", program_id: "p2", track_slug: "a", name: "Updated" }];
    tables.cohorts = [
      { id: "c1", program_id: "p2", track_slug: "a", name: "Internal", display_name: "Public cohort" },
      { id: "c2", program_id: "p2", track_slug: "a", name: "Second", display_name: null },
      { id: "c3", program_id: "p2", track_slug: "b", name: "Secret", display_name: null },
      { id: "c4", program_id: "p1", track_slug: "a", name: "Wrong program", display_name: null },
      { id: "c5", program_id: "p2", track_slug: null, name: "Unlinked", display_name: null },
    ];
    const { options } = await getMvpLearnersData();
    expect(options.programs).toEqual([{ id: "p2", name: "Two" }]);
    expect(options.courses).toEqual([{ programId: "p2", slug: "a", name: "Updated" }]);
    expect(options.cohorts.map(c => c.id)).toEqual(["c1", "c2"]);
    expect(JSON.stringify(options)).not.toMatch(/Secret|Wrong program|Unlinked/);
    requests = [];
    expect(await getMvpLearnerFilterOptions()).toEqual(options);
    for (const table of ["student_tracks", "attendance", "submissions", "reflections", "week_progress"]) expect(requests).not.toContain(table);
  });
  it.each(["signed-out", "student", "preview"])("denies options before database reads for %s", async mode => {
    if (mode === "signed-out") mocks.session.mockResolvedValue(null);
    if (mode === "student") mocks.session.mockResolvedValue({ userId: "actor", student: { role: "student" } });
    if (mode === "preview") mocks.preview.mockResolvedValue(true);
    await expect(getMvpLearnerFilterOptions()).rejects.toThrow("Learner access is required");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("returns empty options for an authorized staff member without program access", async () => {
    tables.students[0].program_id = null;
    expect(await getMvpLearnerFilterOptions()).toEqual({ programs: [], courses: [], cohorts: [] });
    expect(requests).not.toContain("student_tracks");
  });
  it("includes builder courses, excludes hidden courses and paginates definitions", async () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "hidden", name: "Hidden" }] }]);
    tables.track_overrides = [{ id: "o1", program_id: "p1", track_slug: "a", name: "Builder A" }, { id: "o2", program_id: "p1", track_slug: "b", name: "Builder B" }];
    tables.hidden_courses = [{ track_slug: "hidden" }];
    expect((await getMvpLearnersData()).options.courses.map(c => c.slug)).toEqual(["a", "b"]);
    requests = [];
    expect((await getMvpLearnerFilterOptions()).courses.map(c => c.slug)).toEqual(["a", "b"]);
    expect(requests).not.toContain("student_tracks");
  });
  it("fails closed on option lookup errors", async () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "a", name: "A" }] }]);
    for (const table of ["track_overrides", "hidden_courses", "cohorts"]) {
      requests = []; failure = table;
      await expect(getMvpLearnersData()).rejects.toThrow();
      await expect(getMvpLearnerFilterOptions()).rejects.toThrow();
    }
  });
  it("rejects signed-out, missing-profile, student and instructor access before creating a service client", async () => {
    for (const session of [null, { userId: "actor", student: null }, ...["student", "instructor"].map(role => ({ userId: "actor", student: { role } }))]) {
      mocks.session.mockResolvedValue(session);
      await expect(getMvpLearnersData()).rejects.toThrow("Learner access");
    }
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("blocks student preview even for super admins", async () => {
    mocks.preview.mockResolvedValue(true);
    for (const role of ["admin", "super_admin"]) {
      mocks.session.mockResolvedValue({ userId: "actor", student: { role } });
      await expect(getMvpLearnersData()).rejects.toThrow("Learner access");
    }
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("limits admins to home and permitted course grants, not instructor grants", async () => {
    tables.staff_program_access = [
      { id: "g1", student_id: "actor", program_id: "p2", role: "admin", track_slug: "course-a" },
      { id: "g2", student_id: "actor", program_id: "p2", role: "instructor", track_slug: null },
      { id: "g3", student_id: "other", program_id: "p2", role: "admin", track_slug: null },
    ];
    const result = await getMvpLearnersData();
    expect(result.programs.map(p => [p.id, p.courseSlugs])).toEqual([["p1", null], ["p2", ["course-a"]]]);
    expect(result.directory).toEqual([]);
    expect(requests.every(table => ["students", "staff_program_access", "programs", "track_overrides"].includes(table))).toBe(true);
  });
  it("rejects unauthorized and repeated program selections", async () => {
    await expect(getMvpLearnersData({ programId: "p2" })).rejects.toThrow("unavailable");
    await expect(getMvpLearnersData({ programId: ["p1", "p2"] })).rejects.toThrow("one program");
  });
  it("fails closed on home, grant and program lookup errors", async () => {
    for (const table of ["students", "staff_program_access", "programs"]) {
      requests = []; failure = table;
      await expect(getMvpLearnersData()).rejects.toThrow();
    }
  });
  it("returns no scope for an admin without a home or qualifying grants", async () => {
    tables.students[0].program_id = null;
    expect((await getMvpLearnersData()).programs).toEqual([]);
    expect(requests).not.toContain("programs");
  });
  it("loads all super-admin programs despite a one-row database cap and rejects nonexistent selections", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "super_admin" } });
    expect((await getMvpLearnersData()).programs).toHaveLength(2);
    expect(requests).not.toContain("staff_program_access");
    expect((await getMvpLearnersData({ programId: "p2" })).programs.map(p => p.id)).toEqual(["p2"]);
    await expect(getMvpLearnersData({ programId: "missing" })).rejects.toThrow("unavailable");
  });
});
