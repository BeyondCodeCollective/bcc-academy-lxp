"use client";

import { canViewInsights } from "@/lib/roles";
import { CoursesDashboard } from "./courses-dashboard";
import type { CoursesAnalytics } from "./actions-courses";
import { AdminTopTabs } from "./admin-top-tabs";

type CourseProgressTabProps = {
  coursesData: CoursesAnalytics | null;
  isManager: boolean;
  userRole: string;
};

export function CourseProgressTab({
  coursesData,
  isManager,
  userRole,
}: CourseProgressTabProps) {
  return (
    <div className="space-y-6">
      <AdminTopTabs current="analytics" sub="course-progress" showInsights={canViewInsights(userRole)} isManager={isManager} />
      {coursesData ? (
        <CoursesDashboard data={coursesData} />
      ) : (
        <p className="text-sm text-ink-faint">No course analytics available for this program.</p>
      )}
    </div>
  );
}
