import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { getProgramBySlug } from "@/lib/programs";
import { getAllowedEmails } from "./actions";
import { AllowlistForm } from "./allowlist-form";
import { TrackPicker } from "./track-picker";

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
  const catalyst = getProgramBySlug("catalyst");
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
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Admin
      </Link>

      <header className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400 mb-2">
          Signup allowlist
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Who can sign up
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 max-w-prose">
          Each course has its own allowlist. Pick the course, paste emails or
          upload a CSV. If the list has any entries, only those addresses can
          sign up via{" "}
          the course-specific join link for{" "}
          <strong>{selectedOption?.name ?? selectedSlug}</strong>. If you
          clear it (save with an empty list), the gate turns off and
          anyone can sign up to that course again. Existing students are
          unaffected.
        </p>
      </header>

      <div className="mb-6">
        <label
          htmlFor="track-picker"
          className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-2"
        >
          Course
        </label>
        <TrackPicker selectedSlug={selectedSlug} groups={orderedGroups} />
      </div>

      <AllowlistForm
        trackSlug={selectedSlug}
        trackName={selectedOption?.name ?? selectedSlug}
        initialEmails={emails}
      />
    </div>
  );
}
