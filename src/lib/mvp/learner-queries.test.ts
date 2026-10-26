import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), preview: vi.fn(), client: vi.fn(), configs: vi.fn() }));
vi.mock("@/lib/programs", () => ({ getEveryProgramConfig: mocks.configs }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: mocks.session }));
vi.mock("@/lib/auth/preview-mode", () => ({ isPreviewingAsStudent: mocks.preview }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: mocks.client }));
import { getMvpLearnersData } from "./learner-queries";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let requests: string[];
let failure: string;
let serverCap: number;
let ignoreRosterCursor: boolean;
let failRosterAfter: number;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
  mocks.preview.mockResolvedValue(false);
  mocks.configs.mockReturnValue([]);
  requests = []; failure = "";
  serverCap = 1; ignoreRosterCursor = false; failRosterAfter = Infinity;
  tables = { students: [{ id: "actor", program_id: "p1" }], staff_program_access: [], programs: [{ id: "p1", name: "One", slug: "one" }, { id: "p2", name: "Two", slug: "two" }] };
  Object.assign(tables, { track_overrides: [], hidden_courses: [], cohorts: [], student_tracks: [] });
  mocks.client.mockReturnValue({ from(table: string) {
    const predicates: ((row: Row) => boolean)[] = [];
    let single = false;
    const chain = {
      select: () => chain, order: () => chain, limit: () => chain,
      eq: (key: string, value: unknown) => { predicates.push(row => key.split(".").reduce<unknown>((current, part) => (current as Row)?.[part], row) === value); return chain; },
      or: (expression: string) => { const key = expression.split(".")[0]; predicates.push(row => { const value = (row.students as Row)[key]; return value === null || value === false; }); return chain; },
      in: (key: string, values: unknown[]) => { predicates.push(row => values.includes(row[key])); return chain; },
      gt: (key: string, value: string) => { if (!(table === "student_tracks" && ignoreRosterCursor)) predicates.push(row => String(row[key]) > value); return chain; },
      single: () => { single = true; return chain; },
      then: (resolve: (value: unknown) => unknown) => {
        requests.push(table);
        if (requests.length > 1000) throw new Error("Pagination loop");
        const rows = tables[table].filter(row => predicates.every(p => p(row))).slice(0, serverCap);
        const laterFailure = table === "student_tracks" && requests.filter(t => t === table).length > failRosterAfter;
        return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: failure === table || laterFailure ? new Error("DB error") : null }).then(resolve);
      },
    }; return chain;
  } });
});
describe("Learners loader access boundary", () => {
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
    expect(all.directory[0].enrollments).toEqual([
      { programId: "p1", programName: "One", courseSlug: "a", courseName: "A", cohort: null, attendance: null, lastActivity: { at: null, state: "unavailable" }, status: "not_evaluated" },
      { programId: "p2", programName: "Two", courseSlug: "b", courseName: "B", cohort: { id: "c1", name: "Current" }, attendance: null, lastActivity: { at: null, state: "unavailable" }, status: "not_evaluated" },
    ]);
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
    for (const params of [{ search: ["a", "b"] }, { search: "a".repeat(201) }, { courseSlug: "a" }, { cohortId: "c1" }, { status: "invalid" }, { status: "on_track" }, { status: "needs_check_in" }]) {
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
  });
  it("includes builder courses, excludes hidden courses and paginates definitions", async () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "hidden", name: "Hidden" }] }]);
    tables.track_overrides = [{ id: "o1", program_id: "p1", track_slug: "a", name: "Builder A" }, { id: "o2", program_id: "p1", track_slug: "b", name: "Builder B" }];
    tables.hidden_courses = [{ track_slug: "hidden" }];
    expect((await getMvpLearnersData()).options.courses.map(c => c.slug)).toEqual(["a", "b"]);
  });
  it("fails closed on option lookup errors", async () => {
    mocks.configs.mockReturnValue([{ slug: "one", tracks: [{ slug: "a", name: "A" }] }]);
    for (const table of ["track_overrides", "hidden_courses", "cohorts"]) {
      requests = []; failure = table;
      await expect(getMvpLearnersData()).rejects.toThrow();
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
