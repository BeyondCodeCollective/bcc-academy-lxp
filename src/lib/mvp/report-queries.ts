import "server-only";
import { getMvpDashboardData } from "./queries";
import { buildMvpReport, parseMvpReportSelection } from "./report-selection";

// Uses the same admin/super-admin, program grants, preview-mode exclusion,
// and filter validation as the dashboard. Does not generate files or write data.
export async function getMvpReportData(params: Record<string, string | string[] | undefined>, selection: unknown) {
  const parsed = parseMvpReportSelection(selection);
  const data = await getMvpDashboardData(params, { includeDemographics: parsed.demographics, includeLocations: parsed.locations, includeEvents: parsed.events });
  return buildMvpReport(data, parsed);
}
