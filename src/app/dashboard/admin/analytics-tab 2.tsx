"use client";

import { canViewInsights } from "@/lib/roles";
import { AnalyticsDashboard } from "./analytics-dashboard";
import type { EngagementAnalytics } from "./actions-analytics";
import { AdminTopTabs } from "./admin-top-tabs";

type AnalyticsTabProps = {
  analyticsCourse: string | undefined;
  analyticsData: EngagementAnalytics | null;
  isManager: boolean;
  userRole: string;
};

export function AnalyticsTab({
  analyticsCourse,
  analyticsData,
  isManager,
  userRole,
}: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      <AdminTopTabs current="analytics" sub="analytics" showInsights={canViewInsights(userRole)} isManager={isManager} />
      {analyticsData ? (
        <AnalyticsDashboard data={analyticsData} course={analyticsCourse} />
      ) : (
        <p className="text-sm text-ink-faint">No analytics available for this program.</p>
      )}
    </div>
  );
}
