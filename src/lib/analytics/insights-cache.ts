import { fetchAllInsightsData } from "@/lib/insights-data";
import { fetchOutcomesData } from "@/lib/analytics/outcomes";
import { fetchProgressData } from "@/lib/analytics/progress";
import { fetchAcquisitionData } from "@/lib/analytics/acquisition";
import type { ProgramScope } from "@/lib/programs/scope";

// Cross-request TTL cache for the Analytics page's full data bundle (~20
// Supabase round trips). The page is force-dynamic (program comes from a
// cookie/header, not the URL), so Next can't cache the render — but the
// underlying numbers move on a human timescale, and only staff see this page.
// A 60s module-level memo makes warm repeat loads skip the database entirely;
// Fluid Compute reuses function instances, so the map survives across requests.
const TTL_MS = 60_000;

type Bundle = {
  insights: Awaited<ReturnType<typeof fetchAllInsightsData>>;
  outcomes: Awaited<ReturnType<typeof fetchOutcomesData>>;
  progress: Awaited<ReturnType<typeof fetchProgressData>>;
  acquisition: Awaited<ReturnType<typeof fetchAcquisitionData>>;
};

const bundleCache = new Map<string, { at: number; promise: Promise<Bundle> }>();

export async function getInsightsBundle(scope: ProgramScope): Promise<Bundle> {
  const key = [...scope.ids].sort().join(",");
  const hit = bundleCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;

  const promise = (async () => {
    const [insights, outcomes, progress, acquisition] = await Promise.all([
      fetchAllInsightsData(scope),
      fetchOutcomesData(scope),
      fetchProgressData(scope),
      fetchAcquisitionData(scope),
    ]);
    return { insights, outcomes, progress, acquisition };
  })();
  // Cache the promise (not the value) so concurrent requests share one flight;
  // drop it on failure so an error isn't served for the next minute.
  bundleCache.set(key, { at: Date.now(), promise });
  promise.catch(() => bundleCache.delete(key));
  return promise;
}
