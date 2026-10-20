"use server";

import { getMvpDashboardData } from "@/lib/mvp/queries";
import { buildMvpOverviewSnapshot } from "@/lib/mvp/overview-snapshot";

// Recheck authentication and program/course grants on every refresh through
// the existing loader. No filters, learner details or demographics are returned.
export async function refreshMvpOverview() {
  return buildMvpOverviewSnapshot(await getMvpDashboardData({}));
}
