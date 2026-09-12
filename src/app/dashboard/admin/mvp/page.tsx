import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canViewMvp } from "@/lib/roles";
import { AdminTopTabs } from "../admin-tabs";  
import { MvpDashboard } from "./mvp-dashboard";

export default async function MvpDashboardPage() {
    const context = await getSessionContext();

    // if user isn't signed in, redirect to login page
    if (!context) {
        redirect("/login");
    }

    const role = context?.student?.role ?? "student";

    // Only admins and super-admins can view the MVP dashboard. 
    // If the user doesn't have permission, redirect to the dashboard home page.
    if (!canViewMvp(role)) {
        redirect("/dashboard");
    }
    return (
        <main className="mx-auto w-full max-w-7xl px-6 py-8">
            <AdminTopTabs current="mvp" showInsights isManager/>
            <header className="mt-8 mb-8">
                <h1 className="mt-2 text-3xl font-semibold text-ink">
                    Program and Learner Performance
                </h1>
                <p className="mt-2 max-w-3xl font-semibold text-ink">
                Track and analyze the performance of your programs and learners.
                </p>
            </header>
            <section className="rounded-xl border border-rule bg-white p-6">
                <h2 className="text-lg font-semibold text-ink">Dashboard coming soon</h2>
                <p className="mt-2 text-sm text-ink-soft">
                    We are currently working on the MVP dashboard. Please check back later for updates.
                </p>
            </section>
        </main>
    );
}
