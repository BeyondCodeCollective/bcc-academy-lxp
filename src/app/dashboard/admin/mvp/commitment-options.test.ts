import { beforeEach, describe, expect, it, vi } from "vitest";
const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("../actions-shared", () => ({ requireAdmin }));
vi.mock("@/lib/auth/program-access", () => ({ allowedProgramIds: (home: string | null, grants: { programId: string }[]) => [...new Set([home, ...grants.map(g => g.programId)].filter(Boolean))] }));
import { loadCommitmentOptions } from "./commitment-options";

function database() {
  const calls: unknown[][] = [];
  const pages = {
    programs: [[{ id: "p1", name: "Program" }], []],
    students: [[{ id: "s1", first_name: "Alex", last_name: "Admin", role: "admin", email: "private@example.com" }], [{ id: "s2", first_name: "Sam", last_name: null, role: "super_admin" }], []],
  };
  const from = vi.fn((table: keyof typeof pages) => {
    const query = {
      select: (value: string) => { calls.push([table, "select", value]); return query; },
      order: () => query, limit: () => query,
      in: (key: string, values: string[]) => { calls.push([table, "in", key, values]); return query; },
      gt: (key: string, value: string) => { calls.push([table, "gt", key, value]); return query; },
      then: (resolve: (value: unknown) => void) => resolve({ data: pages[table].shift() ?? [], error: null }),
    };
    return query;
  });
  return { from, calls };
}
beforeEach(() => vi.clearAllMocks());
describe("Commitment preview options", () => {
  it("rejects requests before reading options when authorization fails", async () => {
    requireAdmin.mockRejectedValue(new Error("Not authorized"));
    await expect(loadCommitmentOptions()).rejects.toThrow("Not authorized");
  });
  it("rejects other staff roles", async () => {
    const svc = database(); requireAdmin.mockResolvedValue({ role: "instructor", svc });
    await expect(loadCommitmentOptions()).rejects.toThrow("Not authorized");
    expect(svc.from).not.toHaveBeenCalled();
  });
  it("scopes admin programs, loads all staff pages, and returns only owner labels and ids", async () => {
    const svc = database(); requireAdmin.mockResolvedValue({ role: "admin", programId: "p1", grants: [], svc });
    const result = await loadCommitmentOptions();
    expect(svc.calls).toContainEqual(["programs", "in", "id", ["p1"]]);
    expect(svc.calls).toContainEqual(["students", "in", "role", ["admin", "super_admin"]]);
    expect(result.owners).toEqual([{ id: "s1", name: "Alex Admin (admin)" }, { id: "s2", name: "Sam (super_admin)" }]);
    expect(JSON.stringify(result)).not.toContain("private@example.com");
  });
  it("does not load programs for an admin without program access", async () => {
    const svc = database(); requireAdmin.mockResolvedValue({ role: "admin", programId: null, grants: [], svc });
    expect((await loadCommitmentOptions()).programs).toEqual([]);
    expect(svc.from.mock.calls.every(([table]) => table === "students")).toBe(true);
  });
  it("allows super-admin program choices without a home program", async () => {
    const svc = database(); requireAdmin.mockResolvedValue({ role: "super_admin", programId: null, grants: [], svc });
    expect((await loadCommitmentOptions()).programs).toEqual([{ id: "p1", name: "Program" }]);
    expect(svc.calls.filter(call => call[0] === "programs" && call[1] === "in")).toEqual([]);
  });
});
