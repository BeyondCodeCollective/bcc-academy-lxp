import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canViewInsights } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { stateFromZip } from "@/lib/zip-to-state";
import { PageHeader } from "@/components/page-header";
import { LocationsView, type StateRow } from "./locations-view";

// Participant locations across the Catalyst hub programs (Catalyst + Beyond
// the Game + Beyond Code Centers), derived from the ZIPs collected by surveys
// and enrollment forms. Built for workforce-board outreach: "we have N
// participants in your state" with per-state toggles.

export const dynamic = "force-dynamic";

// The hub trio. Forte and BGC are standalone and intentionally excluded
// (same boundary as the Catalyst aggregation everywhere else).
const HUB_SLUGS = ["catalyst", "atg", "beyond-code-centers"];

export default async function LocationsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canViewInsights(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const { data: programs } = await svc
    .from("programs")
    .select("id, slug, name")
    .in("slug", HUB_SLUGS);
  const programById = new Map(
    (programs ?? []).map((p) => [p.id as string, p.name as string]),
  );

  const { data: students } = await svc
    .from("students")
    .select("zip, program_id, is_test, is_staff")
    .in("program_id", Array.from(programById.keys()));

  const participants = (students ?? []).filter((s) => !s.is_test && !s.is_staff);

  const byState = new Map<string, { count: number; programs: Map<string, number> }>();
  let withZip = 0;
  for (const s of participants) {
    const state = stateFromZip(s.zip as string | null);
    if (!state) continue;
    withZip++;
    const entry = byState.get(state) ?? { count: 0, programs: new Map() };
    entry.count++;
    const programName = programById.get(s.program_id as string) ?? "Unknown";
    entry.programs.set(programName, (entry.programs.get(programName) ?? 0) + 1);
    byState.set(state, entry);
  }

  const states: StateRow[] = Array.from(byState.entries())
    .map(([code, e]) => ({
      code,
      count: e.count,
      programs: Array.from(e.programs.entries()).map(([name, count]) => ({ name, count })),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Participant Locations"
        subtitle="Where hub participants live, from the ZIP codes collected at signup and in surveys. Toggle states to build a count for a specific region."
      />
      <LocationsView
        states={states}
        totalParticipants={participants.length}
        withZip={withZip}
      />
    </div>
  );
}
