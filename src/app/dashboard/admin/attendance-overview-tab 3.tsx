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
  return (
    <div className="space-y-6">
      <AdminTopTabs current="analytics" sub="attendance" showInsights={canViewInsights(userRole)} isManager={isManager} />
      <ProgramAttendanceOverview
        students={students.filter(isLearner)}
        // Self-paced (VOD) courses have no sessions to attend — their
        // measure is watched-progress (course → Students → Progress), so
        // an attendance table would only show a misleading zero.
        tracks={tracks.filter((t) => !t.selfPaced)}
        enrollments={enrollments}
      />
    </div>
  );
}
