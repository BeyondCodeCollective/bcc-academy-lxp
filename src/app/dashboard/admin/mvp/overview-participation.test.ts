import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OverviewParticipation } from "./mvp-components/overview-participation";

// The bar is a breakdown, not task progress. Empty evidence has no filled
// segment or numeric percentage, while genuine zero remains a valid result.
describe("Overview attendance bar", () => {
  it("displays a known roster count while leaving incomplete attendance unavailable", () => {
    const html = renderToStaticMarkup(createElement(OverviewParticipation, { data: {
      attendance: { total: 20, qualified: null, notVerified: null, percent: null },
      attention: [], unavailableOfferingCount: 2,
    } }));
    expect(html).toContain("20 learner/course roster participations");
    expect(html).toContain("Attendance breakdown unavailable");
    expect(html).not.toContain('role="img"');
    expect(html).not.toContain("width:");
  });
  it.each([0, 76, 100])("renders both segments and an accessible description at %s percent", percent => {
    const html = renderToStaticMarkup(createElement(OverviewParticipation, { data: {
      attendance: { total: 100, qualified: percent, notVerified: 100 - percent, percent },
      attention: [], unavailableOfferingCount: 0,
    } }));
    expect(html).toContain('role="img"');
    expect(html).toContain(`width:${percent}%`);
    expect(html).toContain(`width:${100 - percent}%`);
    expect(html).toContain(`${percent}% meet 80% recorded attendance`);
    expect(html).not.toContain("Attendance breakdown unavailable");
    expect(html).toContain("100 learner/course roster participations");
  });
  it("keeps a neutral placeholder without fabricating percentages when unavailable", () => {
    const html = renderToStaticMarkup(createElement(OverviewParticipation, { data: undefined }));
    expect(html).toContain("border-dashed");
    expect(html).toContain("Attendance breakdown unavailable");
    expect(html).not.toContain('role="img"');
    expect(html).not.toContain("width:");
  });
  it("shows Program, Total, and Result using active learners out of the course roster", () => {
    const html = renderToStaticMarkup(createElement(OverviewParticipation, { data: {
      attendance: { total: 10, qualified: 8, notVerified: 2, percent: 80 }, unavailableOfferingCount: 0,
      attention: [{ id: "c", programId: "p", programName: "Program A", courseName: "Course A",
        attendanceRate: 60, activeLearners: 4, totalLearners: 10, activePercent: 40, outcomes: [] }],
    } }));
    for (const label of [">Program</th>", ">Total</th>", ">Result</th>", ">40%</td>", "4 / 10", "Program A"]) expect(html).toContain(label);
    expect(html).not.toContain("Program / measure");
    expect(html).not.toContain("How attendance and Active differ");
    expect(html).not.toContain("Staff-reviewed presence without a check-in is not added to this bar.");
    expect(html).toContain("active / total learners in this course");
    expect(html).not.toContain("Missing check-ins do not establish absence");
  });
});
