"use client";

import { useEffect, useState } from "react";
import type { searchMvpLearners } from "../learner-actions";
import { LearnerDirectory, type DirectorySorting } from "./learner-directory";
import type { LearnerFilters } from "./learner-filters";

export function LearnerRequestState({ state, onRetry }: { state: "loading" | "error"; onRetry: () => void }) {
  return <section className="panel mt-6 p-6" aria-label="Learner directory" aria-busy={state === "loading"}>
    {state === "loading" ? <div role="status" aria-live="polite">
      <h2 className="text-xl font-semibold text-ink">Loading learners…</h2>
      <p className="mt-2 text-sm text-ink-soft">Updating results for your current search, filters, and page.</p>
    </div> : <>
      <div role="alert">
        <h2 className="text-xl font-semibold text-ink">Unable to load learners</h2>
        <p className="mt-2 text-sm text-ink-soft">Results and matching counts are unavailable. Check your connection and access, then try again.</p>
      </div>
      <button type="button" className="mt-4 min-h-11 rounded-lg border border-rule px-4 py-2 text-sm font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={onRetry}>Retry loading learners</button>
    </>}
  </section>;
}

// Parent keys this component by applied filters, clearing rows and drawer state
// immediately. Cleanup prevents a late response from replacing a newer request.
export function ConnectedLearnerDirectory({ filters, searchAction }: { filters: LearnerFilters; searchAction: typeof searchMvpLearners }) {
  const [paging, setPaging] = useState({ page: 1, pageSize: 25 });
  const [sorting, setSorting] = useState<DirectorySorting>({ sortBy: "name", sortOrder: "asc" });
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([filters, paging, sorting, retry]);
  const [response, setResponse] = useState<{ key: string; result: Awaited<ReturnType<typeof searchMvpLearners>> } | null>(null);
  useEffect(() => {
    let active = true;
    const [query, page, sort] = JSON.parse(requestKey) as [LearnerFilters, typeof paging, DirectorySorting, number];
    void searchAction({ ...query, ...sort, page: String(page.page), pageSize: String(page.pageSize) })
      .then(result => { if (active) setResponse({ key: requestKey, result }); })
      .catch(() => { if (active) setResponse({ key: requestKey, result: { ok: false, message: "Unable to load learners. Please try again." } }); });
    return () => { active = false; };
  }, [requestKey, searchAction]);
  const result = response?.key === requestKey ? response.result : null;
  // Do not display error payloads or stale rows/counts. Retry preserves the
  // current request and changes its key, immediately returning to loading.
  if (!result || !result.ok) return <LearnerRequestState state={result ? "error" : "loading"} onRetry={() => setRetry(value => value + 1)} />;
  return <LearnerDirectory key={requestKey} filters={filters} learners={result.directory}
    sorting={sorting} onSortChange={value => { setSorting(value); setPaging(current => ({ ...current, page: 1 })); }}
    serverPagination={result.pagination} onPageChange={(page, pageSize) => setPaging({ page, pageSize })} />;
}
