import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { getAllPrograms } from "@/lib/programs";
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

  // Build the full list of selectable tracks, grouped by program. Catalyst
  // is a view of the underlying programs' tracks (atg/forge/forte +
  // additionalTracks), so we'd see most tracks twice if we walked it. Skip
  // it and walk the source programs instead.
  const programs = getAllPrograms().filter(
    (p) => p.slug !== "marketing" && p.slug !== "catalyst",
  );
  type Option = {
    slug: string;
    name: string;
    programSlug: string;
    programName: string;
  };
  const seen = new Set<string>();
  const options: Option[] = [];
  for (const p of programs) {
    for (const t of p.tracks) {
      if (seen.has(t.slug)) continue;
      seen.add(t.slug);
      options.push({
        slug: t.slug,
        name: t.shortName || t.name,
        programSlug: p.slug,
        programName: p.name,
      });
    }
  }
  const groupedByProgram = new Map<string, Option[]>();
  for (const o of options) {
    const arr = groupedByProgram.get(o.programName) ?? [];
    arr.push(o);
    groupedByProgram.set(o.programName, arr);
  }

  const selectedSlug =
    options.find((o) => o.slug === trackParam)?.slug ??
    options[0]?.slug ??
    "ai-literacy";
  const selectedOption =
    options.find((o) => o.slug === selectedSlug) ?? options[0];

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
          <code className="font-mono text-[12px] bg-neutral-100 px-1 py-0.5">
            /join/{selectedOption?.programSlug}?track={selectedSlug}
          </code>
          . If you clear it (save with an empty list), the gate turns off and
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
        <TrackPicker
          selectedSlug={selectedSlug}
          groups={Array.from(groupedByProgram.entries()).map(
            ([programName, opts]) => ({
              programName,
              options: opts.map((o) => ({ slug: o.slug, name: o.name })),
            }),
          )}
        />
      </div>

      <AllowlistForm
        trackSlug={selectedSlug}
        trackName={selectedOption?.name ?? selectedSlug}
        initialEmails={emails}
      />
    </div>
  );
}
