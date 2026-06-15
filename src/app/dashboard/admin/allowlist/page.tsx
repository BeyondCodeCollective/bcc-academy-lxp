import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { getAllowedEmails } from "./actions";
import { AllowlistForm } from "./allowlist-form";
import { TrackPicker } from "./track-picker";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function AllowlistAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/dashboard");
  }

  const { track: trackParam } = await searchParams;

  // Catalyst is the umbrella program — its track list aggregates every
  // course we offer (ATG, BCC Centers / Forge, Upskill Bahamas / Forte,
  // plus additionalTracks). Walking Catalyst gives every track exactly
  // once, with each track's `phase` field telling us which bucket it
  // belongs to. We use phase for grouping in the dropdown (Foundation /
  // Core / Workshop / Exit / Other) — much closer to the team's mental
  // model than the underlying program names, which mostly read like
  // legacy plumbing.
  const catalyst = await getProgramWithOverrides("catalyst");
  type Option = { slug: string; name: string; phase: string };
  const seen = new Set<string>();
  const options: Option[] = [];
  for (const t of catalyst.tracks) {
    if (seen.has(t.slug)) continue;
    seen.add(t.slug);
    options.push({
      slug: t.slug,
      name: t.shortName || t.name,
      phase: t.phase ?? "other",
    });
  }

  const PHASE_LABELS: Record<string, string> = {
    foundation: "Foundation",
    core: "Core",
    workshop: "Workshops",
    exit: "Exit",
    other: "Other",
  };
  const PHASE_ORDER = ["foundation", "core", "workshop", "exit", "other"];
  const groupedByPhase = new Map<string, Option[]>();
  for (const o of options) {
    const arr = groupedByPhase.get(o.phase) ?? [];
    arr.push(o);
    groupedByPhase.set(o.phase, arr);
  }
  const orderedGroups = PHASE_ORDER
    .filter((key) => groupedByPhase.has(key))
    .map((key) => ({
      label: PHASE_LABELS[key] ?? key,
      options: (groupedByPhase.get(key) ?? []).map((o) => ({
        slug: o.slug,
        name: o.name,
      })),
    }));

  const selectedSlug =
    options.find((o) => o.slug === trackParam)?.slug ??
    options[0]?.slug ??
    "ai-literacy";
  const selectedOption = options.find((o) => o.slug === selectedSlug);

  const { emails } = await getAllowedEmails(selectedSlug);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8">
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Admin
      </Link>

      <div className="mb-6">
        <PageHeader eyebrow="Signup allowlist" title="Who can sign up" />
        <p className="mt-3 text-sm leading-relaxed text-ink-soft max-w-prose">
          Each course has its own allowlist. Pick the course, paste emails or
          upload a CSV. If the list has any entries, only those addresses can
          sign up via{" "}
          the course-specific join link for{" "}
          <strong>{selectedOption?.name ?? selectedSlug}</strong>. If you
          clear it (save with an empty list), the gate turns off and
          anyone can sign up to that course again. Existing students are
          unaffected.
        </p>
      </div>

      <div className="mb-6">
        <label
          htmlFor="track-picker"
          className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft mb-2"
        >
          Course
        </label>
        <TrackPicker selectedSlug={selectedSlug} groups={orderedGroups} />
      </div>

      {/* `key` forces a fresh mount whenever the selected course changes
         so the form's textarea state re-syncs from the new initialEmails.
         Without this, switching from a populated course (AI Literacy)
         to an empty one (Tech+) kept showing the previous course's
         emails AND the wrong count in the status banner — a real
         "looks like I'd be overwriting Tech+ with AI Literacy's list"
         footgun if you also hit Save. */}
      <AllowlistForm
        key={selectedSlug}
        trackSlug={selectedSlug}
        trackName={selectedOption?.name ?? selectedSlug}
        initialEmails={emails}
      />
    </div>
  );
}
