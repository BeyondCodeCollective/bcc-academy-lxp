import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), preview: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: mocks.session }));
vi.mock("@/lib/auth/preview-mode", () => ({ isPreviewingAsStudent: mocks.preview }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: mocks.client }));
import { getMvpLearnersData } from "./learner-queries";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let requests: string[];
let failure: string;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ userId: "actor", student: { role: "admin" } });
  mocks.preview.mockResolvedValue(false);
  requests = []; failure = "";
  tables = { students: [{ id: "actor", program_id: "p1" }], staff_program_access: [], programs: [{ id: "p1", name: "One", slug: "one" }, { id: "p2", name: "Two", slug: "two" }] };
  mocks.client.mockReturnValue({ from(table: string) {
    const predicates: ((row: Row) => boolean)[] = [];
    let single = false;
    const chain = {
      select: () => chain, order: () => chain, limit: () => chain,
      eq: (key: string, value: unknown) => { predicates.push(row => row[key] === value); return chain; },
      in: (key: string, values: unknown[]) => { predicates.push(row => values.includes(row[key])); return chain; },
      gt: (key: string, value: string) => { predicates.push(row => String(row[key]) > value); return chain; },
      single: () => { single = true; return chain; },
      then: (resolve: (value: unknown) => unknown) => {
        requests.push(table);
        if (requests.length > 30) throw new Error("Pagination loop");
        const rows = tables[table].filter(row => predicates.every(p => p(row))).slice(0, 1);
        return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: failure === table ? new Error("DB error") : null }).then(resolve);
      },
    }; return chain;
  } });
});
describe("Learners loader access boundary", () => {
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
    expect(result.directory).toBeNull();
    expect(requests.every(table => ["students", "staff_program_access", "programs"].includes(table))).toBe(true);
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
