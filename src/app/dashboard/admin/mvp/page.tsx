import { redirect } from "next/navigation";
import { MVP_SUPPRESSION_REASON } from "@/lib/mvp/privacy";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canViewMvp } from "@/lib/roles";
import { AdminTopTabs } from "../admin-top-tabs";  
import { MvpDashboard } from "./mvp-dashboard";
import { MvpHeader } from "./mvp-components/mvp-header";
import { getMvpDashboardData } from "@/lib/mvp/queries";
import { MvpOverview } from "./mvp-components/mvp-overview";
import { refreshMvpOverview } from "./overview-actions";
import { WorkspaceLayout } from "./mvp-components/workspace-layout";

export default async function MvpDashboardPage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const context = await getSessionContext();

    // if user isn't signed in, redirect to login page
    if (!context) {
        redirect("/login");
    }

    const role = context?.student?.role ?? "student";

    // Access follows the shared MVP role policy.
    // If the user doesn't have permission, redirect to the dashboard home page.
    if (!canViewMvp(role)) {
        redirect("/dashboard");
    }
    const params = await searchParams;
    // The initial Learners workspace intentionally loads no learner records.
    // Future loaders must enforce program/course scope before reading PII.
    if (params.view === "learners") {
        return <main className="mx-auto w-full max-w-7xl px-6 py-8">
            <AdminTopTabs current="mvp" showInsights isManager />
            <WorkspaceLayout navigation={
                <nav aria-label="MVP workspace" className="space-y-2">
                    <p className="px-3 pb-3 text-xs font-medium uppercase tracking-widest text-ink-soft">Impact workspace</p>
                    <Link href="/dashboard/admin/mvp" className="flex min-h-11 items-center rounded-lg px-3 text-sm text-ink-soft">Overview</Link>
                    <Link href="/dashboard/admin/mvp?view=programs" className="flex min-h-11 items-center rounded-lg px-3 text-sm text-ink-soft">Programs</Link>
                    <Link href="/dashboard/admin/mvp?view=learners" aria-current="page" className="flex min-h-11 items-center rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary">Learners</Link>
                    <span aria-disabled="true" className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm text-ink-soft">Commitments<span className="shrink-0 whitespace-nowrap text-xs">Coming later</span></span>
                </nav>
            }>
                <header className="mb-6">
                    <h1 className="text-2xl font-semibold text-ink">Learners</h1>
                    <p className="mt-2 text-sm text-ink-soft">Understand who our programs serve and where learners connect from.</p>
                </header>
                <section className="panel p-6" aria-labelledby="learner-workspace-status">
                    <h2 id="learner-workspace-status" className="text-xl font-semibold text-ink">Learner workspace in development</h2>
                    <p className="mt-3 text-sm text-ink-soft">Learner data, filters, and geographic summaries are not connected yet. No learner counts or locations are shown in this view.</p>
                </section>
            </WorkspaceLayout>
        </main>;
    }
    const isPrograms = params.view === "programs";
    let loaded: Awaited<ReturnType<typeof getMvpDashboardData>>;
    try {
        loaded = await getMvpDashboardData(params, { includeDemographics: !isPrograms, includeLocations: !isPrograms, includeCohorts: isPrograms,
            includeParticipants: isPrograms && typeof params.programId === "string" && Boolean(params.programId.trim()) });
    } catch (error) {
        if (!(error instanceof Error) || error.message !== MVP_SUPPRESSION_REASON) throw error;
        return <main className="mx-auto max-w-7xl px-6 py-8">
            <AdminTopTabs current="mvp" showInsights isManager />
            <section className="panel mt-6 p-6" role="status">
                <h1 className="text-xl font-semibold">Results withheld for privacy</h1>
                <p className="my-3">{MVP_SUPPRESSION_REASON} Clear the location filter to broaden the selection.</p>
                <Link className="underline" href={isPrograms ? "/dashboard/admin/mvp?view=programs" : "/dashboard/admin/mvp"}>Clear filters</Link>
            </section>
        </main>;
    }
    // The workspace needs aggregates, not learner-level check-in evidence.
    const data = { ...loaded, checkInEvaluations: undefined };
    const overviewSnapshot = isPrograms ? null : await refreshMvpOverview();
    const navigation = new URLSearchParams();
    for (const [key, value] of Object.entries(data.appliedFilters)) {
        if (value && value !== "all") navigation.set(key, value);
    }
    const overviewHref = `/dashboard/admin/mvp?${navigation}`;
    navigation.set("view", "programs");
    const programsHref = `/dashboard/admin/mvp?${navigation}`;
    // Use applied dates, not unsaved filter selections, to describe the results.
    const { startDate, endDate } = data.appliedFilters;
    const dateRangeLabel = startDate && endDate ? `${startDate} through ${endDate}`
        : startDate ? `From ${startDate}` : endDate ? `Through ${endDate}` : "All available history";
    return (
        <main className={`mx-auto w-full px-6 py-8 ${isPrograms ? "max-w-7xl" : "max-w-[1600px]"}`}>
            <AdminTopTabs current="mvp" showInsights isManager/>
            <WorkspaceLayout navigation={
                <nav aria-label="MVP workspace" className="space-y-2">
                    <p className="px-3 pb-3 text-xs font-medium uppercase tracking-widest text-ink-soft">Impact workspace</p>
                    <Link href={overviewHref} aria-current={!isPrograms ? "page" : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${!isPrograms ? "bg-primary/10 font-semibold text-primary" : "text-ink-soft"}`}>Overview</Link>
                    <Link href={programsHref} aria-current={isPrograms ? "page" : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${isPrograms ? "bg-primary/10 font-semibold text-primary" : "text-ink-soft"}`}>Programs</Link>
                    <Link href="/dashboard/admin/mvp?view=learners" className="flex min-h-11 items-center rounded-lg px-3 text-sm text-ink-soft">Learners</Link>
                    <span aria-disabled="true" className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm text-ink-soft">Commitments<span className="shrink-0 whitespace-nowrap text-xs">Coming later</span></span>
                </nav>
            }>
                    {isPrograms ? <><MvpHeader dateRangeLabel={dateRangeLabel} freshness={data.freshness} /><MvpDashboard key={JSON.stringify(data.appliedFilters)} data={data} /></>
                        : overviewSnapshot && <MvpOverview key={context.userId} data={data} initialSnapshot={overviewSnapshot} />}
            </WorkspaceLayout>
        </main>
    );
}
