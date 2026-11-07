"use server";

import { getSessionContext } from "@/lib/auth/session";
import { getMvpLearnersData } from "@/lib/mvp/learner-queries";
import type { LearnerQueryParams } from "@/lib/mvp/learner-roster";
import { requireCurrentMvpLearnerAccess } from "@/lib/mvp/learner-request-access";

export async function searchMvpLearners(params: LearnerQueryParams) {
  try {
    // Match the page restriction even for a direct action invocation. The loader
    // independently rechecks role, preview mode, and all program/course grants.
    const context = await getSessionContext();
    if (!context?.userId || context.student?.role !== "super_admin") throw new Error("Access denied");
    await requireCurrentMvpLearnerAccess();
    const result = await getMvpLearnersData(params);
    return { ok: true as const, pagination: result.pagination,
      summary: { totalEnrolled: result.summary.totalEnrolled, sessionsHeld: result.summary.sessionsHeld,
        needsCheckIn: result.summary.needsCheckIn,
        sessionsHeldUnavailableReason: result.summary.sessionsHeldUnavailableReason, asOf: result.summary.asOf },
      directory: result.directory.map(learner => ({
      id: learner.id, firstName: learner.firstName, lastName: learner.lastName, email: learner.email,
      enrollments: learner.enrollments.map(e => ({ programId: e.programId, programName: e.programName,
        courseSlug: e.courseSlug, courseName: e.courseName, cohort: e.cohort, attendance: e.attendance,
        attendanceUnavailableReason: e.attendanceUnavailableReason,
        weeklyMilestones: e.weeklyMilestones?.map(week => ({ weekNumber: week.weekNumber,
          submission: { at: week.submission.at, state: week.submission.state },
          reflection: { at: week.reflection.at, state: week.reflection.state },
          markedWatched: { at: week.markedWatched.at, state: week.markedWatched.state },
        })),
        caughtUp: e.caughtUp, lastActivity: e.lastActivity, status: e.status })),
    })) };
  } catch {
    return { ok: false as const, message: "Unable to load learners. Check your access and filters, then try again." };
  }
}
