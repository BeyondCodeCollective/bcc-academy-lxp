import { describe, it, expect, vi } from "vitest";
import { writeFile } from "node:fs/promises";
import { isValidElement, type ReactNode } from "react";
import { MvpReportDocument } from "./report-document";
import { mvpExportRecords, parseMvpExportRequest, renderMvpCsv, type MvpReport } from "./report-export";
vi.mock("server-only", () => ({}));

// Synthetic aggregates only: no database, credentials, or learner identities.
function report(): MvpReport {
  return { scopeLabel: "Catalyst", appliedFilters: { programId: "program-1", courseSlug: null, city: null,
    learnerStatus: "all", startDate: "2026-09-01", endDate: "2026-09-30" },
    filterLabels: { program: "Catalyst", course: "All courses" },
    freshness: { fetchedAt: "2026-10-08T20:00:00Z", sourceUpdatedAt: null, lastValidatedAt: null, lastValidatedBy: null },
    warnings: [{ key: "dateWindow", reason: "One undated offering excluded." }],
    rows: [{ id: "offering-1", programName: "Catalyst", courseName: 'AI, design & "ideas"', status: "active",
      startDate: "2026-08-01", endDate: "2026-10-31", metrics: [
        { key: "started", label: "Learners started", unit: "Learners", value: 0, availability: "available", unavailableReason: null },
        { key: "active", label: "Active learners", unit: "Learners", value: null, availability: "unavailable", unavailableReason: "Required submissions are not configured." },
      ] }], definitions: [{ key: "started", label: "Learners started", definition: "Recorded first-session attendance.", denominator: "Current eligible learners", unavailableReason: null }],
  };
}
describe("MVP export serialization", () => {
  it("uses readable filter scope, distinguishes zero, and never substitutes raw IDs in PDF copy", () => {
    function text(node: ReactNode): string {
      if (Array.isArray(node)) return node.map(text).join(" ");
      if (isValidElement<{ children?: ReactNode }>(node)) return text(node.props.children);
      return typeof node === "string" || typeof node === "number" ? String(node) : "";
    }
    const data = report();
    data.summary = { uniqueLearnersStarted: 7, programParticipationsStarted: 9, uniqueLearnersCompleted: 0, programParticipationsCompleted: null, upcomingEnrollments: 2 };
    const content = text(MvpReportDocument({ report: data, view: "programs" }));
    for (const label of ["PROGRAM IMPACT BRIEF", "Catalyst", "All courses", "Current-roster summary", "7", "9", "0", "Unavailable", "Required submissions are not configured."]) expect(content).toContain(label);
    expect(content).not.toContain("program-1");
    expect(content).not.toContain("offering-1");
    expect(content).not.toContain("Final results");
    const oldSnapshot = { ...data, filterLabels: undefined };
    expect(text(MvpReportDocument({ report: oldSnapshot }))).not.toContain("program-1");
    data.rows = [];
    data.appliedFilters.programId = null;
    expect(text(MvpReportDocument({ report: data }))).toContain("Impact overview");
    expect(text(MvpReportDocument({ report: data }))).toContain("No offerings match");
  });
  it("serializes event units and survey scales without mixing them with learner totals", () => {
    const data = report();
    data.events = { unavailableReason: null, rows: [{ programName: "Catalyst", title: "Workshop", startsAt: "2026-09-01T14:00:00Z",
      endsAt: null, timezone: "America/New_York", registrationStatus: "closed", metrics: [
        { key: "active", label: "Active attendee tickets (verified attendance)", value: 3, unit: "Attendee tickets, not unique learners", unavailableReason: null },
        { key: "completed", label: "Course completions", value: null, unit: "Attendee tickets, not unique learners", unavailableReason: "Not established for events." },
      ] }] };
    data.outcomes = [{ programName: "Catalyst", courseName: "Workshop", unavailableReason: null, measures: [{
      id: "skills", label: "Skills", sourceLabel: "Exit survey", unit: "1–5 rating", beforeValue: 2, afterValue: 4, change: 2,
      respondentCount: 4, pairedRespondentCount: 3,
    }] }];
    const csv = renderMvpCsv(data);
    expect(csv).toContain("Attendee tickets, not unique learners");
    expect(csv).toContain("Not established for events.");
    expect(csv).toContain("Registration closed; America/New_York");
    expect(csv).toContain('"Exit survey: Skills — paired respondents","3","Respondents"');
    expect(csv).toContain("1–5 rating");
    expect(csv).not.toContain("learnerId");
  });
  it("accepts outcome-only selections but rejects invalid new section switches", () => {
    expect(parseMvpExportRequest({ format: "csv", selection: { metricKeys: [], outcomes: true } }).selection.outcomes).toBe(true);
    for (const selection of [{ metricKeys: ["active"], events: "yes" }, { metricKeys: [], events: true }, { metricKeys: ["active"], outcomes: [] }]) {
      expect(() => parseMvpExportRequest({ format: "csv", selection })).toThrow();
    }
  });
  it("keeps known zero, unavailable reasons, filters, full dates, and warnings", () => {
    const csv = renderMvpCsv(report());
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Learners started","0","Learners"');
    expect(csv).toContain('"Active learners","Unavailable","Learners","Required submissions are not configured."');
    expect(csv).toContain('"AI, design & ""ideas"""');
    expect(csv).toContain('"2026-08-01","2026-10-31"');
    expect(csv).toContain("One undated offering excluded.");
    expect(csv).toContain("full-offering evidence");
    expect(csv).not.toContain("offering-1");
  });
  it.each(["=1+1", "  =1+1", "\n@SUM(1)", "\tformula", "+123", "-123", "@sum(A1)"])("neutralizes formula-like text %j", text => {
    const data = report(); data.rows[0].programName = text;
    expect(renderMvpCsv(data)).toContain(`"'${text}"`);
  });
  it("includes only selected optional sections and distinguishes profile locations from cities", () => {
    const data = report();
    expect(mvpExportRecords(data).some(r => r.section.includes("Location"))).toBe(false);
    data.locations = { uniqueLearners: 3, knownLocationLearners: 2, missingLocationLearners: 1,
      distinctReportedLocations: 1, citiesRepresented: null, unavailableReason: "Profile text is not verified city data.",
      groups: [{ label: "Montréal", count: 2 }] };
    expect(renderMvpCsv(data)).toContain('"Montréal","2","Learners"');
    expect(renderMvpCsv(data)).toContain('"Verified cities represented","Unavailable"');
  });
  it("renders an explicit empty result", () => {
    const data = report(); data.rows = [];
    expect(renderMvpCsv(data)).toContain("No offerings match");
  });
  it("validates request selections and rejects unapproved demographic exports", () => {
    expect(parseMvpExportRequest({ format: "csv", selection: { metricKeys: ["started", "started"] } }).selection.metricKeys).toEqual(["started"]);
    for (const input of [null, { format: "html" }, { format: "csv", rows: [] },
      { format: "csv", selection: { metricKeys: ["unknown"] } },
      { format: "csv", filters: { startDate: "2026-02-30" }, selection: { metricKeys: ["started"] } },
      { format: "csv", filters: { learnerStatus: "made-up" }, selection: { metricKeys: ["started"] } },
      { format: "csv", filters: { programId: ["one", "two"] }, selection: { metricKeys: ["started"] } },
      { format: "csv", selection: { metricKeys: [], demographics: true } },
    ]) expect(() => parseMvpExportRequest(input)).toThrow();
  });
  it("generates a real multi-page PDF from synthetic data", async () => {
    const data = report();
    data.rows = Array.from({ length: 24 }, (_, i) => ({ ...data.rows[0], id: String(i), courseName: `Offering ${i + 1} — ${"Program design and learning outcomes ".repeat(4)}` }));
    const { renderMvpPdf } = await import("./report-pdf");
    const pdf = await renderMvpPdf(data);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)!.length).toBeGreaterThan(1);
    if (process.env.MVP_SAMPLE_PDF) await writeFile(process.env.MVP_SAMPLE_PDF, pdf);
  }, 30_000);
  it("renders a compact styled brief with summary and original survey scales", async () => {
    const data = report();
    data.scopeLabel = "Layout preview - synthetic data";
    data.filterLabels = { program: "Layout preview - synthetic data", course: "All courses" };
    data.summary = { uniqueLearnersStarted: 42, programParticipationsStarted: 42, uniqueLearnersCompleted: 36, programParticipationsCompleted: 36, upcomingEnrollments: 0 };
    data.rows[0].courseName = "Web foundations";
    data.rows[0].metrics = [
      { key: "totalParticipants", label: "Enrolled learners", unit: "Learners", value: 42, availability: "available", unavailableReason: null },
      { key: "started", label: "Learners started", unit: "Learners", value: 42, availability: "available", unavailableReason: null },
      { key: "completed", label: "Course completions", unit: "Learners", value: 36, availability: "available", unavailableReason: null },
    ];
    data.outcomes = [{ programName: "Sample program", courseName: "Web foundations", unavailableReason: null, measures: [{ id: "confidence", label: "Coding confidence", sourceLabel: "Course survey", unit: "1-5 rating", beforeValue: 2.3, afterValue: 4.1, change: 1.8, respondentCount: 38, pairedRespondentCount: 36 }] }];
    data.locations = { uniqueLearners: 42, knownLocationLearners: 40, missingLocationLearners: 2, distinctReportedLocations: 2, citiesRepresented: null, unavailableReason: "Reported profile locations, not verified cities.", groups: [{ label: "Sample location A", count: 25 }, { label: "Sample location B", count: 15 }] };
    data.warnings = [];
    const { renderMvpPdf } = await import("./report-pdf");
    const pdf = await renderMvpPdf(data, "programs");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.MVP_BRIEF_PDF) await writeFile(process.env.MVP_BRIEF_PDF, pdf);
  }, 30_000);
});
