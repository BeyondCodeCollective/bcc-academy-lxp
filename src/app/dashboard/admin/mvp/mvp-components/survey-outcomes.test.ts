import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SurveyOutcomes } from "./survey-outcomes";
import type { MvpProgramRow, MvpOutcomeMeasure } from "@/lib/mvp/types";

// Synthetic aggregates exercise rendered content without a database or browser.
const program: MvpProgramRow = {
  id: "p:course", programId: "p", programName: "Program", courseSlug: "course",
  courseName: "Example course", cohortId: null, cohortName: null, status: "active",
  startDate: null, endDate: null, totalParticipants: 2, enrolledBeforeStart: null,
  started: 2, active: null, completed: null, attendanceRate: null, progressRate: null,
  completionRate: null, surveyResponseRate: null, learnersNeedingCheckIn: null,
};
const measure: MvpOutcomeMeasure = {
  id: "confidence", label: "Confidence", sourceLabel: "End survey",
  unit: "Scale points (1–5)", beforeValue: 2, afterValue: 4, change: 2,
  respondentCount: 2, pairedRespondentCount: 1,
};
function render(overrides: Partial<MvpOutcomeMeasure> = {}, reason: string | null = null) {
  return renderToStaticMarkup(createElement(SurveyOutcomes, {
    programs: [program], surveyOutcomes: [{ programRowId: program.id,
      measures: [{ ...measure, ...overrides }], unavailableReason: reason }],
  }));
}

describe("Survey outcome display", () => {
  it("renders expandable course results, source and paired sample size", () => {
    const html = render();
    expect(html).toContain("<details");
    expect(html).toContain("Example course");
    expect(html).toContain("End survey");
    expect(html).toContain("Paired respondents");
    expect(html).toContain(">+2</td>");
  });
  it("preserves a genuine zero change", () => {
    expect(render({ change: 0 })).toContain(">0</td>");
    expect(render({ change: 0 })).not.toContain(">Not available</td>");
  });
  it("explains unavailable pairs without inventing a zero", () => {
    const html = render({ beforeValue: null, afterValue: null, change: null }, "No paired answers.");
    expect(html.match(/>Not available<\/td>/g)).toHaveLength(3);
    expect(html).toContain("No paired answers.");
  });
  it("shows an empty selection message", () => {
    const html = renderToStaticMarkup(createElement(SurveyOutcomes, { programs: [], surveyOutcomes: [] }));
    expect(html).toContain("No survey outcome results");
  });
  it("does not render outcomes outside supplied program rows", () => {
    const html = renderToStaticMarkup(createElement(SurveyOutcomes, { programs: [],
      surveyOutcomes: [{ programRowId: "other", measures: [measure], unavailableReason: null }] }));
    expect(html).not.toContain("End survey");
    expect(html).toContain("No survey outcome results");
  });
  it("escapes survey labels instead of rendering them as HTML", () => {
    const html = render({ label: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
