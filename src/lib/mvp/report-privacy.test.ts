import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { protectMvpGeography, protectMvpSurvey, MVP_SUPPRESSION_REASON } from "./privacy";
import { calculateMvpGeography } from "./geography";
import { calculateMvpLocations } from "./location-summary";
import { getMvpReportData } from "./report-queries";
import { mvpExportRecords, renderMvpCsv } from "./report-export";
import { MvpReportDocument } from "./report-document";
import { SurveyOutcomes } from "@/app/dashboard/admin/mvp/mvp-components/survey-outcomes";
import type { MvpDashboardData } from "./types";
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./queries", () => ({ getMvpDashboardData: mocks.load }));

function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (isValidElement<{ children?: ReactNode }>(node)) return text(node.props.children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}
function snapshot(count: number): MvpDashboardData {
  const profiles = Array.from({ length: count }, (_, i) => ({ id: String(i), location: "Private region", zip: "02108", state: "MA" }));
  const survey = protectMvpSurvey({ programRowId: "p:c", programId: "p", scope: "course", unavailableReason: null,
    measures: [{ id: "m", label: "Confidence", sourceLabel: "Exit survey", unit: "points",
      respondentCount: count, pairedRespondentCount: count, beforeValue: count ? 2.125 : null,
      afterValue: count ? 4.875 : null, change: count ? 2.75 : null }],
    participation: [{ surveyId: "s", label: "Exit survey", respondents: count, eligibleLearners: count, responseRate: count ? 100 : null }],
    anySurveyResponseRate: count ? 100 : null });
  return protectMvpGeography({ scopeLabel: "Program", appliedFilters: { programId: "p", courseSlug: "c", city: null, learnerStatus: "all", startDate: null, endDate: null },
    filterOptions: { programs: [{ id: "p", name: "Program" }], courses: [{ programId: "p", slug: "c", name: "Course" }], cities: [] },
    freshness: { fetchedAt: "2026-10-23T12:00:00Z", sourceUpdatedAt: null, lastValidatedAt: null, lastValidatedBy: null },
    programs: [{ id: "p:c", programId: "p", programName: "Program", courseName: "Course", status: "active", startDate: null, endDate: null,
      totalParticipants: count, surveyResponseRate: survey.anySurveyResponseRate }], surveyOutcomes: [survey],
    geography: calculateMvpGeography(profiles), locations: calculateMvpLocations(profiles), metricDefinitions: [],
  } as unknown as MvpDashboardData);
}
describe("privacy propagation into Reports/UI", () => {
  it.each([1, 4])("never reconstructs hidden n=%i in dashboard, CSV, or PDF content", async count => {
    const data = snapshot(count);
    mocks.load.mockResolvedValue(data);
    const report = await getMvpReportData({}, { metricKeys: ["surveyResponseRate"], locations: true, outcomes: true });
    expect(report.locations).toBeNull();
    expect(report.warnings).toContainEqual({ key: "geographyPrivacy", reason: MVP_SUPPRESSION_REASON });
    const records = mvpExportRecords(report);
    expect(records.find(row => row.label.endsWith("paired respondents"))?.value).toBe("Unavailable");
    expect(records.find(row => row.label === "Responded to any mapped course survey")?.value).toBe("Unavailable");
    const html = renderToStaticMarkup(createElement(SurveyOutcomes, { programs: data.programs, surveyOutcomes: data.surveyOutcomes }));
    for (const output of [html, renderMvpCsv(report), text(MvpReportDocument({ report }))]) {
      expect(output).toContain(MVP_SUPPRESSION_REASON);
      expect(output).not.toContain("2.125");
      expect(output).not.toContain("4.875");
      expect(output).not.toContain("Private region");
      expect(output).not.toContain("02108");
    }
  });
  it.each([0, 5, 6])("preserves valid zero and safe paired counts n=%i in exports", async count => {
    mocks.load.mockResolvedValue(snapshot(count));
    const report = await getMvpReportData({}, { metricKeys: [], locations: true, outcomes: true });
    expect(mvpExportRecords(report).find(row => row.label.endsWith("paired respondents"))?.value).toBe(count);
    expect(report.locations?.uniqueLearners).toBe(count);
    expect(report.warnings).toEqual([]);
  });
});
