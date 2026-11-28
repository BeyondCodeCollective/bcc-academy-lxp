import type { MvpProgramRow } from "./types";

type Reason = { metric: "started" | "active" | "completed" | "upcoming"; message: string };
type Course = Pick<MvpProgramRow, "id" | "programId" | "programName" | "courseSlug" | "courseName" | "cohortName"> & { reasons: Reason[] };

// Only authorized, filtered rows are accepted. Return explicit aggregate fields,
// never spread a source row or expose learner identities in this review queue.
export function buildKpiDataReview(rows: readonly MvpProgramRow[], completionReasons: ReadonlyMap<string, string> = new Map()) {
  const courses = new Map<string, Course>();
  for (const row of rows) {
    const reasons: Reason[] = [];
    if (row.started === null) reasons.push({ metric: "started", message:
      "Started count unavailable: a dated kickoff or first-session mapping is needed. Check the schedule and multi-session start mapping." });
    if (row.active === null) reasons.push({ metric: "active", message:
      `Active count unavailable: ${row.activeUnavailableReason ?? "Check active-learner policy configuration and attendance evidence."}` });
    if (row.completed === null) reasons.push({ metric: "completed", message:
      `Completion count unavailable: ${completionReasons.get(row.id) ?? "Check the full required schedule and session-delivery evidence."}` });
    if (row.status === "unknown") reasons.push({ metric: "upcoming", message:
      "Upcoming enrollment classification unavailable: check course dates, course format, and required-session delivery status." });
    else if (row.status === "starting_soon" && (row.enrolledBeforeStart === null || !Number.isSafeInteger(row.enrolledBeforeStart) || row.enrolledBeforeStart < 0)) reasons.push({ metric: "upcoming", message:
      "Upcoming enrollment count unavailable: a complete eligible enrollment count is needed." });
    if (!reasons.length) continue;
    const previous = courses.get(row.id);
    if (previous) {
      for (const reason of reasons) if (!previous.reasons.some(item => item.metric === reason.metric && item.message === reason.message)) previous.reasons.push(reason);
    } else courses.set(row.id, { id: row.id, programId: row.programId, programName: row.programName,
      courseSlug: row.courseSlug, courseName: row.courseName, cohortName: row.cohortName, reasons });
  }
  const flaggedCourses = [...courses.values()].sort((a, b) => a.programName.localeCompare(b.programName) || a.id.localeCompare(b.id));
  return { courseCount: flaggedCourses.length, courses: flaggedCourses };
}
