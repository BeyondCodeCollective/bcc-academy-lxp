"use client";

import type { StudentTrackRow } from "./actions";
import { canViewInsights } from "@/lib/roles";
import { isLearner } from "@/lib/analytics/engagement";
import { ProgramAttendanceOverview } from "./program-attendance";
import { type StudentRow, type AdminTrackConfig } from "./admin-shared";
import { AdminTopTabs } from "./admin-top-tabs";

type AttendanceOverviewTabProps = {
  enrollments: StudentTrackRow[];
  isManager: boolean;
  students: StudentRow[];
  tracks: AdminTrackConfig[];
  userRole: string;
};

export function AttendanceOverviewTab({
  enrollments,
  isManager,
  students,
  tracks,
  userRole,
}: AttendanceOverviewTabProps) {
  // A person also counts when enrolled in a staff-cohort course (its learners are staff).
  const staffCohortSlugs = new Set(tracks.filter((t) => t.staffCohort).map((t) => t.slug));
  const staffCohortIds = new Set(
    enrollments.filter((e) => staffCohortSlugs.has(e.track_slug)).map((e) => e.student_id),
  );
  return (
    <div className="space-y-6">
      <AdminTopTabs current="analytics" sub="attendance" showInsights={canViewInsights(userRole)} isManager={isManager} />
      <ProgramAttendanceOverview
        students={students.filter((s) => isLearner(s) || staffCohortIds.has(s.id))}
        // Self-paced (VOD) courses have no sessions to attend — their
        // measure is watched-progress (course → Students → Progress), so
        // an attendance table would only show a misleading zero.
        tracks={tracks.filter((t) => !t.selfPaced)}
        enrollments={enrollments}
      />
    </div>
  );
}
