import { toCsv, type CsvValue } from "@/lib/csv";
import { parseMvpDateWindow } from "./date-window";
import { parseMvpLearnerFilter } from "./learner-filter";
import { parseMvpReportSelection, type buildMvpReport } from "./report-selection";

// Both formats consume one authorized snapshot, never client-supplied totals.
export type MvpReport = ReturnType<typeof buildMvpReport>;
export class MvpExportInputError extends Error {}
export function parseMvpExportRequest(input: unknown) {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
    const body = input as Record<string, unknown>;
    if (Object.keys(body).some(key => !["format", "filters", "selection"].includes(key)) ||
        !["pdf", "csv"].includes(body.format as string)) throw new Error();
    const raw = body.filters ?? {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
    const filters: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!["programId", "courseSlug", "city", "learnerStatus", "startDate", "endDate"].includes(key) ||
          (value !== null && (typeof value !== "string" || value.length > 500))) throw new Error();
      filters[key] = typeof value === "string" && value ? value : undefined;
    }
    parseMvpDateWindow(filters.startDate ?? null, filters.endDate ?? null);
    parseMvpLearnerFilter(filters.learnerStatus ?? null);
    const selection = parseMvpReportSelection(body.selection);
    if (selection.demographics) {
      throw new MvpExportInputError("Demographic exports await approved privacy and small-sample rules.");
    }
    return { format: body.format as "pdf" | "csv", filters, selection };
  } catch (error) {
    if (error instanceof MvpExportInputError) throw error;
    throw new MvpExportInputError("Choose a valid export format, filters, and report selection.");
  }
}

// Long-form records keep CSV columns stable across different checklist choices.
export type MvpExportRecord = {
  section: string; program: string; course: string; start: string; end: string;
  status: string; label: string; value: string | number; unit: string; reason: string;
};
export function mvpExportRecords(report: MvpReport): MvpExportRecord[] {
  const records: MvpExportRecord[] = [];
  const add = (section: string, label: string, value: string | number | null, unit = "", reason = "",
    context: Partial<MvpExportRecord> = {}) => records.push({ section, program: "", course: "", start: "", end: "",
      status: "", label, value: value ?? "Unavailable", unit, reason, ...context });
  add("Report", "Scope", report.scopeLabel);
  add("Report", "Last refreshed (ISO timestamp)", report.freshness.fetchedAt);
  add("Report", "Reporting basis", "Selected dates find overlapping offerings; results include full-offering evidence available so far.");
  for (const [key, value] of Object.entries(report.appliedFilters)) add("Filter", key, value ?? "All / not selected");
  for (const warning of report.warnings) add("Warning", warning.key, warning.reason);
  if (!report.rows.length) add("Report", "Offerings", "No offerings match the applied filters.");
  for (const row of report.rows) {
    const context = { program: row.programName, course: row.courseName ?? "Unavailable", start: row.startDate ?? "Unavailable",
      end: row.endDate ?? "Unavailable", status: row.status };
    for (const metric of row.metrics) add("Program metric", metric.label, metric.value, metric.unit, metric.unavailableReason ?? "", context);
  }
  for (const definition of report.definitions) add("Definition", definition.label, definition.definition,
    definition.denominator ?? "", definition.unavailableReason ?? "");
  // Both formats share these aggregate sections; learner evidence never enters
  // the export contract and event registration status is labeled separately.
  if (report.events) {
    if (report.events.unavailableReason) add("Event warning", "Coverage", null, "", report.events.unavailableReason);
    if (!report.events.rows.length) add("Event metric", "Events", "No event rows available for this selection.");
    for (const event of report.events.rows) {
      const context = { program: event.programName, course: event.title, start: event.startsAt, end: event.endsAt ?? "Unavailable",
        status: `Registration ${event.registrationStatus}; ${event.timezone}` };
      for (const metric of event.metrics) add("Event metric", metric.label, metric.value, metric.unit, metric.unavailableReason ?? "", context);
    }
  }
  if (report.outcomes) {
    if (!report.outcomes.length) add("Survey outcome", "Outcomes", null, "", "No mapped survey outcomes are available.");
    for (const group of report.outcomes) {
      const context = { program: group.programName, course: group.courseName };
      if (group.unavailableReason) add("Survey outcome", "Coverage", null, "", group.unavailableReason, context);
      for (const measure of group.measures) {
        const label = `${measure.sourceLabel}: ${measure.label}`;
        add("Survey outcome", `${label} — before`, measure.beforeValue, measure.unit, "", context);
        add("Survey outcome", `${label} — after`, measure.afterValue, measure.unit, "", context);
        add("Survey outcome", `${label} — change`, measure.change, measure.unit, "Higher ratings do not necessarily mean better outcomes or establish program causation.", context);
        add("Survey outcome", `${label} — paired respondents`, measure.pairedRespondentCount, "Respondents", "", context);
      }
    }
  }
  if ("locations" in report) {
    const location = report.locations;
    if (!location) add("Location summary", "Reported locations", null, "", "Location summary is unavailable.");
    else {
      add("Location summary", "Unique learners", location.uniqueLearners, "Learners");
      add("Location summary", "Known reported location", location.knownLocationLearners, "Learners");
      add("Location summary", "Missing or conflicting location", location.missingLocationLearners, "Learners");
      add("Location summary", "Distinct reported locations", location.distinctReportedLocations, "Profile locations");
      add("Location summary", "Verified cities represented", null, "Cities", location.unavailableReason);
      for (const group of location.groups) add("Reported location", group.label, group.count, "Learners");
    }
  }
  return records;
}

// Quoting alone does not stop spreadsheet formulas. Protect text including
// whitespace-prefixed formulas, while leaving genuine numeric values numeric.
function spreadsheetSafe(value: CsvValue): CsvValue {
  return typeof value === "string" && (/^[\t\r\n]/.test(value) || /^\s*[=+\-@]/.test(value)) ? `'${value}` : value;
}
export function renderMvpCsv(report: MvpReport): string {
  const header = ["Section", "Program", "Course / offering", "Start date", "End date", "Status", "Metric / field", "Value", "Unit / denominator", "Unavailable reason"];
  return toCsv(header, mvpExportRecords(report).map(row => [row.section, row.program, row.course, row.start, row.end,
    row.status, row.label, row.value, row.unit, row.reason].map(spreadsheetSafe)));
}
