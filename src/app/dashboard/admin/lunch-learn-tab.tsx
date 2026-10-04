"use client";

import { BackLink } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { LunchLearnAdmin } from "@/app/dashboard/lunch-learn/admin/admin-client";

type LunchLearnTabProps = {
  lunchLearnRecordings: { id: string; title: string; presenter: string; recording_url: string; description: string | null; recorded_at: string; }[];
};

export function LunchLearnTab({
  lunchLearnRecordings,
}: LunchLearnTabProps) {
  return (
    <div className="space-y-6">
      <BackLink href="/dashboard/admin" label="Admin" />
      <PageHeader
        title="Lunch & Learns"
        subtitle={`${lunchLearnRecordings.length} recording${lunchLearnRecordings.length === 1 ? "" : "s"} for internal staff`}
      />
      <LunchLearnAdmin recordings={lunchLearnRecordings} embedded />
    </div>
  );
}
