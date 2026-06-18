import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { getJoinablePrograms } from "@/lib/programs";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../manage-menu";
import { TrackPicker } from "../allowlist/track-picker";
import { AllowlistForm } from "../allowlist/allowlist-form";
import { getAllowedEmails } from "../allowlist/actions";
import { InvitesPanel } from "./invites-panel";

// Bulk invite send paces at ~2/sec; give it room for a few hundred recipients.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PHASE_LABELS: Record<string, string> = {
  foundation: "Foundation",
  core: "Core",
  workshop: "Workshops",
  exit: "Exit",
  other: "Other",
};
const PHASE_ORDER = ["foundation", "core", "workshop", "exit", "other"];

// "Add People" — the combined onboarding surface: pick a course, manage who can
// join (the allowlist), and send one-click login invites to that list. Merges
// the former separate Allowlist + Invites pages into one workflow.
export default async function AddPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/dashboard");
  }
  const { track: trackParam } = await searchParams;

  // Every course across every program (Catalyst + Upskill Bahamas + Beyond Code
  // Centers + BGC), deduped by slug — so courses Catalyst no longer aggregates
  // (Upskill Bahamas, BGC) are still pickable here.
  const withOverrides = await Promise.all(
    getJoinablePrograms().map((p) => getProgramWithOverrides(p.slug)),
  );
  type Option = { slug: string; name: string; phase: string };
  const seen = new Set<string>();
  const options: Option[] = [];
  for (const prog of withOverrides) {
    for (const t of prog.tracks) {
      if (seen.has(t.slug)) continue;
      seen.add(t.slug);
      options.push({ slug: t.slug, name: t.shortName || t.name, phase: t.phase ?? "other" });
    }
  }

  const grouped = new Map<string, { slug: string; name: string }[]>();
  for (const o of options) {
    const arr = grouped.get(o.phase) ?? [];
    arr.push({ slug: o.slug, name: o.name });
    grouped.set(o.phase, arr);
  }
  const orderedGroups = PHASE_ORDER.filter((k) => grouped.has(k)).map((k) => ({
    label: PHASE_LABELS[k] ?? k,
    options: grouped.get(k)!,
  }));

  const selectedSlug =
    options.find((o) => o.slug === trackParam)?.slug ?? options[0]?.slug ?? "";
  const selectedName =
    options.find((o) => o.slug === selectedSlug)?.name ?? selectedSlug;

  const { emails } = await getAllowedEmails(selectedSlug);

  // Invite delivery counts for the selected course.
  const svc = createServiceClient();
  const { data: inviteRows } = await svc
    .from("invites")
    .select("status, used_at")
    .eq("track_slug", selectedSlug);
  let sent = 0;
  let opened = 0;
  for (const r of inviteRows ?? []) {
    if (r.status === "sent") sent++;
    if (r.used_at) opened++;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-8">
      <PageHeader
        title="Add People"
        subtitle="Pick a course, set who can join, then send one-click login invites — all in one place."
        actions={<ManageMenu />}
      />

      <div>
        <label
          htmlFor="track-picker"
          className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft"
        >
          Course
        </label>
        <TrackPicker selectedSlug={selectedSlug} groups={orderedGroups} />
      </div>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          1 · Who can join
        </h2>
        {/* key forces a fresh mount on course change so the textarea re-syncs. */}
        <AllowlistForm
          key={selectedSlug}
          trackSlug={selectedSlug}
          trackName={selectedName}
          initialEmails={emails}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          2 · Send invites
        </h2>
        <InvitesPanel
          tracks={[
            { slug: selectedSlug, name: selectedName, invited: emails.length, sent, opened },
          ]}
        />
      </section>
    </div>
  );
}
