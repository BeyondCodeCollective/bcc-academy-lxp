"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProgramTable } from "./mvp-components/program-table";
import type { MvpDashboardData, MvpFilterOptions, MvpFilters as MvpFilterValues,} from "@/lib/mvp/types";
import { MvpFilters } from "./mvp-components/mvp-filters";
import { SurveyOutcomes } from "./mvp-components/survey-outcomes";
import { ProgramParticipants } from "./mvp-components/program-participants";
import { downloadMvpPageReport } from "@/lib/mvp/page-export";


// Once the data loader is connected, onApplyFilters requests a dashboard
// response using the selected filters. Existing results stay visible meanwhile.
type MvpDashboardProps = {
  data: MvpDashboardData | null;
  onApplyFilters?: (filters: MvpFilterValues) => void;
  isLoading?: boolean;
};

// Default selections include all permitted programs and all available history.
const DEFAULT_FILTERS: MvpFilterValues = {
  programId: null,
  courseSlug: null,
  city: null,
  learnerStatus: "all",
  startDate: null,
  endDate: null,
};

const EMPTY_OPTIONS: MvpFilterOptions = {
  programs: [],
  courses: [],
  cities: [],
};

// Draft selections belong to the controls. Data.appliedFilters describes
// the results currently displayed, so editing controls cannot mislabel results.
export function MvpDashboard({
  data,
  onApplyFilters,
  isLoading = false,
}: MvpDashboardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  isLoading = isLoading || pending;
  const [filters, setFilters] = useState<MvpFilterValues>(
    data?.appliedFilters ?? DEFAULT_FILTERS,
  );

  const options = data?.filterOptions ?? EMPTY_OPTIONS;
  // Headings and KPIs share the applied server response, never draft choices.
  const programName = data?.appliedFilters.programId
    ? options.programs.find(program => program.id === data.appliedFilters.programId)?.name ?? data.scopeLabel
    : null;

  const invalidDateRange = Boolean(
    filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate,
  );

  const canApply =
    data !== null &&
    !invalidDateRange &&
    !isLoading;

  function applyFilters() {
    if (!canApply) return;
    if (onApplyFilters) {
      onApplyFilters({ ...filters });
      return;
    }
    const query = new URLSearchParams({ view: "programs" });
    if (filters.programId) query.set("programId", filters.programId);
    if (filters.courseSlug) query.set("courseSlug", filters.courseSlug);
    if (filters.city) query.set("city", filters.city);
    if (filters.learnerStatus !== "all") query.set("learnerStatus", filters.learnerStatus);
    if (filters.startDate) query.set("startDate", filters.startDate);
    if (filters.endDate) query.set("endDate", filters.endDate);
    startTransition(() => router.push(`/dashboard/admin/mvp?${query}`, { scroll: false }));
  }

  async function downloadPdf() {
    if (!data || isLoading || exporting) return;
    setExporting(true); setExportError(null);
    try { await downloadMvpPageReport("programs", "pdf", data.appliedFilters); }
    catch { setExportError("The report could not be downloaded. Please try again."); }
    finally { setExporting(false); }
  }

  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">

      <div className="min-w-0 space-y-6 lg:col-span-2" aria-busy={isLoading}>

        {data === null ? (
          <section className="rounded-xl border border-rule bg-white p-6">
            <h2 className="text-lg font-semibold text-ink">
              Performance data is being connected
            </h2>

            <p className="mt-2 text-sm text-ink-soft">
              Program participation, completions, and outcomes will appear
              here once the existing LXP data is connected.
            </p>
          </section>
        ) : (
          <section aria-labelledby="mvp-overview-heading">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <h2
                id="mvp-overview-heading"
                className="text-xl font-semibold text-ink"
              >
                {programName ? `${programName} KPIs` : "Program KPIs"}
              </h2>
              <button type="button" onClick={downloadPdf} disabled={exporting || isLoading} className="min-h-11 rounded-full bg-primary px-4 text-sm font-bold text-white disabled:opacity-50">{exporting ? "Preparing PDF…" : "PDF mini-report"}</button>
            </header>
            {exporting && <p role="status" className="mb-3 text-sm text-ink-soft">Preparing PDF for the applied filters…</p>}
            {exportError && <p role="alert" className="mb-3 text-sm text-red-700">{exportError}</p>}

            <dl className="grid gap-4 rounded-2xl border border-primary/15 bg-primary/10 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
              <Metric
                label="Unique learners started"
                value={data.summary.uniqueLearnersStarted}
              />
              <Metric
                label="Learners with a course completion"
                value={data.summary.uniqueLearnersCompleted}
              />
              <Metric
                label="Program participations started"
                value={data.summary.programParticipationsStarted}
              />
              <Metric
                label="Learner/program pairs with a course completion"
                value={data.summary.programParticipationsCompleted}
              />
              <Metric
                label="Upcoming enrollments"
                value={data.summary.upcomingEnrollments}
              />
            </dl>
          </section>
        )}
      </div>
      <aside aria-label="Dashboard filters" className="min-w-0 space-y-4">
        <MvpFilters
          filters={filters}
          options={options}
          onChange={setFilters}
          disabled={data === null || isLoading}
          panelHeading
          actions={<button
          type="button"
          onClick={applyFilters}
          disabled={!canApply}
          aria-describedby={invalidDateRange ? "mvp-filter-help" : undefined}
          className="min-h-11 w-full rounded-lg bg-primary px-5 text-sm font-bold text-white
                     focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-primary
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Applying filters…" : "Apply Filters"}
        </button>}
        />

        {invalidDateRange && <p id="mvp-filter-help" className="text-xs text-ink-soft">Correct the date range before applying filters.</p>}
      </aside>

      {data && <section className="panel w-full min-w-0 p-5 sm:p-6" aria-label="Program performance" aria-busy={isLoading}>
        <ProgramTable programs={data.programs} heading={programName ? `${programName} performance` : "Program performance"} />
      </section>}
      {data && <div className="min-w-0 lg:col-span-2">
        <ProgramParticipants participants={data.participants} programSelected={Boolean(data.appliedFilters.programId)} loading={isLoading} />
      </div>}
      {data && <div className="min-w-0 lg:col-span-2" aria-busy={isLoading}>
        <SurveyOutcomes programs={data.programs} surveyOutcomes={data.surveyOutcomes}
          heading={programName ? `${programName} survey outcomes` : "Program survey outcomes"} />
      </div>}
    </div>
  );
}

// Metric cards preserve the distinction between a real zero and unavailable data.
function Metric({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-xl border border-rule bg-white p-5">
      <dt className="text-sm text-ink-soft">{label}</dt>

      <dd className="mt-2 text-3xl font-semibold tabular-nums text-ink">
        {value === null ? (
          <span aria-label="Not available">—</span>
        ) : (
          new Intl.NumberFormat("en-US").format(value)
        )}
      </dd>
    </div>
  );
}
