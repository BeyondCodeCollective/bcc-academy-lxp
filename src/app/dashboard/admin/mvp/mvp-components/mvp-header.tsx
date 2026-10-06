// Displays the titles, reporting period, and data refresh options for the MVP dashboard.

"use client";

// The parent supplies the reporting period and verified refresh information.
// Null means the data has not been refreshed or that information is unavailable.
type MvpHeaderProps = {
  dateRangeLabel: string;
  refreshedAt: string | null;
  refreshedBy?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

// The header gives administrators context for the metrics below.
// The MVP Framework calls for a visible reporting period and refresh details.
export function MvpHeader({
  dateRangeLabel,
  refreshedAt,
  refreshedBy,
  onRefresh,
  isRefreshing = false,
}: MvpHeaderProps) {
  const refreshLabel = formatRefreshTime(refreshedAt);

  return (
    <header className="mb-8 mt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">
            MVP Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-ink">
            Program and Learner Performance
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-ink-soft">
            See who BCC is serving, how programs and learners are progressing,
            and where follow-up is needed.
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-lg border border-rule bg-white px-4 py-2 text-sm font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          >
            {isRefreshing ? "Refreshing…" : "Refresh now"}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
        <p>
          Reporting period:{" "}
          <span className="font-medium text-ink">{dateRangeLabel}</span>
        </p>

        <p role="status" aria-live="polite">
          {refreshLabel ? (
            <>
              Last data refresh:{" "}
              <time dateTime={refreshedAt ?? undefined}>
                {refreshLabel}
              </time>
              {refreshedBy ? ` · Updated by ${refreshedBy}` : ""}
            </>
          ) : (
            "Data refresh information unavailable"
          )}
        </p>
      </div>
    </header>
  );
}

// An explicit timezone keeps the timestamp consistent between the server
// and browser. Missing or invalid timestamps are not presented as fresh data.
function formatRefreshTime(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(date) + " ET";
}