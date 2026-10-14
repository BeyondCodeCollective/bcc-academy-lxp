"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MvpDashboardData } from "@/lib/mvp/types";
import { MvpFilters } from "./mvp-filters";
import { ProgramTable } from "./program-table";
import { OverviewParticipation } from "./overview-participation";
import { OverviewStaffReview } from "./overview-staff-review";
import type { MvpOverviewSnapshot } from "@/lib/mvp/overview-snapshot";
import { refreshMvpOverview } from "../overview-actions";

// Overview consumes authorized aggregates only. Unknown values are never zero
// and course-level counts are never presented as distinct organization totals.
export function MvpOverview({ data, initialSnapshot }: { data: MvpDashboardData; initialSnapshot: MvpOverviewSnapshot }) {
  const router = useRouter();
  const [filters, setFilters] = useState(data.appliedFilters);
  const appliedKey = JSON.stringify(data.appliedFilters);
  const [previousAppliedKey, setPreviousAppliedKey] = useState(appliedKey);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [refreshing, refreshTransition] = useTransition();
  // Navigation resets draft controls but leaves the top-card snapshot intact.
  if (previousAppliedKey !== appliedKey) {
    setPreviousAppliedKey(appliedKey);
    setFilters(data.appliedFilters);
  }
  const [pending, transition] = useTransition();
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invalidDates = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate);
  function refresh() {
    setError(null);
    refreshTransition(async () => {
      try {
        setSnapshot(await refreshMvpOverview());
        router.refresh();
      } catch {
        setError("Could not refresh the overview. The previous totals are still displayed.");
      }
    });
  }

  function apply() {
    if (invalidDates) return;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value && value !== "all") query.set(key, value);
    transition(() => router.push(`/dashboard/admin/mvp?${query}`, { scroll: false }));
  }

  // Downloads use applied (not draft) filters and the existing authenticated
  // endpoint. Demographics are deliberately not included in export selections.
  async function download(format: "csv" | "pdf") {
    setExporting(format); setError(null);
    try {
      const response = await fetch("/api/mvp/export", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, filters: data.appliedFilters,
          selection: { metricKeys: ["totalParticipants", "started", "completed", "active", "sessionsRemaining"], outcomes: true } }) });
      if (!response.ok) throw new Error("The report could not be downloaded. Please try again.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `mvp-overview.${format}`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("The report could not be downloaded. Please try again."); }
    finally { setExporting(null); }
  }

  return <div className="min-w-0 space-y-6 break-words [&_button]:font-bold" aria-busy={pending}>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-medium uppercase tracking-widest text-ink-soft">{snapshot.scopeLabel}</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Impact overview</h1>
        <p className="mt-2 text-sm text-ink-soft">A shared view of participation, program performance, and learner outcomes.</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={refresh} disabled={pending || refreshing || exporting !== null} className="min-h-11 rounded-full border border-rule bg-[#E5F701] px-4 text-sm font-bold text-primary disabled:opacity-50">{refreshing ? "Refreshing…" : "Refresh now"}</button>
        <button disabled={exporting !== null || pending} onClick={() => download("csv")} className="min-h-11 rounded-full bg-primary px-4 text-sm font-bold text-white disabled:opacity-50">Export CSV</button>
        <button disabled={exporting !== null || pending} onClick={() => download("pdf")} className="min-h-11 rounded-full bg-primary px-4 text-sm font-bold text-white disabled:opacity-50">PDF mini-report</button>
      </div>
    </header>
    <p className="text-xs text-ink-soft">Last Refreshed: <time dateTime={snapshot.fetchedAt}>{new Date(snapshot.fetchedAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET</time></p>
    {exporting && <p role="status" className="text-sm text-ink-soft">Preparing {exporting.toUpperCase()} report…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <dl className="grid gap-4 md:grid-cols-3">
      <Stat label="Unique learners started" value={snapshot.summary.uniqueLearnersStarted} prominent />
      <Stat label="Program participations started" value={snapshot.summary.programParticipationsStarted} prominent />
      <div className="rounded-lg border border-rule bg-white p-5 text-black"><dt className="text-sm text-primary-hover">Course portfolio</dt><dd className="mt-3 text-center text-4xl font-semibold tabular-nums text-black">{snapshot.portfolio}</dd>
        <p className="mt-3 text-center text-xs">{snapshot.active} active · {snapshot.upcoming} starting soon · {snapshot.unknown} status unavailable</p></div>
    </dl>
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Upcoming enrollments" value={snapshot.summary.upcomingEnrollments} />
      <Stat label="Learners with a course completion" value={snapshot.summary.uniqueLearnersCompleted} />
      <Stat label="Learner/program pairs with a completion" value={snapshot.summary.programParticipationsCompleted} />
      <Stat label="Courses with verified check-in flags" value={snapshot.flaggedCourses} />
    </dl>
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <OverviewStaffReview data={data.staffReview} />
      <OverviewParticipation data={data.overviewParticipation} />
    </div>
    {/* Keep filters and performance together within the main content column. */}
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
    <section aria-label="Overview filters" className="min-w-0 space-y-3">
      <MvpFilters filters={filters} options={data.filterOptions} onChange={setFilters} disabled={pending} panelHeading
        actions={<button type="button" onClick={apply} disabled={pending || invalidDates} className="min-h-11 w-full rounded-lg bg-primary px-5 text-sm font-bold text-white disabled:opacity-50">Apply Filters</button>} />
      {invalidDates && <p role="alert" className="text-sm text-red-700">Start date must not follow end date.</p>}
      <p className="text-xs text-ink-soft">Applied program dates: {data.appliedFilters.startDate ?? "No start limit"} – {data.appliedFilters.endDate ?? "No end limit"}. Current-roster results across selected offerings.</p>
    </section>
    <section className="panel w-full min-w-0 p-5 sm:p-6" aria-label="Program performance"><ProgramTable programs={data.programs} /></section>
    </div>
    <div className="grid w-full min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="panel p-6"><h2 className="text-xl font-semibold">Who we serve</h2><p className="mt-2 text-sm text-ink-soft">Current age and self-reported household income. Internal use only.</p>
        <div className="mt-6 grid gap-8 md:grid-cols-2">{data.demographics?.map(group => <Distribution key={group.id} label={group.label} groups={[...group.groups, { label: "Unknown / not reported", count: group.missingCount }]} />)}</div>
        {!data.demographics?.length && <p className="mt-4 text-sm text-ink-soft">Demographic summaries unavailable.</p>}
      </section>
      <section className="panel p-6"><h2 className="text-xl font-semibold">Reported learner locations</h2><p className="mt-2 text-sm text-ink-soft">Self-reported profile locations, not verified cities.</p>
        <div className="mt-6">{data.locations ? <Distribution label="Current learners" groups={[...data.locations.groups, { label: "Unknown / conflicting", count: data.locations.missingLocationLearners }]} /> : <p className="text-sm text-ink-soft">Location summary unavailable.</p>}</div>
      </section>
    </div>
  </div>;
}

// Shared display helpers preserve zero and make chart denominators explicit.
function display(value: number | null | undefined) { return value == null || !Number.isFinite(value) ? "Unavailable" : value.toLocaleString("en-US"); }
function Stat({ label, value, prominent = false }: { label: string; value: number | null; prominent?: boolean }) {
  return <div className="rounded-lg border border-rule bg-white p-5 text-black"><dt className="text-sm text-primary-hover">{label}</dt>
    <dd className={`mt-3 text-center font-semibold tabular-nums text-black ${value === null ? "text-xl" : prominent ? "text-4xl" : "text-3xl"}`}>{display(value)}</dd></div>;
}
function Distribution({ label, groups }: { label: string; groups: { label: string; count: number | null }[] }) {
  const total = groups.some(group => group.count === null) ? null : groups.reduce((sum, group) => sum + (group.count ?? 0), 0);
  return <div><h3 className="text-sm font-medium">{label}</h3><p className="mt-1 text-xs text-ink-soft">{total === null ? "Total unavailable" : `${total} learners, including unknowns`}</p>
    <ul className="mt-4 space-y-3">{groups.map(group => <li key={group.label} className="space-y-1"><div className="flex justify-between gap-3 text-xs"><span>{group.label}</span><span className="tabular-nums">{display(group.count)}</span></div>
      {total !== null && <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-primary" style={{ width: `${total && group.count !== null ? group.count / total * 100 : 0}%` }} /></div>}
    </li>)}</ul></div>;
}
