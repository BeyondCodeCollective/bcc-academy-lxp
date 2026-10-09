import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadMvpAttendanceReviews } from "./attendance-review-queries";

// Exercise unavailable migrations separately from permissions and broken cursors.
function database(results: Array<{ data: unknown; error: unknown }>) {
  const from = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "order", "limit", "gt"]) chain[method] = () => chain;
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(results.shift()).then(resolve);
    return chain;
  });
  return { db: { from } as unknown as Parameters<typeof loadMvpAttendanceReviews>[0], from };
}
describe("attendance evidence loader failures", () => {
  it.each(["PGRST205", "42P01"])("keeps missing migration %s as no verified evidence", async code => {
    const { db } = database([{ data: null, error: { code } }]);
    expect(await loadMvpAttendanceReviews(db, "p", "c", ["u"])).toEqual([]);
  });
  it("does not silently swallow denied access", async () => {
    const { db } = database([{ data: null, error: { code: "42501" } }]);
    await expect(loadMvpAttendanceReviews(db, "p", "c", ["u"])).rejects.toThrow("complete attendance review evidence");
  });
  it("rejects a nonadvancing page instead of using partial history", async () => {
    const { db } = database([{ data: [{ id: "r" }], error: null }, { data: [{ id: "r" }], error: null }]);
    await expect(loadMvpAttendanceReviews(db, "p", "c", ["u"])).rejects.toThrow("pagination did not advance");
  });
  it("does not read any history for an empty authorized roster", async () => {
    const { db, from } = database([]);
    expect(await loadMvpAttendanceReviews(db, "p", "c", [])).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
