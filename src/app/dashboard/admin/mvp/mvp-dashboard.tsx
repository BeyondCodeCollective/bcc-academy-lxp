"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProgramTable } from "./mvp-components/program-table";
import type { MvpDashboardData, MvpFilterOptions, MvpFilters as MvpFilterValues,} from "@/lib/mvp/types";
import { MvpFilters } from "./mvp-components/mvp-filters";
import { SurveyOutcomes } from "./mvp-components/survey-outcomes";


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

const LEARNER_LABELS: Record<MvpFilterValues["learnerStatus"], string> = {
  all: "All learner statuses",
  enrolled: "Enrolled before start",
  started: "Started",
  active: "Active",
  completed: "Completed",
  needs_check_in: "Needs a check-in",
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
  isLoading = isLoading || pending;
  const [filters, setFilters] = useState<MvpFilterValues>(
    data?.appliedFilters ?? DEFAULT_FILTERS,
  );

  const options = data?.filterOptions ?? EMPTY_OPTIONS;

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
    const query = new URLSearchParams();
    if (filters.programId) query.set("programId", filters.programId);
    if (filters.courseSlug) query.set("courseSlug", filters.courseSlug);
    if (filters.city) query.set("city", filters.city);
    startTransition(() => router.push(`/dashboard/admin/mvp?${query}`, { scroll: false }));
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside aria-label="Dashboard filters" className="space-y-4">
        <MvpFilters
          filters={filters}
          options={options}
          onChange={setFilters}
          disabled={data === null || isLoading}
          programOnly
        />

        <button
          type="button"
          onClick={applyFilters}
          disabled={!canApply}
          aria-describedby="mvp-filter-help"
          className="w-full rounded-lg border border-rule bg-white px-4 py-2
                     text-sm font-medium text-ink hover:bg-gray-50
                     focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-primary
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Applying filters…" : "Apply filters"}
        </button>

        <p id="mvp-filter-help" className="text-xs text-ink-soft">
          {invalidDateRange
            ? "Correct the date range before applying filters."
            : !data
              ? "Filtering will be available when dashboard data is connected."
              : "Choose your filters, then apply them to update the results."}
        </p>
        <p className="text-xs text-ink-soft">Program, course, and learner location filters are connected. Learner status and reporting dates are coming next.</p>
      </aside>

      <div className="min-w-0 space-y-6" aria-busy={isLoading}>
        <section
          aria-label="Selected filters"
          className="rounded-xl border border-rule bg-white p-5"
        >
          <p className="text-sm font-semibold text-ink">Selected filters</p>

          <p className="mt-2 text-sm text-ink-soft">
            {describeFilters(filters, options)}
          </p>
        </section>

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
            <header className="mb-4">
              <h2
                id="mvp-overview-heading"
                className="text-xl font-semibold text-ink"
              >
                {data.scopeLabel}
              </h2>

              <p className="mt-2 text-sm text-ink-soft">
                Showing: {describeFilters(data.appliedFilters, options)}
              </p>

              <p className="mt-2 text-xs text-ink-soft">
                Started and completed totals overlap; do not add them
                together.
              </p>
            </header>

            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            <div className="mt-8 space-y-3">
              {data.metricDefinitions.map((metric) => (
                <p key={metric.key} className="text-sm text-ink-soft">{metric.definition}</p>
              ))}
              <ProgramTable programs={data.programs} />
            </div>
            <SurveyOutcomes programs={data.programs} surveyOutcomes={data.surveyOutcomes} />
          </section>
        )}
      </div>
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

// Scope descriptions use readable labels instead of internal IDs.
// Course lookup includes its program so repeated slugs remain unambiguous.
function describeFilters(
  filters: MvpFilterValues,
  options: MvpFilterOptions,
): string {
  const program = filters.programId
    ? options.programs.find((item) => item.id === filters.programId)?.name ??
      "Selected program"
    : "All accessible programs";

  const course = filters.courseSlug
    ? options.courses.find(
        (item) =>
          item.slug === filters.courseSlug &&
          item.programId === filters.programId,
      )?.name ?? "Selected course"
    : "All courses";

  let dates = "All available history";

  if (filters.startDate && filters.endDate) {
    dates = `${filters.startDate} through ${filters.endDate}`;
  } else if (filters.startDate) {
    dates = `From ${filters.startDate}`;
  } else if (filters.endDate) {
    dates = `Through ${filters.endDate}`;
  }

  return [
    program,
    course,
    filters.city ? `Learner location: ${filters.city}` : "All learner locations (including missing)",
    LEARNER_LABELS[filters.learnerStatus],
    dates,
  ].join(" · ");
}
