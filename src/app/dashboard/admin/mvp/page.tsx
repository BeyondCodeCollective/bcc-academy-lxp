import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canViewMvp } from "@/lib/roles";
import { AdminTopTabs } from "../admin-top-tabs";  
import { MvpDashboard } from "./mvp-dashboard";
import { MvpHeader } from "./mvp-components/mvp-header";
import { getMvpDashboardData } from "@/lib/mvp/queries";
import { MvpOverview } from "./mvp-components/mvp-overview";
import { refreshMvpOverview } from "./overview-actions";

export default async function MvpDashboardPage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const context = await getSessionContext();

    // if user isn't signed in, redirect to login page
    if (!context) {
        redirect("/login");
    }

    const role = context?.student?.role ?? "student";

    // Temporary while the dashboard is being built: only super-admins may open it.
    // The mvp_performance capability and program grants stay intact for launch.
    // If the user doesn't have permission, redirect to the dashboard home page.
    if (role !== "super_admin" || !canViewMvp(role)) {
        redirect("/dashboard");
    }
    const params = await searchParams;
    const isPrograms = params.view === "programs";
    const loaded = await getMvpDashboardData(params, { includeDemographics: !isPrograms, includeLocations: !isPrograms, includeCohorts: isPrograms });
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
            <div className={`mt-8 grid items-start gap-6 lg:grid-cols-[180px_minmax(0,1fr)] ${isPrograms ? "" : "lg:gap-8"}`}>
                <div className={isPrograms ? "lg:sticky lg:top-6" : "min-w-0"}>
                <nav aria-label="MVP workspace" className="space-y-2">
                    <p className="px-3 pb-3 text-xs font-medium uppercase tracking-widest text-ink-soft">Impact workspace</p>
                    <Link href={overviewHref} aria-current={!isPrograms ? "page" : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${!isPrograms ? "bg-primary/10 font-semibold text-primary" : "text-ink-soft"}`}>Overview</Link>
                    <Link href={programsHref} aria-current={isPrograms ? "page" : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${isPrograms ? "bg-primary/10 font-semibold text-primary" : "text-ink-soft"}`}>Programs</Link>
                    {["Learners", "Reports"].map(label => <span key={label} aria-disabled="true" className="flex min-h-11 items-center justify-between gap-2 px-3 text-sm text-ink-soft">{label}<span className="text-xs">Coming later</span></span>)}
                </nav>
                </div>
                <div className={`relative min-w-0 lg:before:pointer-events-none lg:before:absolute lg:before:inset-y-0 lg:before:w-[2px] lg:before:bg-ink/20 lg:before:content-[''] ${isPrograms ? "lg:before:-left-[13px]" : "lg:before:-left-[17px]"}`}>
                    {isPrograms ? <><MvpHeader dateRangeLabel={dateRangeLabel} freshness={data.freshness} /><MvpDashboard key={JSON.stringify(data.appliedFilters)} data={data} /></>
                        : overviewSnapshot && <MvpOverview key={context.userId} data={data} initialSnapshot={overviewSnapshot} />}
                </div>
            </div>
        </main>
    );
}
