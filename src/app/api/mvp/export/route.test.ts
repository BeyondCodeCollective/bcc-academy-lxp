import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ load: vi.fn(), pdf: vi.fn() }));
vi.mock("@/lib/mvp/report-queries", () => ({ getMvpReportData: mocks.load }));
vi.mock("@/lib/mvp/report-pdf", () => ({ renderMvpPdf: mocks.pdf }));
import { POST } from "./route";

const body = { format: "csv", filters: { programId: "allowed-program" }, selection: { metricKeys: ["started"] } };
function request(value: unknown = body) {
  return new Request("http://localhost/api/mvp/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.load.mockResolvedValue({ scopeLabel: "Authorized scope", appliedFilters: {}, freshness: { fetchedAt: "2026-10-08T20:00:00Z" }, rows: [], warnings: [], definitions: [] });
  mocks.pdf.mockResolvedValue(Buffer.from("%PDF-test"));
});
describe("MVP export endpoint", () => {
  it("loads authorized report data and returns an uncached download", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.load).toHaveBeenCalledWith(body.filters, { metricKeys: ["started"], demographics: false, locations: false, events: false, outcomes: false });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="mvp-report-\d{4}-\d{2}-\d{2}.csv"$/);
    expect(await response.text()).toContain("Authorized scope");
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("returns a PDF attachment from the same authorized snapshot", async () => {
    const response = await POST(request({ ...body, format: "pdf" }));
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(await response.text()).toBe("%PDF-test");
    expect(mocks.pdf).toHaveBeenCalledOnce();
  });
  it.each(["MVP access is required.", "The selected program is unavailable.", "The selected course is unavailable."])("rejects unauthorized scope: %s", async message => {
    mocks.load.mockRejectedValue(new Error(message));
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("does not expose database details or return a partial report", async () => {
    mocks.load.mockRejectedValue(new Error("secret database details"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret");
  });
  it("rejects malformed, oversized, and unauthorized selection shapes before reads", async () => {
    for (const value of [{ ...body, rows: [] }, { ...body, selection: { metricKeys: [], demographics: true } }, { ...body, filters: { city: "x".repeat(17000) } }]) {
      expect((await POST(request(value))).status).toBe(400);
    }
    const malformed = new Request("http://localhost/api/mvp/export", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    expect((await POST(malformed)).status).toBe(400);
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("requires JSON", async () => {
    const response = await POST(new Request("http://localhost/api/mvp/export", { method: "POST", body: "text" }));
    expect(response.status).toBe(415);
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
