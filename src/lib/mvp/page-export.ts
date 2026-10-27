import type { MvpFilters } from "./types";
import type { MvpReportSelection } from "./report-selection";

// Only applied filters enter this helper; neither page's draft controls nor
// stored filters from another view are read. No contacts enter the request.
export function mvpPageExportRequest(view: "overview" | "programs", format: "pdf" | "csv", appliedFilters: MvpFilters) {
  const selection: MvpReportSelection = {
    metricKeys: ["totalParticipants", "started", "completed", "active", "attendanceQualified", "attendanceRate", "sessionsRemaining", "learnersNeedingCheckIn"],
    summary: true, demographics: false, locations: view === "overview", outcomes: view === "programs",
  };
  // Preserve the existing CSV checklist; this redesign targets PDF briefs.
  if (format === "csv") return { view, format, filters: { ...appliedFilters }, selection: {
    metricKeys: ["totalParticipants", "started", "completed", "active", "sessionsRemaining"], outcomes: true,
  } };
  return { view, format, filters: { ...appliedFilters }, selection };
}

export async function downloadMvpPageReport(view: "overview" | "programs", format: "pdf" | "csv", appliedFilters: MvpFilters) {
  const response = await fetch("/api/mvp/export", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mvpPageExportRequest(view, format, appliedFilters)),
  });
  if (!response.ok) throw new Error("The report could not be downloaded. Please try again.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  try {
    link.href = url; link.download = `mvp-${view}.${format}`;
    document.body.append(link); link.click();
  } finally {
    link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
