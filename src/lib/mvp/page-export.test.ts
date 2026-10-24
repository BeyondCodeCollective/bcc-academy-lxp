import { describe, expect, it, vi, afterEach } from "vitest";
import { mvpPageExportRequest, downloadMvpPageReport } from "./page-export";
import { parseMvpExportRequest } from "./report-export";
import type { MvpFilters } from "./types";

const filters: MvpFilters = { programId: "p1", courseSlug: "alpha", city: "Boston, MA", learnerStatus: "active", startDate: "2026-09-01", endDate: "2026-09-30" };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("page PDF requests", () => {
  it("copies every applied filter and keeps page selections independent", () => {
    const overview = mvpPageExportRequest("overview", "pdf", filters);
    const programs = mvpPageExportRequest("programs", "pdf", { ...filters, programId: "p2", courseSlug: "beta" });
    expect(overview.filters).toEqual(filters);
    expect(overview.filters).not.toBe(filters);
    expect(programs.filters.programId).toBe("p2");
    expect(overview.filters.programId).toBe("p1");
    expect(overview.selection).toMatchObject({ locations: true, outcomes: false, summary: true, demographics: false });
    expect(programs.selection).toMatchObject({ locations: false, outcomes: true, summary: true, demographics: false });
    for (const request of [overview, programs]) expect(parseMvpExportRequest(request)).toMatchObject(request);
    expect(JSON.stringify(programs)).not.toMatch(/email|learnerId|participants/);
  });
  it("rejects unknown pages and invalid summary switches before database access", () => {
    const request = mvpPageExportRequest("programs", "pdf", filters);
    expect(() => parseMvpExportRequest({ ...request, view: "learners" })).toThrow();
    expect(() => parseMvpExportRequest({ ...request, selection: { ...request.selection, summary: "true" } })).toThrow();
  });
  it("posts the applied selection, downloads the response and releases resources", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response("%PDF-test", { headers: { "Content-Type": "application/pdf" } }));
    const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    const append = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", { createElement: () => link, body: { append } });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      await downloadMvpPageReport("programs", "pdf", filters);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(mvpPageExportRequest("programs", "pdf", filters));
      expect(link.download).toBe("mvp-programs.pdf");
      expect(link.click).toHaveBeenCalledOnce();
      expect(link.remove).toHaveBeenCalledOnce();
      vi.runAllTimers();
      expect(revoke).toHaveBeenCalledWith("blob:test");
    } finally { vi.useRealTimers(); }
  });
  it("does not download an authorization failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 })));
    const create = vi.spyOn(URL, "createObjectURL");
    await expect(downloadMvpPageReport("overview", "pdf", filters)).rejects.toThrow("could not be downloaded");
    expect(create).not.toHaveBeenCalled();
  });
});
