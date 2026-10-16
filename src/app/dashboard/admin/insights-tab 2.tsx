"use client";

import { canViewInsights } from "@/lib/roles";
import { InsightsDashboard } from "./insights/insights-dashboard";
import type { InsightsData } from "./page";
import { AdminTopTabs } from "./admin-top-tabs";

type InsightsTabProps = {
  insightsData: InsightsData | null;
  isManager: boolean;
  userRole: string;
};

export function InsightsTab({
  insightsData,
  isManager,
  userRole,
}: InsightsTabProps) {
  return (
    <div className="space-y-6">
      <AdminTopTabs current="analytics" sub="insights" showInsights={canViewInsights(userRole)} isManager={isManager} />


      {insightsData ? (
        <InsightsDashboard
          sections={insightsData.sections}
          programs={insightsData.programs}
          totalResponses={insightsData.totalResponses}
        />
      ) : canViewInsights(userRole) ? (
        <div className="panel p-8 text-center space-y-2">
          <p className="text-sm font-medium text-ink">
            Analytics didn&apos;t load
          </p>
          <p className="text-sm text-ink-soft">
            Refresh the page. If it still doesn&apos;t load, the survey
            query may have failed — check the Vercel runtime logs for this
            request.
          </p>
        </div>
      ) : (
        <div className="panel p-8 text-center">
          <p className="text-sm text-ink-soft">
            Analytics are only available to admins.
          </p>
        </div>
      )}

    </div>
  );
}
