import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveCurrentUser } from "@/lib/current-user";
import {
  getAllWorkshops,
  formatWorkshopDateRange,
  type Workshop,
} from "@/lib/workshops";
import { MapPin, GlobeHemisphereWest } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function WorkshopsIndexPage() {
  const cookieStore = await cookies();
  const currentUser = await resolveCurrentUser(cookieStore);
  if (!currentUser) redirect("/");

  const all = getAllWorkshops();
  const upcoming = all.filter((w) => w.status === "upcoming");
  const past = all.filter((w) => w.status === "past");

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Workshops
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Virtual and in-person workshops we&rsquo;ve hosted or have coming up.
        </p>
      </header>

      {upcoming.length > 0 && (
        <Section label="Upcoming" workshops={upcoming} />
      )}

      {past.length > 0 && (
        <Section label="Past" workshops={past} />
      )}

      {all.length === 0 && (
        <p className="border border-rule bg-surface-elevated px-5 py-8 text-center text-sm text-neutral-500">
          No workshops yet.
        </p>
      )}
    </div>
  );
}

function Section({
  label,
  workshops,
}: {
  label: string;
  workshops: Workshop[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </h2>
        <span className="text-xs tabular-nums text-neutral-400">
          {workshops.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workshops.map((w) => (
          <WorkshopCard key={w.slug} workshop={w} />
        ))}
      </div>
    </section>
  );
}

function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const Icon = workshop.icon;
  const dateLabel = formatWorkshopDateRange(workshop);
  const ModalityIcon =
    workshop.modality === "virtual" ? GlobeHemisphereWest : MapPin;
  const modalityLabel =
    workshop.modality === "virtual"
      ? "Virtual"
      : workshop.modality === "hybrid"
        ? "Hybrid"
        : "In-person";

  return (
    <Link
      href={`/dashboard/workshops/${workshop.slug}`}
      className="group flex h-full flex-col overflow-hidden border border-rule bg-surface-elevated transition-colors hover:border-neutral-300"
    >
      <div
        aria-hidden
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: `${workshop.tone}1A` }}
      >
        <Icon size={56} weight="light" color={workshop.tone} />
        <div className="absolute top-3 right-3">
          <span
            className="inline-flex items-center rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold capitalize backdrop-blur"
            style={{ color: workshop.tone }}
          >
            {workshop.status}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
          {dateLabel}
        </p>
        <h3 className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-neutral-900 line-clamp-2">
          {workshop.shortName ?? workshop.title}
        </h3>
        <p className="mt-2 text-[13px] leading-[1.55] text-neutral-600 line-clamp-3">
          {workshop.tagline}
        </p>
        <div className="mt-auto flex items-center gap-3 pt-4 text-[12px] text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <ModalityIcon size={12} weight="bold" aria-hidden />
            {modalityLabel}
          </span>
          {workshop.alumniCount !== undefined && (
            <span className="tabular-nums">
              {workshop.alumniCount} alumni
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
