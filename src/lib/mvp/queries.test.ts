import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMvpDashboardData } from "./queries";
import { getMvpProgramDetail, getMvpCheckInEvidence } from "./detail-queries";
import { getMvpReportData } from "./report-queries";

// Replace infrastructure only: the real query function, role/grant helpers,
// schedules, milestones and summary calculations run together in these tests.
const mocks = vi.hoisted(() => ({ session: vi.fn(), preview: vi.fn(), client: vi.fn(), configs: vi.fn(), owner: vi.fn(), activeConfig: vi.fn(), signalPolicy: vi.fn() }));
vi.mock("./check-in-signals", async original => ({
  ...await original<typeof import("./check-in-signals")>(), getMvpSignalPolicy: mocks.signalPolicy,
}));
vi.mock("./active-config", async (original) => ({
  ...await original<typeof import("./active-config")>(), getMvpOfferingActiveConfig: mocks.activeConfig,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/surveys/schemas", () => ({ getSurveySchema: (id: string) => id === "feedback" ? [] : [{
  type: "dual-likert", id: "confidence", label: "Confidence", statements: ["Skills"],
  scale: ["1", "2", "3", "4", "5"], beforeLabel: "Before", nowLabel: "Now",
}] }));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: mocks.session }));
vi.mock("@/lib/auth/preview-mode", () => ({ isPreviewingAsStudent: mocks.preview }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: mocks.client }));
vi.mock("@/lib/programs", () => ({ getEveryProgramConfig: mocks.configs, getHomeProgramForTrack: mocks.owner }));

type Row = Record<string, unknown>;
type Request = { table: string; columns: string; filters: Array<[string, string, unknown]>; cap: number; single: boolean; optional: boolean };

// Minimal in-memory PostgREST double. It applies requested filters, stable
// cursors and artificial server caps; it does not simulate RLS or SQL joins.
class Database {
  tables: Record<string, Row[]> = {};
  requests: Request[] = [];
  serverCap = Infinity;
  fail: (request: Request) => boolean = () => false;
  from(table: string) {
    const request: Request = { table, columns: "", filters: [], cap: Infinity, single: false, optional: false };
    const chain = {
      select: (columns: string) => { request.columns = columns; return chain; },
      eq: (key: string, value: unknown) => { request.filters.push(["eq", key, value]); return chain; },
      in: (key: string, value: unknown[]) => { request.filters.push(["in", key, value]); return chain; },
      gt: (key: string, value: unknown) => { request.filters.push(["gt", key, value]); return chain; },
      or: (expression: string, options: { referencedTable: string }) => {
        request.filters.push(["or", options.referencedTable, expression]); return chain;
      },
      order: () => chain,
      limit: (cap: number) => { request.cap = cap; return chain; },
      returns: () => chain,
      single: () => { request.single = true; return chain; },
      maybeSingle: () => { request.single = true; request.optional = true; return chain; },
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve().then(() => this.execute(request)).then(resolve, reject),
    };
    return chain;
  }
  execute(request: Request): { data: Row | Row[] | null; error: { message: string } | null } {
    this.requests.push(structuredClone(request));
    if (this.requests.length > 5000) throw new Error("Test query did not terminate.");
    if (this.fail(request)) return { data: null, error: { message: "Simulated database failure" } };
    if (!(request.table in this.tables)) throw new Error(`Unexpected table: ${request.table}`);
    let rows = this.tables[request.table].filter((row) => request.filters.every(([op, key, value]) => {
      const field = key.split(".").reduce<unknown>((current, part) => (current as Row | undefined)?.[part], row);
      if (op === "eq") return field === value;
      if (op === "in") return (value as unknown[]).includes(field);
      if (op === "gt") return String(field) > String(value);
      if (op === "or") {
        const flag = String(value).split(".")[0];
        const actual = (row[key] as Row | undefined)?.[flag];
        return actual === null || actual === false;
      }
      throw new Error(`Unexpected operator: ${op}`);
    }));
    rows = [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (request.single) {
      return rows.length === 1 || (request.optional && rows.length === 0)
        ? { data: rows[0] ?? null, error: null }
        : { data: null, error: { message: "Expected one row" } };
    }
    return { data: rows.slice(0, Math.min(request.cap, this.serverCap)), error: null };
  }
}

// Two completed, single-session courses share one learner across programs.
const track = (slug: string) => ({ slug, name: slug, shortName: slug, startDate: "2026-09-01", totalWeeks: 1,
  sessionsPerWeek: 1, unitLabel: "Session", lastSessionDayOffset: 0, weekSummaries: [{ week: 1, date: "2026-09-01" }] });
const courseProgram: Record<string, string> = { alpha: "p1", beta: "p2" };
const enrollment = (id: string, student: string, course = "alpha", program = courseProgram[course] ?? "p1"): Row => ({
  id, student_id: student, track_slug: course, program_id: program,
  students: { id: student, role: "student", is_staff: false, is_test: false } });
const attendance = (id: string, student: string, course = "alpha", program = courseProgram[course] ?? "p1"): Row => ({
  id, student_id: student, track: course, program_id: program,
  week_number: 1, session_number: 1, checked_in_at: "2026-09-01T18:00:00Z" });
let db: Database;
let configs: Array<{ slug: string; tracks: ReturnType<typeof track>[]; surveys?: import("@/lib/programs/types").SurveyConfig[] }>;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.activeConfig.mockReturnValue(null);
  mocks.signalPolicy.mockReturnValue(null);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-02T18:00:00Z"));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network calls are forbidden in query tests."); }));
  db = new Database();
  db.tables = {
    survey_responses: [], hidden_courses: [], submissions: [], mvp_attendance_reviews: [], exam_attempts: [], week_progress: [],
    students: [{ id: "actor", program_id: "p1" }], staff_program_access: [], track_overrides: [],
    programs: [{ id: "p1", slug: "one", name: "One" }, { id: "p2", slug: "two", name: "Two" }],
    student_tracks: [enrollment("e1", "u1"), enrollment("e2", "u2"), enrollment("e3", "u1", "beta")],
    attendance: [attendance("a1", "u1"), attendance("a2", "u1", "beta")],
    session_content: ["alpha", "beta"].map((slug, index) => ({ id: `d${index}`, track: slug, program_id: courseProgram[slug], week_number: 1,
      status: "completed", status_2: "upcoming", status_3: "upcoming" })),
  };
  configs = [{ slug: "one", tracks: [track("alpha")] }, { slug: "two", tracks: [track("beta")] }];
  mocks.session.mockResolvedValue({ userId: "actor", student: { role: "super_admin" } });
  mocks.preview.mockResolvedValue(false);
  mocks.client.mockReturnValue(db);
  mocks.configs.mockImplementation(() => configs);
  mocks.owner.mockImplementation((slug: string) => configs.find((config) => config.tracks.some((item) => item.slug === slug)));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

// Detail selectors cannot broaden the same authenticated dashboard boundary.
describe("authorized details and evidence", () => {
  it("returns one program's offerings without learner evidence in the detail payload", async () => {
    const detail = await getMvpProgramDetail({ programId: "p1" });
    expect(detail.offerings.map(row => row.courseSlug)).toEqual(["alpha"]);
    expect(detail.summary?.programId).toBe("p1");
    expect(detail).not.toHaveProperty("checkInEvaluations");
    expect(detail).not.toHaveProperty("demographics");
  });
  it("returns only the selected learner/offering evidence", async () => {
    const detail = await getMvpCheckInEvidence({ programId: "p1", courseSlug: "alpha" }, "u2");
    expect(detail.evaluation.learnerId).toBe("u2");
    expect(detail.evaluation.programRowId).toBe("p1:alpha");
    await expect(getMvpCheckInEvidence({ programId: "p1", courseSlug: "alpha" }, "outsider")).rejects.toThrow("evidence is unavailable");
  });
  it("rejects missing selectors, unauthorized programs, and anonymous readers", async () => {
    await expect(getMvpProgramDetail({})).rejects.toThrow("Choose one program");
    await expect(getMvpCheckInEvidence({ programId: "p1" }, "u1")).rejects.toThrow("Choose a program");
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    await expect(getMvpProgramDetail({ programId: "p2" })).rejects.toThrow("program is unavailable");
    mocks.session.mockResolvedValue(null);
    await expect(getMvpCheckInEvidence({ programId: "p1", courseSlug: "alpha" }, "u1")).rejects.toThrow("MVP access");
  });
  it("honors filters when selecting evidence instead of returning excluded learners", async () => {
    await expect(getMvpCheckInEvidence({ programId: "p1", courseSlug: "alpha", city: "Nowhere" }, "u1")).rejects.toThrow("evidence is unavailable");
  });
  it("loads selected report events and omits learner evidence", async () => {
    db.tables.events = []; db.tables.event_registrations = []; db.tables.event_attendees = [];
    const report = await getMvpReportData({ programId: "p1" }, { metricKeys: ["active"], events: true, outcomes: true });
    expect(db.requests.some(row => row.table === "events")).toBe(true);
    expect(report.events?.rows).toEqual([]);
    expect(report.outcomes).toBeDefined();
    expect(report).not.toHaveProperty("checkInEvaluations");
  });
  it("maps only supported event metrics and preserves unknown rather than zero", async () => {
    db.tables.events = [{ id: "event", program_id: "p1", title: "Workshop", starts_at: "2026-09-30T14:00:00Z",
      ends_at: "2026-09-30T16:00:00Z", timezone: "America/New_York", status: "closed", capacity: 20 }];
    db.tables.event_registrations = []; db.tables.event_attendees = [];
    const report = await getMvpReportData({ programId: "p1" }, { metricKeys: ["active", "completed"], events: true });
    expect(report.events?.rows[0].metrics).toMatchObject([
      { key: "active", value: 0, unit: "Attendee tickets, not unique learners" },
      { key: "completed", value: null, unavailableReason: "This course metric is not established for separate events." },
    ]);
    expect(report.outcomes).toBeUndefined();
    expect(report.events?.rows[0].programName).toBe("One");
  });
});

// Separate tickets never become learner totals; source access remains opt-in.
describe("event and geography integration", () => {
  function seedEvents() {
    db.tables.events = ["p1", "p2"].map((p, i) => ({ id: `event${i}`, program_id: p, title: "Workshop",
      starts_at: "2026-09-30T14:00:00Z", ends_at: "2026-09-30T16:00:00Z", timezone: "America/New_York", status: "open", capacity: 20 }));
    db.tables.event_registrations = [{ id: "r1", program_id: "p1", event_id: "event0", status: "confirmed" }];
    db.tables.event_attendees = ["a1", "a2"].map(id => ({ id, registration_id: "r1", event_id: "event0", status: "attended", checked_in_at: "2026-09-30T14:00:00Z" }));
  }
  it("does not read events or structured geography by default", async () => {
    await getMvpDashboardData({});
    expect(db.requests.some(r => r.table === "events" || /zip|state/.test(r.columns))).toBe(false);
  });
  it("paginates all event tickets within the selected program without changing learner totals", async () => {
    seedEvents(); db.serverCap = 1;
    const result = await getMvpDashboardData({ programId: "p1" }, { includeEvents: true });
    expect(result.events?.rows).toHaveLength(1);
    expect(result.events?.rows[0]).toMatchObject({ active: 2, enrolled: 2 });
    expect(result.programs[0].totalParticipants).toBe(2);
    expect(db.requests.filter(r => r.table === "event_attendees")).toHaveLength(3);
    expect(db.requests.filter(r => r.table === "events").every(r => r.filters.some(f => f[1] === "program_id" && f[2] === "p1"))).toBe(true);
    expect(db.requests.some(r => /parent_email|ticket_code|cancel_token|first_name/.test(r.columns))).toBe(false);
  });
  it("does not broaden course-only or instructor grants to event access", async () => {
    seedEvents();
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    db.tables.staff_program_access = [{ student_id: "actor", program_id: "p2", role: "admin", track_slug: "beta" },
      { student_id: "actor", program_id: "p2", role: "instructor", track_slug: null }];
    const result = await getMvpDashboardData({ programId: "p2" }, { includeEvents: true });
    expect(result.events?.rows).toEqual([]);
    expect(db.requests.some(r => r.table.startsWith("event"))).toBe(false);
  });
  it.each([{ courseSlug: "alpha" }, { learnerStatus: "active" }, { city: "Boston" }])("discloses unsupported event filters %s", async params => {
    seedEvents();
    const result = await getMvpDashboardData({ programId: "p1", ...params }, { includeEvents: true });
    expect(result.events?.unavailableReason).toContain("excluded");
    expect(db.requests.some(r => r.table.startsWith("event"))).toBe(false);
  });
  it("excludes drafts and out-of-window events before reading tickets", async () => {
    seedEvents(); db.tables.events[0].status = "draft";
    const result = await getMvpDashboardData({ startDate: "2026-10-01" }, { includeEvents: true });
    expect(result.events?.rows).toEqual([]);
    expect(db.requests.some(r => r.table === "event_attendees")).toBe(false);
  });
  it("fails closed on event query errors", async () => {
    seedEvents(); db.fail = r => r.table === "event_attendees";
    await expect(getMvpDashboardData({}, { includeEvents: true })).rejects.toThrow("complete event evidence");
  });
  it("only returns aggregate geography for the selected authorized learner roster", async () => {
    for (const row of db.tables.student_tracks) Object.assign(row.students as Row, { zip: row.student_id === "u1" ? "02108" : "10001", state: "MA" });
    const result = await getMvpDashboardData({ programId: "p2" }, { includeLocations: true });
    expect(result.geography?.postalCodes.groups).toEqual([{ label: "02108", count: 1 }]);
    expect(result.demographics).toBeUndefined();
    expect(db.requests.some(r => r.columns.includes("date_of_birth"))).toBe(false);
  });
});

// New sources are only read for configured rules within an authorized roster.
describe("additional check-in query integration", () => {
  it("connects overdue work to the learner-status filter", async () => {
    mocks.activeConfig.mockReturnValue({ programSlug: "one", courseSlug: "alpha", kind: "cohort", attendanceThreshold: 80,
      submissionGraceDays: 14, requiredAssignments: [{ id: "work", label: "Project", weekNumber: 1, dueAt: "2026-09-01T12:00:00Z" }] });
    const data = await getMvpDashboardData({ programId: "p1", learnerStatus: "needs_check_in" });
    expect(data.programs[0].learnersNeedingCheckIn).toBe(2);
    expect(data.programs[0].totalParticipants).toBe(2);
    expect(data.checkInEvaluations?.every(row => row.attentionFlags.some(flag => flag.reason === "missing_required_submission"))).toBe(true);
  });
  it("reads mapped assessment pages scoped to the roster and filters on low scores", async () => {
    mocks.signalPolicy.mockReturnValue({ programSlug: "one", courseSlug: "alpha", assessment: { examId: "exam", minimumPercent: 70 } });
    db.serverCap = 1;
    db.tables.exam_attempts = [
      { id: "e1", student_id: "u1", exam_id: "exam", submitted_at: "2026-09-10T12:00:00Z", score: 4, total: 10 },
      { id: "e2", student_id: "u2", exam_id: "exam", submitted_at: "2026-09-10T12:00:00Z", score: 9, total: 10 },
      { id: "e3", student_id: "outsider", exam_id: "exam", submitted_at: "2026-09-10T12:00:00Z", score: 0, total: 10 },
    ];
    const data = await getMvpDashboardData({ programId: "p1", learnerStatus: "needs_check_in" });
    expect(data.programs[0].totalParticipants).toBe(1);
    expect(data.checkInEvaluations?.[0].attentionFlags[0].reason).toBe("low_assessment");
    const reads = db.requests.filter(r => r.table === "exam_attempts");
    expect(reads).toHaveLength(3);
    expect(reads[0].filters).toContainEqual(["in", "student_id", ["u1", "u2"]]);
  });
  it("loads video evidence only for explicitly self-paced courses", async () => {
    mocks.signalPolicy.mockReturnValue({ programSlug: "one", courseSlug: "alpha", progress: {
      source: "required_videos", dueAt: "2026-09-20T12:00:00Z", requiredWeeks: [1, 2], minimumPercent: 80 } });
    await getMvpDashboardData({ programId: "p1" });
    expect(db.requests.some(r => r.table === "week_progress")).toBe(false);
    db.tables.track_overrides = [{ id: "o", program_id: "p1", track_slug: "alpha", self_paced: true }];
    db.tables.week_progress = [{ id: "v1", user_id: "u1", track_slug: "alpha", week_number: 1, video_watched_at: "2026-09-10T12:00:00Z" }];
    const data = await getMvpDashboardData({ programId: "p1", learnerStatus: "needs_check_in" });
    expect(data.programs[0].learnersNeedingCheckIn).toBe(2);
    expect(db.requests.some(r => r.table === "week_progress")).toBe(true);
  });
  it("does not read unconfigured sources and fails closed on configured read failures", async () => {
    await getMvpDashboardData({ programId: "p1" });
    expect(db.requests.some(r => ["exam_attempts", "week_progress"].includes(r.table))).toBe(false);
    mocks.signalPolicy.mockReturnValue({ programSlug: "one", courseSlug: "alpha", assessment: { examId: "exam", minimumPercent: 70 } });
    db.fail = r => r.table === "exam_attempts";
    await expect(getMvpDashboardData({ programId: "p1" })).rejects.toThrow("complete check-in signal evidence");
  });
});

// Program aggregates must never broaden the authorized or applied scope.
describe("program summary integration", () => {
  it("aggregates selected program records without claiming historical completeness", async () => {
    const data = await getMvpDashboardData({ programId: "p1" });
    expect(data.programSummaries).toHaveLength(1);
    expect(data.programSummaries![0]).toMatchObject({ programId: "p1", uniqueEnrolledLearners: 2,
      uniqueLearnersStarted: 1, scope: "selected_accessible_offerings", population: "current_eligible_roster" });
    expect(data.historicalCoverage?.allTimeUniqueLearnersStarted).toBeNull();
    expect(data.cohortCoverage?.status).toBe("unavailable");
  });
  it("does not include a course excluded by dates", async () => {
    const data = await getMvpDashboardData({ startDate: "2027-01-01", endDate: "2027-01-31" });
    expect(data.programSummaries).toEqual([]);
  });
  it("does not expose another program in an admin's rollup", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    const data = await getMvpDashboardData({});
    expect(data.programSummaries?.map(row => row.programId)).toEqual(["p1"]);
  });
});

// Dashboard integration reads complete, scoped revisions before status filtering.
describe("finalized attendance integration", () => {
  function setupReviews() {
    configs[0].tracks[0] = { ...track("alpha"), totalWeeks: 2,
      weekSummaries: [{ week: 1, date: "2026-09-01" }, { week: 2, date: "2026-09-08" }] };
    db.tables.student_tracks = [enrollment("e1", "u1")];
    db.tables.attendance = [];
    db.tables.session_content.push({ id: "d2", track: "alpha", week_number: 2, status: "completed", status_2: "upcoming", status_3: "upcoming" });
    db.tables.mvp_attendance_reviews = [1, 2].map(week => ({ id: `r${week}`, revision: 1, program_id: "p1", track_slug: "alpha", student_id: "u1",
      week_number: week, session_number: 1, session_held_at: "2026-09-08T12:00:00Z", eligibility: "eligible",
      eligibility_basis: "Reviewed roster", outcome: "absent", recorded_by: "staff", recorded_at: "2026-09-09T12:00:00Z" }));
  }
  it("feeds confirmed absences into dashboard counts and reads all short pages", async () => {
    setupReviews(); db.serverCap = 1;
    const result = await getMvpDashboardData({ programId: "p1" });
    expect(result.programs[0].learnersNeedingCheckIn).toBe(1);
    const reads = db.requests.filter(r => r.table === "mvp_attendance_reviews");
    expect(reads.length).toBe(3);
    expect(reads[0].filters).toEqual(expect.arrayContaining([["eq", "program_id", "p1"], ["eq", "track_slug", "alpha"], ["in", "student_id", ["u1"]]]));
  });
  it("uses corrections and ignores another program's review", async () => {
    setupReviews();
    db.tables.mvp_attendance_reviews.push({ ...db.tables.mvp_attendance_reviews[1], id: "r3", revision: 2, outcome: "present" },
      { ...db.tables.mvp_attendance_reviews[1], id: "r4", program_id: "p2", revision: 3 });
    expect((await getMvpDashboardData({ programId: "p1" })).programs[0].learnersNeedingCheckIn).toBe(0);
  });
  it("keeps conflicts and unresolved corrections unknown", async () => {
    setupReviews(); db.tables.attendance = [attendance("a1", "u1")];
    expect((await getMvpDashboardData({ programId: "p1" })).programs[0].learnersNeedingCheckIn).toBeNull();
    db.tables.attendance = [];
    db.tables.mvp_attendance_reviews.push({ ...db.tables.mvp_attendance_reviews[1], id: "r3", revision: 2, outcome: "unknown" });
    expect((await getMvpDashboardData({ programId: "p1" })).programs[0].learnersNeedingCheckIn).toBeNull();
  });
  it("fails closed on review read errors", async () => {
    setupReviews(); db.fail = r => r.table === "mvp_attendance_reviews";
    await expect(getMvpDashboardData({ programId: "p1" })).rejects.toThrow("complete attendance review evidence");
  });
  it("uses finalized evidence for the needs-check-in learner filter", async () => {
    setupReviews();
    expect((await getMvpDashboardData({ programId: "p1", learnerStatus: "needs_check_in" })).programs[0].totalParticipants).toBe(1);
    db.tables.mvp_attendance_reviews = [];
    expect((await getMvpDashboardData({ programId: "p1", learnerStatus: "needs_check_in" })).programs[0].totalParticipants).toBe(0);
  });
  it("does not flag from conflicting session delivery rows", async () => {
    setupReviews();
    db.tables.session_content.push({ ...db.tables.session_content[0], id: "d3", status: "upcoming" });
    expect((await getMvpDashboardData({ programId: "p1" })).programs[0].learnersNeedingCheckIn).toBeNull();
  });
});

// Exercise policy selection, complete submission reads and attendance together.
describe("configured active rules", () => {
  const policy = { programSlug: "one", courseSlug: "alpha", kind: "cohort", attendanceThreshold: 80,
    submissionGraceDays: 14, requiredAssignments: [{ id: "work", label: "Work", weekNumber: 1, dueAt: "2026-09-01T12:00:00Z" }] };
  it("combines attendance and timely submissions without trusting activity program IDs", async () => {
    mocks.activeConfig.mockImplementation((program: string) => program === "one" ? policy :
      { programSlug: "two", courseSlug: "beta", kind: "single_event" });
    db.tables.attendance.push(attendance("a3", "u2"));
    db.tables.submissions = [
      { id: "s1", student_id: "u1", track_slug: "alpha", program_id: "stale", week_number: 1, submitted_at: "2026-09-15T12:00:00Z" },
      { id: "s2", student_id: "u2", track_slug: "alpha", week_number: 1, submitted_at: "2026-09-16T12:00:00Z" },
      { id: "s3", student_id: "outsider", track_slug: "alpha", week_number: 1, submitted_at: "2026-09-01T12:00:00Z" },
    ];
    const result = await getMvpDashboardData({});
    expect(result.programs.find((row) => row.courseSlug === "alpha")?.active).toBe(1);
    expect(result.programs.find((row) => row.courseSlug === "beta")?.active).toBe(1);
    const requests = db.requests.filter((request) => request.table === "submissions");
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.filters.some(([op, key, value]) => op === "eq" && key === "track_slug" && value === "alpha"))).toBe(true);
    expect(requests.every((request) => !request.filters.some(([, key]) => key === "program_id"))).toBe(true);
    expect(requests[0].columns).toBe("id, student_id, track_slug, week_number, submitted_at");
    const { loadMvpSubmissions } = await import("./submission-queries");
    db.serverCap = 1;
    const records = await loadMvpSubmissions(db as unknown as Parameters<typeof loadMvpSubmissions>[0], "alpha", ["u1", "u2"]);
    expect(records.map((record) => record.id)).toEqual(["s1", "s2"]);
  });
  it("does not turn failed submission reads into inactive learners", async () => {
    mocks.activeConfig.mockReturnValue(policy);
    db.fail = (request) => request.table === "submissions";
    await expect(getMvpDashboardData({ programId: "p1" })).rejects.toThrow("Unable to load complete required submission records");
  });
  it("keeps event attendance missing as unknown and skips submission reads", async () => {
    mocks.activeConfig.mockReturnValue({ programSlug: "one", courseSlug: "alpha", kind: "single_event" });
    const result = await getMvpDashboardData({ programId: "p1" });
    expect(result.programs[0].active).toBeNull();
    expect(db.requests.some((request) => request.table === "submissions")).toBe(false);
  });
});

// Survey connections must preserve program, course and eligible-roster scope.
describe("complete backend reads", () => {
  it.each(["student_tracks", "attendance", "session_content"])("rejects missing %s responses instead of reporting zeros", async (table) => {
    const execute = db.execute.bind(db);
    vi.spyOn(db, "execute").mockImplementation((request) => request.table === table
      ? { data: null, error: null } : execute(request));
    await expect(getMvpDashboardData({ programId: "p1" })).rejects.toThrow();
  });
  it.each(["student_tracks", "attendance", "session_content"])("stops repeated %s pages", async (table) => {
    const execute = db.execute.bind(db);
    vi.spyOn(db, "execute").mockImplementation((request) => execute(request.table === table
      ? { ...request, filters: request.filters.filter(([op]) => op !== "gt") } : request));
    await expect(getMvpDashboardData({ programId: "p1" })).rejects.toThrow("pagination did not advance");
    expect(db.requests.length).toBeLessThan(30);
  });
  it("batches and deduplicates submission rosters while keeping every batch scoped", async () => {
    const { loadMvpSubmissions } = await import("./submission-queries");
    const ids = Array.from({ length: 205 }, (_, index) => `u${index}`);
    db.tables.submissions = ids.map((student_id, index) => ({ id: `s${String(index).padStart(4, "0")}`,
      student_id, track_slug: "alpha", week_number: 1, submitted_at: null }));
    db.serverCap = 17;
    const result = await loadMvpSubmissions(db as unknown as Parameters<typeof loadMvpSubmissions>[0], "alpha", [...ids, ...ids]);
    expect(result).toHaveLength(205);
    expect(new Set(result.map((record) => record.id)).size).toBe(205);
    const firstPages = db.requests.filter((request) => !request.filters.some(([op]) => op === "gt"));
    expect(firstPages.map((request) => (request.filters.find(([op, key]) => op === "in" && key === "student_id")![2] as string[]).length)).toEqual([100, 100, 5]);
    expect(db.requests.every((request) => request.filters.some(([op, key, value]) => op === "eq" && key === "track_slug" && value === "alpha"))).toBe(true);
  });
  it("makes no submission request for an empty authorized roster", async () => {
    const { loadMvpSubmissions } = await import("./submission-queries");
    expect(await loadMvpSubmissions(db as unknown as Parameters<typeof loadMvpSubmissions>[0], "alpha", [])).toEqual([]);
    expect(db.requests).toEqual([]);
  });
  it.each(["missing", "repeated", "later_failure"])("rejects %s submission pages without returning partial results", async (mode) => {
    const { loadMvpSubmissions } = await import("./submission-queries");
    db.tables.submissions = [{ id: "s1", student_id: "u1", track_slug: "alpha", week_number: 1, submitted_at: null }];
    const execute = db.execute.bind(db);
    vi.spyOn(db, "execute").mockImplementation((request) => {
      if (mode === "missing") return { data: null, error: null };
      if (mode === "later_failure" && request.filters.some(([op]) => op === "gt")) return { data: null, error: { message: "Failed later page" } };
      return execute(mode === "repeated" ? { ...request, filters: request.filters.filter(([op]) => op !== "gt") } : request);
    });
    await expect(loadMvpSubmissions(db as unknown as Parameters<typeof loadMvpSubmissions>[0], "alpha", ["u1"])).rejects.toThrow();
    expect(db.requests.length).toBeLessThan(4);
  });
});

// Reports reuse the real authorized loader, rather than trusting client totals.
describe("report selection and new summaries", () => {
  it("preserves checklist order, known zero, and explicit unavailable metrics", async () => {
    const { getMvpReportData } = await import("./report-queries");
    const report = await getMvpReportData({ programId: "p1" }, { metricKeys: ["sessionsRemaining", "active", "totalParticipants", "active"] });
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].metrics.map((metric) => metric.key)).toEqual(["sessionsRemaining", "active", "totalParticipants"]);
    expect(report.rows[0].metrics[0]).toMatchObject({ value: 0, availability: "available" });
    expect(report.rows[0].metrics[1]).toMatchObject({ value: null, availability: "unavailable" });
    expect(report.rows[0].metrics[1].unavailableReason).toBeTruthy();
    expect(report.rows[0].metrics[2].value).toBe(2);
    expect(report).not.toHaveProperty("demographics");
    expect(report).not.toHaveProperty("locations");
    expect(JSON.stringify(report)).not.toContain("student_id");
  });
  it.each([{}, { metricKeys: [] }, { metricKeys: ["student_id"] }, { metricKeys: ["active"], locations: "yes" },
    { metricKeys: ["active"], programId: "p2" }])("rejects invalid report selections before database reads: %j", async (selection) => {
    const { getMvpReportData } = await import("./report-queries");
    await expect(getMvpReportData({}, selection)).rejects.toThrow();
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("uses status-filtered unique learners for location-only reports without sensitive demographic reads", async () => {
    const { getMvpReportData } = await import("./report-queries");
    for (const row of db.tables.student_tracks) (row.students as Row).location = row.student_id === "u1" ? "Boston" : "Oakland";
    const report = await getMvpReportData({ learnerStatus: "started" }, { metricKeys: [], locations: true });
    expect(report.locations).toMatchObject({ uniqueLearners: 1, citiesRepresented: null, groups: [{ label: "Boston", count: 1 }] });
    expect(report).not.toHaveProperty("demographics");
    expect(db.requests.some((request) => request.columns.includes("date_of_birth"))).toBe(false);
    expect(db.requests.some((request) => request.filters.some(([, key, value]) => key === "survey_type" && value === "bcc-learner-intake"))).toBe(false);
  });
  it.each(["student", "instructor"])("rejects report access for %s", async (role) => {
    const { getMvpReportData } = await import("./report-queries");
    mocks.session.mockResolvedValue({ userId: "actor", student: { role } });
    await expect(getMvpReportData({}, { metricKeys: ["active"] })).rejects.toThrow("MVP access");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("rejects preview mode and inaccessible programs", async () => {
    const { getMvpReportData } = await import("./report-queries");
    mocks.preview.mockResolvedValue(true);
    await expect(getMvpReportData({}, { metricKeys: ["active"] })).rejects.toThrow("MVP access");
    mocks.preview.mockResolvedValue(false);
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    await expect(getMvpReportData({ programId: "p2" }, { metricKeys: ["active"] })).rejects.toThrow("selected program is unavailable");
  });
  it("does not invent sessions remaining for incomplete schedules", async () => {
    configs[0].tracks[0].weekSummaries = [];
    const result = await getMvpDashboardData({ programId: "p1" });
    expect(result.programs[0].sessionsRemaining).toBeNull();
    expect(result.programs[0].sessionsRemainingReason).toBeTruthy();
  });
});

describe("learner status query integration", () => {
  it.each(["started", "completed"])("recomputes %s totals, evidence, and demographics", async (learnerStatus) => {
    for (const row of db.tables.student_tracks) (row.students as Row).date_of_birth = "2000-01-01";
    const result = await getMvpDashboardData({ programId: "p1", learnerStatus }, { includeDemographics: true });
    expect(result.appliedFilters.learnerStatus).toBe(learnerStatus);
    expect(result.programs[0]).toMatchObject({ totalParticipants: 1, started: 1, completed: 1, attendanceRate: 100 });
    expect(result.summary.uniqueLearnersStarted).toBe(1);
    expect(result.demographics?.[0].respondentCount).toBe(1);
    expect(result.checkInEvaluations?.map((item) => item.learnerId)).toEqual(["u1"]);
    expect(db.requests.filter((request) => request.table === "survey_responses").every((request) =>
      request.filters.some(([op, key, value]) => op === "in" && key === "student_id" && JSON.stringify(value) === '["u1"]'))).toBe(true);
  });
  it("includes verified active learners while disclosing unknown exclusions", async () => {
    mocks.activeConfig.mockReturnValue({ programSlug: "one", courseSlug: "alpha", kind: "single_event" });
    const result = await getMvpDashboardData({ programId: "p1", learnerStatus: "active" });
    expect(result.programs[0]).toMatchObject({ totalParticipants: 1, active: 1 });
    expect(result.metricDefinitions.find((metric) => metric.key === "learnerStatus")?.unavailableReason).toContain("1 learner/offering");
  });
  it("discloses missing policies rather than silently presenting zero active learners", async () => {
    const result = await getMvpDashboardData({ programId: "p1", learnerStatus: "active" });
    expect(result.programs[0]).toMatchObject({ totalParticipants: 0, active: null });
    expect(result.metricDefinitions.find((metric) => metric.key === "learnerStatus")?.unavailableReason).toContain("2 learner/offering");
  });
  it("retains stale-stamped activity but excludes other courses and outside learners", async () => {
    db.tables.attendance[0].program_id = "stale";
    db.tables.session_content[0].program_id = "stale";
    db.tables.attendance.push(attendance("outside", "u2", "beta"), attendance("foreign", "outsider"));
    const result = await getMvpDashboardData({ programId: "p1", learnerStatus: "started" });
    expect(result.programs[0]).toMatchObject({ totalParticipants: 1, started: 1, attendanceRate: 100 });
    expect(db.requests.filter((request) => request.table === "student_tracks").every((request) =>
      request.filters.some(([op, key, value]) => op === "eq" && key === "program_id" && value === "p1"))).toBe(true);
  });
  it("selects future enrollments and retains date-overlap semantics", async () => {
    configs[0].tracks[0] = { ...track("alpha"), startDate: "2026-11-01", weekSummaries: [{ week: 1, date: "2026-11-01" }] };
    const result = await getMvpDashboardData({ programId: "p1", learnerStatus: "enrolled", startDate: "2026-11-01", endDate: "2026-11-30" });
    expect(result.programs[0]).toMatchObject({ totalParticipants: 2, enrolledBeforeStart: 2 });
    expect(result.summary.upcomingEnrollments).toBe(2);
  });
});

describe("MVP survey outcome connection", () => {
  const survey = { id: "impact", title: "Impact", description: "", required: false, appliesToTracks: ["alpha"] };
  const response = (id: string, student = "u1", program = "p1"): Row => ({
    id, student_id: student, program_id: program, survey_type: "impact",
    completed_at: "2026-10-01T12:00:00Z", responses: { confidence: { Skills: { before: 2, now: 4 } } },
  });
  it("counts unique completed respondents per survey and across mapped surveys", async () => {
    configs[0].surveys = [survey, { ...survey, id: "feedback", title: "Feedback" }];
    db.serverCap = 1;
    db.tables.survey_responses = [response("s1"), response("s2"),
      { ...response("s3", "u2"), survey_type: "feedback" },
      { ...response("s4", "u2"), completed_at: null },
      { ...response("s5", "u2"), completed_at: "2027-01-01T00:00:00Z" }, response("s6", "outside")];
    const result = await getMvpDashboardData({ programId: "p1", courseSlug: "alpha" });
    expect(result.programs[0].surveyResponseRate).toBe(100);
    expect(result.programs[0].surveyParticipation?.map(row => [row.respondents, row.eligibleLearners, row.responseRate])).toEqual([[1, 2, 50], [1, 2, 50]]);
    const feedbackReads = db.requests.filter(r => r.table === "survey_responses" && r.filters.some(([, key, value]) => key === "survey_type" && value === "feedback"));
    expect(feedbackReads.every(r => !r.columns.includes("responses"))).toBe(true);
  });
  it("distinguishes no responses, no mapping, and an empty selected roster", async () => {
    configs[0].surveys = [survey];
    expect((await getMvpDashboardData({ programId: "p1", courseSlug: "alpha" })).programs[0].surveyResponseRate).toBe(0);
    expect((await getMvpDashboardData({ programId: "p1", courseSlug: "alpha", city: "missing-location" })).programs[0].surveyResponseRate).toBeNull();
    configs[0].surveys = [];
    expect((await getMvpDashboardData({ programId: "p1", courseSlug: "alpha" })).programs[0].surveyResponseRate).toBeNull();
  });
  it("recomputes assessment and progress denominators after learner filtering and exports coverage", async () => {
    const { buildMvpReport } = await import("./report-selection");
    mocks.signalPolicy.mockReturnValue({ programSlug: "one", courseSlug: "alpha", assessment: { examId: "exam", minimumPercent: 70 },
      progress: { source: "required_videos", dueAt: "2026-09-01T12:00:00Z", requiredWeeks: [1, 2], minimumPercent: 80 } });
    db.tables.track_overrides = [{ id: "o", program_id: "p1", track_slug: "alpha", self_paced: true }];
    db.tables.exam_attempts = [
      { id: "e1", student_id: "u1", exam_id: "exam", submitted_at: "2026-09-10T00:00:00Z", score: 4, total: 10 },
      { id: "e2", student_id: "u2", exam_id: "exam", submitted_at: "2026-09-10T00:00:00Z", score: 9, total: 10 }];
    db.tables.week_progress = [1, 2].map(week => ({ id: `v${week}`, user_id: "u2", track_slug: "alpha", week_number: week, video_watched_at: "2026-09-10T00:00:00Z" }));
    const data = await getMvpDashboardData({ programId: "p1", courseSlug: "alpha", learnerStatus: "needs_check_in" });
    expect(data.programs[0]).toMatchObject({ totalParticipants: 1, assessmentAveragePercent: 40, progressRate: 0 });
    expect(data.programs[0].assessmentSummary).toMatchObject({ assessedLearners: 1, eligibleLearners: 1 });
    const report = buildMvpReport(data, { metricKeys: ["assessmentAveragePercent", "progressRate", "surveyResponseRate"], demographics: false, locations: false });
    expect(report.rows[0].metrics[0].unit).toContain("1/1 learners assessed");
    expect(report.rows[0].metrics[1].unit).toContain("0/2 learner-video opportunities");
    expect(report.rows[0].metrics[2].availability).toBe("unavailable");
  });
  it("returns aggregate paired outcomes without leaking answers or identities", async () => {
    configs[0].surveys = [survey];
    db.tables.survey_responses = [response("s1"), response("s2", "outsider"), response("s3", "u2", "p2")];
    const result = await getMvpDashboardData({ programId: "p1", courseSlug: "alpha" });
    expect(result.surveyOutcomes?.[0].measures[0]).toMatchObject({ change: 2, pairedRespondentCount: 1 });
    expect(JSON.stringify(result.surveyOutcomes)).not.toContain("student_id");
  });
  it("does not infer course attribution from general surveys", async () => {
    configs[0].surveys = [{ ...survey, appliesToTracks: undefined }];
    const result = await getMvpDashboardData({ programId: "p1", courseSlug: "alpha" });
    expect(result.surveyOutcomes?.[0].unavailableReason).toContain("No explicitly course-mapped");
    expect(db.requests.filter((request) => request.table === "survey_responses" && request.filters.some(([op, key]) => op === "eq" && key === "survey_type"))).toHaveLength(0);
  });
  it("separates program outcomes and keeps response program boundaries", async () => {
    configs[0].surveys = [{ ...survey, appliesToTracks: undefined }];
    configs[0].tracks.push(track("shared"));
    db.tables.student_tracks.push(enrollment("e4", "u1", "shared"));
    db.tables.survey_responses = [response("s1"), response("s2", "u2", "p2")];
    const result = await getMvpDashboardData({ programId: "p1" });
    const groups = result.surveyOutcomes?.filter((group) => group.scope === "program");
    expect(groups).toHaveLength(1);
    expect(groups?.[0].measures[0].pairedRespondentCount).toBe(1);
    expect(groups?.[0].programId).toBe("p1");
  });
  it("denies program outcomes to course-scoped admins", async () => {
    configs[1].surveys = [{ ...survey, appliesToTracks: undefined }];
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    db.tables.staff_program_access = [{ student_id: "actor", program_id: "p2", role: "admin", track_slug: "beta" }];
    const result = await getMvpDashboardData({ programId: "p2" });
    expect(result.surveyOutcomes?.some((group) => group.scope === "program")).toBe(false);
    expect(db.requests.some((request) => request.table === "survey_responses" && request.filters.some(([op, key]) => op === "eq" && key === "survey_type"))).toBe(false);
  });
  it("allows home-program admins to view program outcomes", async () => {
    configs[0].surveys = [{ ...survey, appliesToTracks: undefined }];
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    const result = await getMvpDashboardData({});
    expect(result.surveyOutcomes?.filter((group) => group.scope === "program")).toHaveLength(1);
  });
  it("applies location to survey respondents as well as participation totals", async () => {
    configs[0].surveys = [{ ...survey, appliesToTracks: undefined }];
    (db.tables.student_tracks[0].students as Row).location = "Boston";
    (db.tables.student_tracks[1].students as Row).location = "Oakland";
    db.tables.survey_responses = [response("s1"), response("s2", "u2")];
    const result = await getMvpDashboardData({ programId: "p1", city: "Boston" });
    expect(result.programs[0].totalParticipants).toBe(1);
    expect(result.surveyOutcomes?.find((group) => group.scope === "program")?.measures[0].pairedRespondentCount).toBe(1);
  });
  it("paginates through reduced database caps and deduplicates respondents", async () => {
    configs[0].surveys = [survey];
    db.serverCap = 2;
    db.tables.survey_responses = [response("s1"), response("s2"), response("s3", "u2")];
    const result = await getMvpDashboardData({ programId: "p1" });
    expect(result.surveyOutcomes?.[0].measures[0].pairedRespondentCount).toBe(2);
  });
  it("does not turn database failure into zero responses", async () => {
    configs[0].surveys = [survey];
    db.fail = (request) => request.table === "survey_responses";
    await expect(getMvpDashboardData({})).rejects.toThrow("Unable to load complete MVP survey outcomes");
  });
  it("returns unknown growth for an empty mapped survey", async () => {
    configs[0].surveys = [survey];
    const result = await getMvpDashboardData({ programId: "p1" });
    expect(result.surveyOutcomes?.[0].measures[0].change).toBeNull();
    expect(result.surveyOutcomes?.[0].unavailableReason).toContain("No valid paired responses");
  });
});

describe("MVP query access", () => {
  it.each(["student", "instructor", "unknown"])("denies %s before creating a database client", async (role) => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role } });
    await expect(getMvpDashboardData({})).rejects.toThrow("MVP access is required");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("denies signed-out sessions", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(getMvpDashboardData({})).rejects.toThrow("MVP access is required");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("denies student-preview sessions", async () => {
    mocks.preview.mockResolvedValue(true);
    await expect(getMvpDashboardData({})).rejects.toThrow("MVP access is required");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("limits a home-program admin's rows and options", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    const result = await getMvpDashboardData({});
    expect(result.programs.map((row) => row.courseSlug)).toEqual(["alpha"]);
    expect(result.filterOptions.programs).toEqual([{ id: "p1", name: "One" }]);
    expect(db.requests.filter((r) => r.table === "student_tracks").every((r) => r.filters.some(([, k, v]) => k === "track_slug" && v === "alpha"))).toBe(true);
  });
  it("rejects an unauthorized program before reading its roster", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    await expect(getMvpDashboardData({ programId: "p2" })).rejects.toThrow("selected program is unavailable");
    expect(db.requests.some((r) => r.table === "student_tracks")).toBe(false);
  });
  it("does not elevate an instructor-only grant", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    db.tables.staff_program_access = [{ student_id: "actor", program_id: "p2", role: "instructor", track_slug: null }];
    expect((await getMvpDashboardData({})).programs.map((r) => r.programId)).toEqual(["p1"]);
  });
  it("restricts a course-scoped admin grant", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    configs[1].tracks.push(track("restricted"));
    db.tables.staff_program_access = [{ student_id: "actor", program_id: "p2", role: "admin", track_slug: "beta" }];
    const result = await getMvpDashboardData({ programId: "p2" });
    expect(result.programs.map((r) => r.courseSlug)).toEqual(["beta"]);
    expect(result.filterOptions.courses.some((r) => r.slug === "restricted")).toBe(false);
  });
  it("does not promote a different instructor-only course through a mixed grant", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    configs[1].tracks.push(track("restricted"));
    db.tables.staff_program_access = [
      { student_id: "actor", program_id: "p2", role: "admin", track_slug: "beta" },
      { student_id: "actor", program_id: "p2", role: "instructor", track_slug: "restricted" },
    ];
    const result = await getMvpDashboardData({ programId: "p2" });
    expect(result.programs.map((r) => r.courseSlug)).toEqual(["beta"]);
  });
  it("does not let a whole-program instructor grant widen a course admin grant", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    configs[1].tracks.push(track("restricted"));
    db.tables.staff_program_access = [
      { student_id: "actor", program_id: "p2", role: "admin", track_slug: "beta" },
      { student_id: "actor", program_id: "p2", role: "instructor", track_slug: null },
    ];
    const result = await getMvpDashboardData({ programId: "p2" });
    expect(result.programs.map((r) => r.courseSlug)).toEqual(["beta"]);
    expect(result.filterOptions.courses.some((r) => r.slug === "restricted")).toBe(false);
    expect(db.requests.some((r) => r.table === "student_tracks" && r.filters.some(([, key, value]) => key === "track_slug" && value === "restricted"))).toBe(false);
    await expect(getMvpDashboardData({ programId: "p2", courseSlug: "restricted" })).rejects.toThrow("selected course is unavailable");
  });
  it("preserves a whole-program admin grant despite narrower instructor grants", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    configs[1].tracks.push(track("another"));
    db.tables.staff_program_access = [
      { student_id: "actor", program_id: "p2", role: "admin", track_slug: null },
      { student_id: "actor", program_id: "p2", role: "instructor", track_slug: "beta" },
    ];
    expect((await getMvpDashboardData({ programId: "p2" })).programs.map((r) => r.courseSlug)).toEqual(["beta", "another"]);
  });
  it("returns an empty authorized scope when an admin has no home or grants", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    db.tables.students = [{ id: "actor", program_id: null }];
    const result = await getMvpDashboardData({});
    expect(result.programs).toEqual([]);
    expect(result.summary.uniqueLearnersStarted).toBe(0);
  });
});

describe("MVP query totals and filters", () => {
  // Exercise shared slugs within one request so a course-only cache key
  // cannot pass by being recreated between separate filtered requests.
  it("keeps same-slug roster caches separate in the organization view", async () => {
    configs[0].tracks.push(track("twin"));
    configs[1].tracks.push(track("twin"));
    db.tables.student_tracks.push(
      enrollment("e5", "u5", "twin", "p1"),
      enrollment("e6", "u6", "twin", "p2"),
      enrollment("e7", "u7", "twin", "p2"),
    );
    const result = await getMvpDashboardData({});
    expect(result.programs.filter((row) => row.courseSlug === "twin")
      .map((row) => [row.programId, row.totalParticipants])).toEqual([["p1", 1], ["p2", 2]]);
  });

  it("scopes every roster page and excludes other-program profile locations", async () => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    db.serverCap = 1;
    const outsider = enrollment("e0", "outsider", "alpha", "p2");
    (outsider.students as Row).location = "Other program only";
    db.tables.student_tracks.unshift(outsider);
    const result = await getMvpDashboardData({ programId: "p1" });
    expect(result.programs[0].totalParticipants).toBe(2);
    expect(result.filterOptions.cities).not.toContain("Other program only");
    const pages = db.requests.filter((request) => request.table === "student_tracks");
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((request) => request.filters.some(([op, key, value]) =>
      op === "eq" && key === "program_id" && value === "p1"))).toBe(true);
    expect(pages.every((request) => request.filters.some(([op, key, value]) =>
      op === "eq" && key === "track_slug" && value === "alpha"))).toBe(true);
  });

  it("selects an overlapping offering but retains its full-period results", async () => {
    configs[0].tracks[0] = { ...track("alpha"), startDate: "2026-08-01", totalWeeks: 2,
      weekSummaries: [{ week: 1, date: "2026-08-01" }, { week: 2, date: "2026-10-01" }] };
    db.tables.attendance.push({ ...attendance("a3", "u1"), week_number: 2, checked_in_at: "2026-10-01T18:00:00Z" });
    db.tables.session_content.push({ id: "d3", track: "alpha", program_id: "p1", week_number: 2,
      status: "completed", status_2: "upcoming", status_3: "upcoming" });
    const result = await getMvpDashboardData({ programId: "p1", startDate: "2026-09-01", endDate: "2026-09-30" });
    expect(result.programs[0]).toMatchObject({ startDate: "2026-08-01", endDate: "2026-10-01", started: 1, completed: 1, attendanceQualified: 1, active: null });
    expect(result.appliedFilters).toMatchObject({ startDate: "2026-09-01", endDate: "2026-09-30" });
  });
  it("does not read learner records for non-overlapping offerings", async () => {
    const result = await getMvpDashboardData({ startDate: "2026-10-01" }, { includeDemographics: true });
    expect(result.programs).toEqual([]);
    expect(result.filterOptions.cities).toEqual([]);
    expect(db.requests.some((r) => ["student_tracks", "attendance", "survey_responses"].includes(r.table))).toBe(false);
    expect(result.summary.uniqueLearnersStarted).toBe(0);
  });
  it("discloses undated exclusions without reading their roster", async () => {
    configs[0].tracks[0].weekSummaries = [];
    const result = await getMvpDashboardData({ programId: "p1", startDate: "2026-09-01" });
    expect(result.programs).toEqual([]);
    expect(result.metricDefinitions.find((m) => m.key === "dateWindow")?.unavailableReason).toContain("1 offering(s)");
    expect(db.requests.some((r) => r.table === "student_tracks")).toBe(false);
  });
  it("rejects invalid dates before database access", async () => {
    await expect(getMvpDashboardData({ startDate: "2026-02-30" })).rejects.toThrow("valid reporting dates");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("uses resolved course slugs for activity while keeping program rosters isolated", async () => {
    configs[0].tracks.push(track("twin"));
    configs[1].tracks.push(track("twin"));
    db.tables.student_tracks.push(enrollment("e5", "u1", "twin", "p1"), enrollment("e6", "u8", "twin", "p2"));
    db.tables.attendance.push(attendance("a5", "u1", "twin", "p1"), attendance("a6", "u1", "twin", "p2"), attendance("a7", "u8", "twin", "p2"));
    db.tables.session_content.push(
      { id: "d5", track: "twin", program_id: "p1", week_number: 1, status: "completed", status_2: "upcoming", status_3: "upcoming" },
      { id: "d6", track: "twin", program_id: "p2", week_number: 1, status: "upcoming", status_2: "upcoming", status_3: "upcoming" },
    );
    const p1 = await getMvpDashboardData({ programId: "p1", courseSlug: "twin" });
    expect(p1.programs[0]).toMatchObject({ programId: "p1", courseSlug: "twin", totalParticipants: 1, attendanceRate: 100 });
    const scoped = (table: string) => db.requests.filter((r) => r.table === table);
    for (const table of ["attendance", "session_content"]) {
      expect(scoped(table).length).toBeGreaterThan(0);
      expect(scoped(table).every((r) => !r.filters.some(([, key]) => key === "program_id"))).toBe(true);
      expect(scoped(table).every((r) => r.filters.some(([op, key, value]) => op === "eq" && key === "track" && value === "twin"))).toBe(true);
    }
    // Shared slugs identify the same course activity, not a separate cohort.
    // Only p2's eligible roster participates in its calculations.
    const p2 = await getMvpDashboardData({ programId: "p2", courseSlug: "twin" });
    expect(p2.programs[0]).toMatchObject({ programId: "p2", courseSlug: "twin", totalParticipants: 1, attendanceRate: 100 });
  });
  it("keeps a course slug offered by two programs from mixing their rosters", async () => {
    configs[0].tracks.push(track("twin"));
    configs[1].tracks.push(track("twin"));
    db.tables.student_tracks.push(enrollment("e5", "u1", "twin", "p1"), enrollment("e6", "u8", "twin", "p2"), enrollment("e7", "u9", "twin", "p2"));
    const result = await getMvpDashboardData({ programId: "p1", courseSlug: "twin" });
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0]).toMatchObject({ programId: "p1", courseSlug: "twin", totalParticipants: 1 });
    const other = await getMvpDashboardData({ programId: "p2", courseSlug: "twin" });
    expect(other.programs[0]).toMatchObject({ programId: "p2", courseSlug: "twin", totalParticipants: 2 });
    expect(db.requests.filter((r) => r.table === "student_tracks").every((r) => r.filters.some(([op, key]) => op === "eq" && key === "program_id"))).toBe(true);
  });
  it("combines real calculations and deduplicates organization summaries", async () => {
    const result = await getMvpDashboardData({});
    expect(result.programs[0]).toMatchObject({ totalParticipants: 2, started: 1, completed: 1, attendanceRate: 50, completionRate: 50 });
    expect(result.summary).toEqual({ uniqueLearnersStarted: 1, uniqueLearnersCompleted: 1,
      programParticipationsStarted: 2, programParticipationsCompleted: 2, upcomingEnrollments: 0 });
  });
  it("applies program/course selection to rows, summaries and evidence", async () => {
    const result = await getMvpDashboardData({ programId: "p2", courseSlug: "beta" });
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0]).toMatchObject({ programId: "p2", courseSlug: "beta", totalParticipants: 1, completed: 1 });
    expect(result.summary.programParticipationsCompleted).toBe(1);
    expect(result.appliedFilters).toMatchObject({ programId: "p2", courseSlug: "beta" });
    expect(result.checkInEvaluations?.every((e) => e.programRowId === "p2:beta")).toBe(true);
  });
  it.each([{ courseSlug: "alpha" }, { programId: "p1", courseSlug: "beta" }])("rejects inconsistent course filters %j", async (params) => {
    await expect(getMvpDashboardData(params)).rejects.toThrow("selected course is unavailable");
  });
  it.each([{ learnerStatus: "invalid" }, { learnerStatus: "inactive" }])("rejects invalid filters %j", async (params) => {
    await expect(getMvpDashboardData(params)).rejects.toThrow("Invalid learner status");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("filters locations before course totals, summary deduplication and evidence", async () => {
    for (const row of db.tables.student_tracks) {
      (row.students as Row).location = row.student_id === "u1" ? " Boston, MA " : "Oakland, CA";
    }
    const result = await getMvpDashboardData({ city: "Boston, MA" });
    expect(result.programs.map((row) => row.totalParticipants)).toEqual([1, 1]);
    expect(result.summary).toMatchObject({ uniqueLearnersStarted: 1, programParticipationsStarted: 2,
      uniqueLearnersCompleted: 1, programParticipationsCompleted: 2 });
    expect(result.filterOptions.cities).toEqual(["Boston, MA", "Oakland, CA"]);
    expect(result.appliedFilters.city).toBe("Boston, MA");
  });
  it("scopes age aggregates to the filtered roster without returning birth dates", async () => {
    for (const row of db.tables.student_tracks) {
      (row.students as Row).date_of_birth = "2000-01-01";
      (row.students as Row).location = row.student_id === "u1" ? "Boston" : "Oakland";
    }
    const result = await getMvpDashboardData({ city: "Boston" }, { includeDemographics: true });
    expect(result.demographics?.[0]).toMatchObject({ respondentCount: 1, missingCount: 0 });
    expect(result.demographics?.[0].groups.find((group) => group.label === "25–34")?.count).toBe(1);
    expect(JSON.stringify(result.demographics)).not.toContain("2000-01-01");
  });
  it("paginates income and limits it to the selected program and location", async () => {
    (db.tables.student_tracks[0].students as Row).location = "Boston";
    (db.tables.student_tracks[1].students as Row).location = "Oakland";
    db.serverCap = 1;
    db.tables.survey_responses = ["s1", "s2", "s3"].map((id) => ({ id, student_id: "u1", program_id: "p1",
      survey_type: "bcc-learner-intake", completed_at: "2026-10-01T00:00:00Z", responses: { household_income: "Under $20,000" } }));
    db.tables.survey_responses.push({ id: "s4", student_id: "u1", program_id: "p2", survey_type: "bcc-learner-intake",
      completed_at: "2026-10-02T00:00:00Z", responses: { household_income: "$80,000 or more" } });
    const result = await getMvpDashboardData({ programId: "p1", city: "Boston" }, { includeDemographics: true });
    const income = result.demographics?.find((item) => item.id === "household-income");
    expect(income).toMatchObject({ respondentCount: 1, missingCount: 0 });
    expect(income?.groups[0].count).toBe(1);
    expect(income?.groups[4].count).toBe(0);
    expect(JSON.stringify(income)).not.toContain("student_id");
  });
  it("reads no birth dates or income answers unless demographics are requested", async () => {
    const result = await getMvpDashboardData({});
    expect(result.demographics).toBeUndefined();
    expect(db.requests.some((request) => request.columns.includes("date_of_birth"))).toBe(false);
    expect(db.requests.some((request) => request.table === "survey_responses")).toBe(false);
  });
  it("leaves hidden courses out of rows, filters and records", async () => {
    db.tables.hidden_courses = [{ track_slug: "beta" }];
    const result = await getMvpDashboardData({});
    expect(result.programs.map((row) => row.courseSlug)).toEqual(["alpha"]);
    expect(result.filterOptions.courses.map((course) => course.slug)).toEqual(["alpha"]);
    expect(db.requests.some((request) => request.filters.some(([, , value]) => value === "beta"))).toBe(false);
    await expect(getMvpDashboardData({ programId: "p2", courseSlug: "beta" })).rejects.toThrow("selected course is unavailable");
  });
  it("fails visibly when hidden courses cannot be loaded", async () => {
    db.fail = (request) => request.table === "hidden_courses";
    await expect(getMvpDashboardData({})).rejects.toThrow("Unable to load hidden courses");
  });
  it("fails visibly when income data cannot be loaded", async () => {
    db.fail = (request) => request.table === "survey_responses";
    await expect(getMvpDashboardData({}, { includeDemographics: true })).rejects.toThrow("Unable to load complete household-income data");
  });
  it("keeps missing locations in all-location totals but not selected-location totals", async () => {
    (db.tables.student_tracks[0].students as Row).location = "Boston";
    expect((await getMvpDashboardData({ programId: "p1" })).programs[0].totalParticipants).toBe(2);
    const filtered = await getMvpDashboardData({ programId: "p1", city: "Boston" });
    expect(filtered.programs[0].totalParticipants).toBe(1);
  });
  it("does not leak inaccessible location options", async () => {
    (db.tables.student_tracks[0].students as Row).location = "Boston";
    (db.tables.student_tracks[2].students as Row).location = "Restricted location";
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    expect((await getMvpDashboardData({})).filterOptions.cities).toEqual(["Boston"]);
  });
  it("returns empty rosters rather than unfiltered results for unknown locations", async () => {
    const result = await getMvpDashboardData({ city: "Not recorded" });
    expect(result.programs.every((row) => row.totalParticipants === 0)).toBe(true);
    expect(result.summary.uniqueLearnersStarted).toBe(0);
  });
  it("rejects duplicate URL filter values", async () => {
    await expect(getMvpDashboardData({ programId: ["p1", "p2"] })).rejects.toThrow("Choose one value");
  });
  it("keeps unavailable completion evidence unknown", async () => {
    db.tables.session_content = [];
    const result = await getMvpDashboardData({});
    expect(result.programs.every((r) => r.completed === null && r.attendanceRate === null)).toBe(true);
    expect(result.summary.uniqueLearnersCompleted).toBeNull();
  });
  it("returns known zero counts for an empty roster without attendance requests", async () => {
    db.tables.student_tracks = [];
    const result = await getMvpDashboardData({ programId: "p1" });
    expect(result.programs[0]).toMatchObject({ totalParticipants: 0, started: 0, completed: 0, completionRate: null });
    expect(db.requests.some((r) => r.table === "attendance")).toBe(false);
  });
  it("excludes staff, test accounts and nonstudent roles", async () => {
    db.tables.student_tracks.push(...["is_staff", "is_test", "role"].map((flag, i) => ({ ...enrollment(`x${i}`, `excluded${i}`),
      students: { role: "student", is_staff: false, is_test: false, [flag]: flag === "role" ? "instructor" : true } })));
    expect((await getMvpDashboardData({ programId: "p1" })).programs[0].totalParticipants).toBe(2);
  });
});

describe("MVP query pagination and failures", () => {
  it("continues roster, attendance and delivery reads past short server pages", async () => {
    db.serverCap = 2;
    db.tables.student_tracks = Array.from({ length: 7 }, (_, i) => enrollment(`e${i}`, `u${i}`));
    db.tables.attendance = Array.from({ length: 7 }, (_, i) => attendance(`a${i}`, `u${i}`));
    db.tables.session_content = Array.from({ length: 5 }, (_, i) => ({ id: `d${i}`, track: "alpha", program_id: "p1", week_number: i + 1,
      status: "completed", status_2: "upcoming", status_3: "upcoming" }));
    const result = await getMvpDashboardData({ programId: "p1" });
    expect(result.programs[0]).toMatchObject({ totalParticipants: 7, started: 7, completed: 7 });
    for (const table of ["student_tracks", "attendance", "session_content"]) {
      expect(db.requests.filter((r) => r.table === table && r.filters.some(([op]) => op === "gt")).length).toBeGreaterThan(0);
    }
  });
  it("batches attendance IDs in groups of at most 100", async () => {
    db.tables.student_tracks = Array.from({ length: 205 }, (_, i) => enrollment(`e${i}`, `u${i}`));
    await getMvpDashboardData({ programId: "p1" });
    const batches = db.requests.filter((r) => r.table === "attendance" && !r.filters.some(([op]) => op === "gt"))
      .map((r) => r.filters.find(([op, key]) => op === "in" && key === "student_id")![2] as string[]);
    expect(batches.map((b) => b.length)).toEqual([100, 100, 5]);
    expect(new Set(batches.flat()).size).toBe(205);
  });
  it.each(["programs", "track_overrides", "student_tracks", "attendance", "session_content"])("throws on %s failures instead of showing zero", async (table) => {
    db.fail = (request) => request.table === table;
    await expect(getMvpDashboardData({ programId: "p1" })).rejects.toThrow("Unable to");
  });
  it.each(["students", "staff_program_access"])("fails closed on %s access failures", async (table) => {
    mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
    db.fail = (request) => request.table === table;
    await expect(getMvpDashboardData({})).rejects.toThrow("Unable to verify program access");
    expect(db.requests.some((r) => r.table === "student_tracks")).toBe(false);
  });
  it("throws when a later roster page fails", async () => {
    db.serverCap = 1;
    db.fail = (r) => r.table === "student_tracks" && r.filters.some(([op]) => op === "gt");
    await expect(getMvpDashboardData({ programId: "p1" })).rejects.toThrow("complete learner roster");
  });
});
