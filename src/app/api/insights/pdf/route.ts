import { NextResponse, type NextRequest } from "next/server";
import { requireCapability } from "@/app/dashboard/admin/actions-shared";
import { getProgram } from "@/lib/programs/server";
import { buildInsightsData } from "@/lib/analytics/insights-data";
import { renderInsightsPdf } from "@/app/dashboard/admin/insights/insights-pdf";

// Server-generated Survey Insights PDF. Node runtime (react-pdf needs Node);
// always dynamic since it depends on the caller's session + live data.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let svc;
  try {
    ({ svc } = await requireCapability("view_insights"));
  } catch (e) {
    // Let Next's redirect (unauthenticated) propagate; treat anything else as a
    // plain authorization failure rather than a 500.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return new NextResponse("Not authorized", { status: 403 });
  }

  const program = await getProgram();
  // Same scope rule as the admin Insights page: Catalyst aggregates ATG +
  // Beyond Code Centers; every other program is just itself.
  const aggregatedSlugs =
    program.slug === "catalyst"
      ? ["catalyst", "atg", "beyond-code-centers"]
      : [program.slug];
  const { data: programRows } = await svc
    .from("programs")
    .select("id, slug")
    .in("slug", aggregatedSlugs);
  const programIds = (programRows ?? []).map((p) => p.id as string);

  const data = await buildInsightsData(programIds, aggregatedSlugs);

  const cohort = req.nextUrl.searchParams.get("cohort") || "all";
  const generatedAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const buffer = await renderInsightsPdf({
    data,
    cohort,
    programName: program.name,
    generatedAt,
  });

  const slug =
    program.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "program";
  const cohortSlug =
    cohort === "all"
      ? ""
      : "-" + cohort.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}-survey-insights${cohortSlug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
