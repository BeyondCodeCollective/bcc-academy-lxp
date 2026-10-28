export function parseLearnerPagination(params: { page?: string | string[]; pageSize?: string | string[] }) {
  function integer(value: unknown, fallback: number) {
    if (value === undefined || value === "") return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error("Invalid learner pagination.");
    return Number(value);
  }
  const page = integer(params.page, 1);
  const pageSize = integer(params.pageSize, 25);
  if (![10, 25, 50].includes(pageSize)) throw new Error("Choose 10, 25, or 50 learners per page.");
  return { page, pageSize };
}

// Input is the complete authorized, filtered, deduplicated and sorted roster.
// Do not call this on individual enrollment batches or database response pages.
export function paginateLearners<T>(learners: T[], requested: ReturnType<typeof parseLearnerPagination>) {
  const totalMatching = learners.length;
  const totalPages = Math.max(1, Math.ceil(totalMatching / requested.pageSize));
  const page = Math.min(requested.page, totalPages);
  const offset = (page - 1) * requested.pageSize;
  return {
    directory: learners.slice(offset, offset + requested.pageSize),
    pagination: { page, pageSize: requested.pageSize, totalMatching, totalPages,
      start: totalMatching ? offset + 1 : 0, end: Math.min(offset + requested.pageSize, totalMatching),
      hasPrevious: page > 1, hasNext: page < totalPages },
  };
}
