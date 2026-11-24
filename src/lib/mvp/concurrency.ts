// Runs fn over items with at most `limit` calls in flight. Results keep input
// order, so callers that merge them stay deterministic. Independent per-course
// reads used to run one after another; this caps parallelism so a large scope
// does not flood PostgREST.
export const MVP_DB_CONCURRENCY = 6;

export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
