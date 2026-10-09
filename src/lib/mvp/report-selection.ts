import type { MvpDashboardData, MvpProgramRow } from "./types";

// Stable allowlist for a future report checklist. Never resolve arbitrary
// request keys against database columns or return whole learner records.
export const MVP_REPORT_METRICS = [
  { key: "totalParticipants", label: "Enrolled learners", unit: "Learners" },
  { key: "started", label: "Learners started", unit: "Learners" },
  { key: "completed", label: "Course completions", unit: "Learners" },
  { key: "attendanceQualified", label: "Meets 80% attendance", unit: "Learners" },
  { key: "active", label: "Active learners", unit: "Learners" },
  { key: "learnersNeedingCheckIn", label: "Needs a check-in", unit: "Learners" },
  { key: "attendanceRate", label: "Recorded attendance", unit: "Percent" },
  { key: "completionRate", label: "Course completion rate", unit: "Percent" },
  { key: "sessionsRemaining", label: "Required sessions remaining", unit: "Sessions" },
  { key: "progressRate", label: "Configured required-video progress", unit: "Percent" },
  { key: "assessmentAveragePercent", label: "Latest mapped assessment average", unit: "Percent" },
  { key: "surveyResponseRate", label: "Responded to any mapped course survey", unit: "Percent" },
] as const;
export type MvpReportMetricKey = typeof MVP_REPORT_METRICS[number]["key"];
export type MvpReportSelection = { metricKeys: MvpReportMetricKey[]; demographics: boolean; locations: boolean; events?: boolean; outcomes?: boolean };

// Runtime validation handles untrusted future form/API input before any read.
export function parseMvpReportSelection(input: unknown): MvpReportSelection {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid report selection.");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["metricKeys", "demographics", "locations", "events", "outcomes"].includes(key)) ||
      !Array.isArray(value.metricKeys) || value.metricKeys.length > MVP_REPORT_METRICS.length ||
      value.metricKeys.some((key) => !MVP_REPORT_METRICS.some((metric) => metric.key === key)) ||
      (value.demographics !== undefined && typeof value.demographics !== "boolean") ||
      (value.locations !== undefined && typeof value.locations !== "boolean") ||
      (value.events !== undefined && typeof value.events !== "boolean") ||
      (value.outcomes !== undefined && typeof value.outcomes !== "boolean")) throw new Error("Invalid report selection.");
  const metricKeys = [...new Set(value.metricKeys)] as MvpReportMetricKey[];
  if (!metricKeys.length && !value.demographics && !value.locations && !value.outcomes) throw new Error("Select at least one report metric or section.");
  return { metricKeys, demographics: value.demographics === true, locations: value.locations === true,
    events: value.events === true, outcomes: value.outcomes === true };
}

// Build from one authorized, filtered snapshot; never sum course counts into
// purported unique-person totals. Separate events retain ticket-based units.
export function buildMvpReport(data: MvpDashboardData, selection: MvpReportSelection) {
  const validated = parseMvpReportSelection(selection);
  const rows = data.programs.map((row: MvpProgramRow) => ({
    id: row.id, programName: row.programName, courseName: row.courseName,
    status: row.status, startDate: row.startDate, endDate: row.endDate,
    metrics: validated.metricKeys.map((key) => {
      const metric = MVP_REPORT_METRICS.find((item) => item.key === key)!;
      const raw = row[key];
      const value = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
      const unit = key === "assessmentAveragePercent" && row.assessmentSummary
        ? `Percent; exam ${row.assessmentSummary.examId ?? "unmapped"}; ${row.assessmentSummary.assessedLearners}/${row.assessmentSummary.eligibleLearners} learners assessed`
        : key === "progressRate" && row.videoProgress
          ? `Percent; ${row.videoProgress.watchedLearnerWeeks ?? "Unavailable"}/${row.videoProgress.requiredLearnerWeeks} learner-video opportunities`
          : key === "surveyResponseRate" ? `Percent of ${row.totalParticipants ?? "unavailable"} selected learners; at least one mapped survey` : metric.unit;
      return { ...metric, unit, value, availability: value === null ? "unavailable" as const : "available" as const,
        unavailableReason: value === null ? (key === "sessionsRemaining" ? row.sessionsRemainingReason
          : key === "assessmentAveragePercent" ? row.assessmentSummary?.unavailableReason
          : key === "progressRate" ? row.videoProgress?.unavailableReason : null) ??
          data.metricDefinitions.find((item) => item.key === key)?.unavailableReason ?? "This metric cannot be calculated for this offering." : null };
    }),
  }));
  return { scopeLabel: data.scopeLabel, appliedFilters: { ...data.appliedFilters }, freshness: { ...data.freshness },
    warnings: data.metricDefinitions.filter((definition) => ["learnerStatus", "dateWindow"].includes(definition.key) && definition.unavailableReason)
      .map((definition) => ({ key: definition.key, reason: definition.unavailableReason! })),
    rows, definitions: data.metricDefinitions.filter((definition) => validated.metricKeys.includes(definition.key as MvpReportMetricKey)),
    ...(validated.demographics && { demographics: data.demographics ?? null }),
    ...(validated.locations && { locations: data.locations ?? null }),
    ...(validated.outcomes && { outcomes: (data.surveyOutcomes ?? []).map(group => ({
      programName: data.filterOptions.programs.find(p => p.id === group.programId)?.name ??
        data.programs.find(p => p.id === group.programRowId)?.programName ?? "Unavailable",
      courseName: group.scope === "program" ? "Program-wide survey" : data.programs.find(p => p.id === group.programRowId)?.courseName ?? "Unavailable",
      measures: group.measures, unavailableReason: group.unavailableReason,
    })) }),
    ...(validated.events && { events: {
      unavailableReason: data.events?.unavailableReason ?? (data.events ? null : "Separate-event data was not loaded."),
      rows: (data.events?.rows ?? []).map(event => ({
        programName: data.filterOptions.programs.find(p => p.id === event.programId)?.name ?? "Unavailable",
        title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, timezone: event.timezone,
        registrationStatus: event.registrationStatus,
        metrics: validated.metricKeys.map(key => {
          const metric = MVP_REPORT_METRICS.find(item => item.key === key)!;
          const value = key === "totalParticipants" ? event.enrolled : key === "active" ? event.active : null;
          return { key, label: key === "totalParticipants" ? "Enrolled attendee tickets" : key === "active" ? "Active attendee tickets (verified attendance)" : metric.label,
            value, unit: ["totalParticipants", "active"].includes(key) ? "Attendee tickets, not unique learners" : metric.unit,
            unavailableReason: value === null ? ["totalParticipants", "active"].includes(key) ? event.unavailableReason : "This course metric is not established for separate events." : null };
        }),
      })),
    } }),
  };
}
