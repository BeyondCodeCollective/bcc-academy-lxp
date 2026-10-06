import { buildMvpSchedule, type MvpScheduleInput } from "./schedule";
import { calculateAttendanceMilestone, type MvpAttendanceRecord, type MvpSessionSlot } from "./milestones";
import { calculateMvpPercentage } from "./metrics";
import { evaluateMvpCourseCheckIns } from "./check-ins";

// Status is entered through the existing course session editor. Attendance
// rates here cover explicitly completed sessions, not every elapsed date.
export type MvpSessionDelivery = {
  week_number: number;
  status: string;
  status_2: string;
  status_3: string;
};

// Start mapping requires an explicit dated syllabus. A labeled exam is not
// a kickoff. Multi-session weekly units need a more precise start mapping.
export function getMvpStartSlots(track: MvpScheduleInput["track"]): MvpSessionSlot[] | null {
  if (!track || (track.unitLabel !== "Session" && track.sessionsPerWeek !== 1)) return null;
  const units = track.weekSummaries ?? [];
  if (!units.length || units.some((unit) => !unit.date)) return null;
  const teaching = units.filter((unit) => !unit.label).sort((a, b) => a.date!.localeCompare(b.date!));
  if (!teaching.length) return null;
  if (teaching.length > 1 && teaching[0].date === teaching[1].date) return null;
  const kickoff = units.filter((unit) => /^kick[ -]?off$/i.test(unit.label?.trim() ?? ""));
  return [...kickoff, teaching[0]].map((unit) => ({
    weekNumber: unit.week, sessionNumber: 1, label: unit.label || "First session",
  }));
}

// Computes each learner independently and combines raw counts, rather than
// averaging rounded percentages. The caller supplies a complete scoped roster.
export function calculateMvpCoursePerformance(
  track: MvpScheduleInput["track"],
  learnerIds: string[],
  attendance: MvpAttendanceRecord[],
  delivery: MvpSessionDelivery[],
  asOf: Date,
  programRowId: string = track?.slug ?? "unknown",
) {
  const confirmedHeldSessions: MvpSessionSlot[] = delivery.flatMap((unit) =>
    [unit.status, unit.status_2, unit.status_3].flatMap((status, index) =>
      status === "completed" ? [{
        weekNumber: unit.week_number, sessionNumber: index + 1,
        label: `Unit ${unit.week_number}, session ${index + 1}`,
      }] : [],
    ),
  );
  const schedule = buildMvpSchedule({
    track, asOf, verifiedStartSessions: getMvpStartSlots(track),
    confirmedHeldSessions: confirmedHeldSessions.length ? confirmedHeldSessions : null,
  });
  const distinctLearnerIds = [...new Set(learnerIds)];
  const milestones = distinctLearnerIds.map((learnerId) =>
    calculateAttendanceMilestone({
      learnerId, courseSlug: track?.slug ?? "", records: attendance,
      startSessions: schedule.startSessions,
      heldRequiredSessions: schedule.heldRequiredSessions,
    }),
  );
  const attended = milestones.reduce((total, milestone) => total + (milestone.attendedRequiredSessions ?? 0), 0);
  const opportunities = milestones.reduce((total, milestone) => total + (milestone.heldRequiredSessions ?? 0), 0);
  return {
    checkIns: evaluateMvpCourseCheckIns(programRowId, track?.slug ?? "", distinctLearnerIds, attendance, schedule.heldRequiredSessions, asOf),
    startedLearnerIds: schedule.startSessions === null ? null : distinctLearnerIds.filter((_, index) => milestones[index].hasStartEvidence),
    started: schedule.startSessions === null ? null : milestones.filter((milestone) => milestone.hasStartEvidence).length,
    attendanceRate: schedule.heldRequiredSessions === null ? null : calculateMvpPercentage(attended, opportunities),
  };
}
