"use server";

import { getMvpDashboardData } from "@/lib/mvp/queries";
import { buildMvpOverviewSnapshot } from "@/lib/mvp/overview-snapshot";
import type { MvpFilters } from "@/lib/mvp/types";

// Every load rechecks authorization. Cards retain the accessible organization
// scope; the review list uses applied filters, never unsaved form selections.
export async function refreshMvpOverview(filters?: MvpFilters) {
  const filtered = filters && Object.entries(filters).some(([key, value]) =>
    Boolean(value) && !(key === "learnerStatus" && value === "all"));
  const params = Object.fromEntries(Object.entries(filters ?? {}).filter(([, value]) => value !== null)) as Record<string, string>;
  const [overview, selected] = await Promise.all([
    getMvpDashboardData({}),
    filtered ? getMvpDashboardData(params) : Promise.resolve(null),
  ]);
  const review = selected ?? overview;
  return { ...buildMvpOverviewSnapshot(overview),
    review: { staffReview: review.staffReview, kpiDataReview: review.kpiDataReview } };
}
