"use client";

import { useEffect, useState } from "react";
import type { searchMvpLearners } from "../learner-actions";
import { LearnerDirectory } from "./learner-directory";
import type { LearnerFilters } from "./learner-filters";

// Parent keys this component by applied filters, clearing rows and drawer state
// immediately. Cleanup prevents a late response from replacing a newer request.
export function ConnectedLearnerDirectory({ filters, searchAction }: { filters: LearnerFilters; searchAction: typeof searchMvpLearners }) {
  const [paging, setPaging] = useState({ page: 1, pageSize: 25 });
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([filters, paging, retry]);
  const [response, setResponse] = useState<{ key: string; result: Awaited<ReturnType<typeof searchMvpLearners>> } | null>(null);
  useEffect(() => {
    let active = true;
    const [query, page] = JSON.parse(requestKey) as [LearnerFilters, typeof paging, number];
    void searchAction({ ...query, page: String(page.page), pageSize: String(page.pageSize) })
      .then(result => { if (active) setResponse({ key: requestKey, result }); })
      .catch(() => { if (active) setResponse({ key: requestKey, result: { ok: false, message: "Unable to load learners. Please try again." } }); });
    return () => { active = false; };
  }, [requestKey, searchAction]);
  const result = response?.key === requestKey ? response.result : null;
  if (!result) return <p role="status" className="panel mt-6 p-6">Loading learners…</p>;
  if (!result.ok) return <section className="panel mt-6 p-6"><p role="alert">{result.message}</p>
    <button type="button" className="mt-3 min-h-11 underline" onClick={() => setRetry(value => value + 1)}>Retry</button></section>;
  return <LearnerDirectory key={requestKey} filters={filters} learners={result.directory}
    serverPagination={result.pagination} onPageChange={(page, pageSize) => setPaging({ page, pageSize })} />;
}
