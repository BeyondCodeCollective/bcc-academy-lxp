import { redirect } from "next/navigation";
import { MVP_SUPPRESSION_REASON } from "@/lib/mvp/privacy";
import Link from "next/link";
import { LinkPending } from "@/components/link-pending";
import { getSessionContext } from "@/lib/auth/session";
import { canViewMvp } from "@/lib/roles";
import { AdminTopTabs } from "../admin-top-tabs";  
import { MvpDashboard } from "./mvp-dashboard";
import { MvpHeader } from "./mvp-components/mvp-header";
import { getMvpDashboardData } from "@/lib/mvp/queries";
import { MvpOverview } from "./mvp-components/mvp-overview";
import { refreshMvpOverview } from "./overview-actions";
import { WorkspaceLayout } from "./mvp-components/workspace-layout";
import { LearnerFilterBar } from "./mvp-components/learner-filters";
import { getMvpLearnerFilterOptions } from "@/lib/mvp/learner-queries";
import { searchMvpLearners } from "./learner-actions";
import { CommitmentSummary } from "./mvp-components/commitment-summary";
import { CommitmentGroups } from "./mvp-components/commitment-groups";

export default async function MvpDashboardPage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const context = await getSessionContext();

    // if user isn't signed in, redirect to login page
    if (!context) {
        redirect("/login");
    }

    const role = context?.student?.role ?? "student";

    const params = await searchParams;
    const isCommitments = params.view === "commitments";
    // Commitments supports admins and super-admins. Other MVP views retain
    // their existing super-admin restriction during development.
    const allowedRole = role === "super_admin" || (isCommitments && role === "admin");
    if (!canViewMvp(role) || !allowedRole) {
        redirect("/dashboard");
    }
    // Options are authorized independently; other pages' URL filters are not
    // inherited. Learners owns its local search/filter state and server requests.
    // The Commitments shell loads no records.
    if (params.view === "learners" || isCommitments) {
        let options: Awaited<ReturnType<typeof getMvpLearnerFilterOptions>> | undefined;
        try {
            options = isCommitments ? undefined : await getMvpLearnerFilterOptions();
        } catch {
            // Do not serialize database errors or inaccessible option details.
            options = undefined;
        }
        return <main className="mx-auto w-full max-w-7xl px-6 py-8">
            <AdminTopTabs current="mvp" showInsights isManager showMvp={role === "super_admin"} />
            <WorkspaceLayout navigation={
                <nav aria-label="MVP workspace" className="flex w-max gap-1 rounded-xl border border-rule bg-white p-1">
                    <Link href="/dashboard/admin/mvp" className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm text-ink-soft">Overview<LinkPending /></Link>
                    <Link href="/dashboard/admin/mvp?view=programs" className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm text-ink-soft">Programs<LinkPending /></Link>
                    <Link href="/dashboard/admin/mvp?view=learners" aria-current={!isCommitments ? "page" : undefined} className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm ${!isCommitments ? "bg-primary/10 font-semibold text-primary" : "text-ink-soft"}`}>Learners<LinkPending /></Link>
                    <Link href="/dashboard/admin/mvp?view=commitments" aria-current={isCommitments ? "page" : undefined} className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm ${isCommitments ? "bg-primary/10 font-semibold text-primary" : "text-ink-soft"}`}>Commitments<LinkPending /></Link>
                </nav>
            }>
                <header className="mb-6">
                    <h1 className="text-2xl font-semibold text-ink">{isCommitments ? "Commitments" : "Learners"}</h1>
                    <p className="mt-2 text-sm text-ink-soft">{isCommitments ? "Track what we promised funders and partners, with the evidence behind each result." : "Find learners and explore recorded course activity across your accessible programs."}</p>
                </header>
                {isCommitments ? <><CommitmentSummary /><CommitmentGroups /></> : <>{!options && <p role="alert" className="mb-4 text-sm text-ink">Unable to load authorized learner filters. Check your access and <Link href="/dashboard/admin/mvp?view=learners" className="underline">reload Learners</Link>.</p>}
                <LearnerFilterBar options={options} searchAction={options ? searchMvpLearners : undefined} /></>}
            </WorkspaceLayout>
        </main>;
    }
    const isPrograms = params.view === "programs";
    // The unfiltered overview snapshot does not depend on the filtered load, so
    // start it now instead of after. A failure still surfaces where it is awaited.
    const overviewPromise = isPrograms ? Promise.resolve(null) : refreshMvpOverview();
    overviewPromise.catch(() => {});
    let loaded: Awaited<ReturnType<typeof getMvpDashboardData>>;
    try {
        loaded = await getMvpDashboardData(params, { includeDemographics: !isPrograms, includeLocations: !isPrograms, includeCohorts: isPrograms,
            includeParticipants: isPrograms && typeof params.programId === "string" && Boolean(params.programId.trim()) });
    } catch (error) {
        if (!(error instanceof Error) || error.message !== MVP_SUPPRESSION_REASON) throw error;
        return <main className="mx-auto max-w-7xl px-6 py-8">
            <AdminTopTabs current="mvp" showInsights isManager showMvp={role === "super_admin"} />
            <section className="panel mt-6 p-6" role="status">
                <h1 className="text-xl font-semibold">Results withheld for privacy</h1>
                <p className="my-3">{MVP_SUPPRESSION_REASON} Clear the location filter to broaden the selection.</p>
                <Link className="underline" href={isPrograms ? "/dashboard/admin/mvp?view=programs" : "/dashboard/admin/mvp"}>Clear filters</Link>
            </section>
        </main>;
    }
    // The workspace needs aggregates, not learner-level check-in evidence.
    const data = { ...loaded, checkInEvaluations: undefined };
    const overviewSnapshot = await overviewPromise;
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
            <AdminTopTabs current="mvp" showInsights isManager showMvp={role === "super_admin"}/>
            <WorkspaceLayout navigation={
                <nav aria-label="MVP workspace" className="flex w-max gap-1 rounded-xl border border-rule bg-white p-1">
                    <Link href={overviewHref} aria-current={!isPrograms ? "page" : undefined} className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm ${!isPrograms ? "bg-primary/10 font-semibold text-primary" : "text-ink-soft"}`}>Overview<LinkPending /></Link>
                    <Link href={programsHref} aria-current={isPrograms ? "page" : undefined} className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm ${isPrograms ? "bg-primary/10 font-semibold text-primary" : "text-ink-soft"}`}>Programs<LinkPending /></Link>
                    <Link href="/dashboard/admin/mvp?view=learners" className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm text-ink-soft">Learners<LinkPending /></Link>
                    <Link href="/dashboard/admin/mvp?view=commitments" className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm text-ink-soft">Commitments<LinkPending /></Link>
                </nav>
            }>
                    {isPrograms ? <><MvpHeader dateRangeLabel={dateRangeLabel} freshness={data.freshness} /><MvpDashboard key={JSON.stringify(data.appliedFilters)} data={data} /></>
                        : overviewSnapshot && <MvpOverview key={context.userId} data={data} initialSnapshot={overviewSnapshot} />}
            </WorkspaceLayout>
        </main>
    );
}