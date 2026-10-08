import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMvpDashboardData } from "./queries";

// Replace infrastructure only: the real query function, role/grant helpers,
// schedules, milestones and summary calculations run together in these tests.
const mocks = vi.hoisted(() => ({ session: vi.fn(), preview: vi.fn(), client: vi.fn(), configs: vi.fn(), owner: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/surveys/schemas", () => ({ getSurveySchema: () => [{
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
  execute(request: Request) {
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
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-02T18:00:00Z"));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network calls are forbidden in query tests."); }));
  db = new Database();
  db.tables = {
    survey_responses: [], hidden_courses: [],
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

// Survey connections must preserve program, course and eligible-roster scope.
describe("MVP survey outcome connection", () => {
  const survey = { id: "impact", title: "Impact", description: "", required: false, appliesToTracks: ["alpha"] };
  const response = (id: string, student = "u1", program = "p1"): Row => ({
    id, student_id: student, program_id: program, survey_type: "impact",
    completed_at: "2026-10-01T12:00:00Z", responses: { confidence: { Skills: { before: 2, now: 4 } } },
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
  it("scopes attendance and delivered-session reads to the course's program", async () => {
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
      expect(scoped(table).every((r) => r.filters.some(([op, key]) => op === "eq" && key === "program_id"))).toBe(true);
    }
    // p2's delivery is still "upcoming", so it has no verified denominator;
    // p1's completed session must not leak into it.
    const p2 = await getMvpDashboardData({ programId: "p2", courseSlug: "twin" });
    expect(p2.programs[0]).toMatchObject({ programId: "p2", courseSlug: "twin", totalParticipants: 1, attendanceRate: null });
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
  it.each([{ startDate: "2026-01-01" }, { endDate: "2026-10-01" }, { learnerStatus: "active" }])("rejects unconnected filters %j", async (params) => {
    await expect(getMvpDashboardData(params)).rejects.toThrow("Only program and course filters");
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
