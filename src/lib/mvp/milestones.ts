// checks the attendance records into learner starts and attendance rates

// Session identifiers must come from the offering's actual schedule.
// Labels make the supporting evidence readable in the dashboard.
export type MvpSessionSlot = {
  weekNumber: number;
  sessionNumber: number;
  label: string;
};

// These fields match the existing attendance table.
// checked_in_at records when attendance was entered, which may differ
// from the date the session actually took place.
export type MvpAttendanceRecord = {
  id: string;
  student_id: string;
  track: string;
  week_number: number;
  session_number: number;
  checked_in_at: string | null;
};

// The caller supplies authorized learner/course identifiers and the
// verified schedule. Null means schedule information is unavailable.
// An empty array means the schedule is known but has no applicable sessions.
export type MvpAttendanceInput = {
  learnerId: string;
  courseSlug: string;
  records: MvpAttendanceRecord[];
  startSessions: MvpSessionSlot[] | null;
  heldRequiredSessions: MvpSessionSlot[] | null;
};

// Attendance evidence distinguishes missing information from a genuine zero.
// A missing check-in is not automatically a confirmed absence.
export type MvpAttendanceMilestone = {
  hasStartEvidence: boolean | null;
  startEvidenceRecordIds: string[];
  attendedRequiredSessions: number | null;
  heldRequiredSessions: number | null;
  attendanceRate: number | null;
};

// Matching uses both identifiers because a week can contain multiple sessions.
function sessionKey(weekNumber: number, sessionNumber: number): string {
  return `${weekNumber}:${sessionNumber}`;
}

// Derives milestones from attendance already loaded within the user's scope.
// Duplicate records and unrelated learners/courses cannot inflate the result.
export function calculateAttendanceMilestone({
  learnerId,
  courseSlug,
  records,
  startSessions,
  heldRequiredSessions,
}: MvpAttendanceInput): MvpAttendanceMilestone {
  const matchingRecords = records.filter(
    (record) =>
      record.student_id === learnerId &&
      record.track === courseSlug,
  );

  const startKeys =
    startSessions === null
      ? null
      : new Set(
          startSessions.map((session) =>
            sessionKey(session.weekNumber, session.sessionNumber),
          ),
        );

  const startEvidenceRecordIds =
    startKeys === null
      ? []
      : [
          ...new Set(
            matchingRecords
              .filter((record) =>
                startKeys.has(
                  sessionKey(record.week_number, record.session_number),
                ),
              )
              .map((record) => record.id),
          ),
        ];

  // Count only required sessions that have actually been held.
  // Future sessions and optional extras must not affect attendance rates.
  const requiredKeys =
    heldRequiredSessions === null
      ? null
      : new Set(
          heldRequiredSessions.map((session) =>
            sessionKey(session.weekNumber, session.sessionNumber),
          ),
        );

  const attendedKeys = new Set(
    matchingRecords
      .map((record) =>
        sessionKey(record.week_number, record.session_number),
      )
      .filter((key) => requiredKeys?.has(key)),
  );

  const heldCount = requiredKeys?.size ?? null;
  const attendedCount =
    requiredKeys === null ? null : attendedKeys.size;

  const attendanceRate =
    heldCount === null || heldCount === 0 || attendedCount === null
      ? null
      : Math.round((attendedCount / heldCount) * 1000) / 10;

  return {
    hasStartEvidence:
      startKeys === null ? null : startEvidenceRecordIds.length > 0,
    startEvidenceRecordIds,
    attendedRequiredSessions: attendedCount,
    heldRequiredSessions: heldCount,
    attendanceRate,
  };
}