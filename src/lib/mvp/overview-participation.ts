import type { MvpProgramRow, MvpOutcomeMeasure } from "./types";
import type { MvpSurveyOutcomeGroup } from "./survey-queries";

// Only already-authorized, filtered rows enter this projection. Each program
// appears once, represented by its lowest-attendance active offering; course
// rates are never averaged into an unsupported program-wide rate.
export function buildMvpOverviewParticipation(rows: readonly MvpProgramRow[], surveys: readonly MvpSurveyOutcomeGroup[] = []) {
  const active = rows.filter(row => row.status === "active");
  const count = (value: number | null | undefined): value is number =>
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
  const rate = (value: number | null): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
  const eligible = active.filter(row => rate(row.attendanceRate) && count(row.totalParticipants) && row.totalParticipants > 0);
  const sorted = [...eligible].sort((a, b) => a.attendanceRate! - b.attendanceRate! || a.programId.localeCompare(b.programId) || a.id.localeCompare(b.id));
  const programs = new Set<string>();
  const attention = sorted.filter(row => {
    if (programs.has(row.programId)) return false;
    programs.add(row.programId); return true;
  }).slice(0, 3).map(row => ({
    id: row.id, programId: row.programId, programName: row.programName,
    courseName: row.courseName, attendanceRate: row.attendanceRate!,
    activeLearners: count(row.active) && row.active <= row.totalParticipants! ? row.active : null,
    totalLearners: row.totalParticipants!,
    activePercent: count(row.active) && row.active <= row.totalParticipants! ? row.active / row.totalParticipants! * 100 : null,
    outcomes: surveys.filter(group => group.scope !== "program" && group.programRowId === row.id &&
      (!group.programId || group.programId === row.programId)).flatMap(group => group.measures)
      .map((measure): Pick<MvpOutcomeMeasure, "id" | "label" | "sourceLabel" | "unit" | "beforeValue" | "afterValue" | "change"> => ({
        id: measure.id, label: measure.label, sourceLabel: measure.sourceLabel, unit: measure.unit,
        beforeValue: measure.beforeValue, afterValue: measure.afterValue, change: measure.change,
      })),
  }));

  // These are learner/course roster participations, not distinct people or
  // verified starts. The remainder includes unrecorded attendance, not proven
  // absences. Do not publish a partial bar when a denominator is unavailable.
  const rosterComplete = active.length > 0 && active.every(row => count(row.totalParticipants));
  const total = rosterComplete ? active.reduce((sum, row) => sum + row.totalParticipants!, 0) : null;
  // A known roster remains useful even when attendance is incomplete. Only
  // the attendance split requires every nonempty offering's qualification count.
  const complete = rosterComplete && active.every(row => count(row.totalParticipants) &&
    (row.totalParticipants === 0 || (count(row.attendanceQualified) && row.attendanceQualified <= row.totalParticipants)));
  const qualified = complete ? active.reduce((sum, row) => sum + (row.totalParticipants === 0 ? 0 : row.attendanceQualified!), 0) : null;
  return {
    attendance: { total, qualified, notVerified: total === null || qualified === null ? null : total - qualified,
      percent: total && qualified !== null ? qualified / total * 100 : null },
    attention, unavailableOfferingCount: active.length - eligible.length,
  };
}
