import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { isMasterEmail } from "@/lib/auth/admins";
import { getPlatformAnalytics } from "@/lib/analytics/platform";
import { isRangePreset } from "@/lib/analytics/period";
import { PageHeader } from "@/components/page-header";
import { PlatformDashboard } from "./platform-dashboard";

// Platform Analytics — the whole platform in one view, ignoring the program
// switcher on purpose.
//
// Every other analytics surface is program-scoped, so nothing added the
// programs up. Master-only: it reads every program's data with the service
// client, which sits with the platform owner rather than with super-admins
// (same gate as Platform health).

export const dynamic = "force-dynamic";

export default async function PlatformAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!isMasterEmail(ctx.userEmail)) redirect("/dashboard/admin");

  const { range } = await searchParams;
  const data = await getPlatformAnalytics(isRangePreset(range) ? range : "90d");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-5">
      <PageHeader
        eyebrow="Master"
        title="Platform Analytics"
        subtitle="Every program, course, and learner added up. The program switcher does not apply here — this is the whole platform."
      />
      <PlatformDashboard data={data} />
      <p className="text-xs text-ink-faint">
        Computed live from base tables at{" "}
        {new Date(data.generatedAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
        .
      </p>
    </div>
  );
}
