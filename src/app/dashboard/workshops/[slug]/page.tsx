import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { resolveCurrentUser } from "@/lib/current-user";
import {
  getWorkshop,
  formatWorkshopDateRange,
} from "@/lib/workshops";
import {
  MapPin,
  GlobeHemisphereWest,
  Clock,
  Users,
  Handshake,
  Wrench,
  Trophy,
} from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function WorkshopDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const cookieStore = await cookies();
  const currentUser = await resolveCurrentUser(cookieStore);
  if (!currentUser) redirect("/");

  const { slug } = await params;
  const workshop = getWorkshop(slug);
  if (!workshop) notFound();

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
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-8">

      {/* Hero — icon tile + title + tagline */}
      <header className="space-y-5">
        <div
          aria-hidden
          className="flex aspect-[16/7] w-full items-center justify-center overflow-hidden"
          style={{ backgroundColor: `${workshop.tone}1A` }}
        >
          <Icon size={72} weight="light" color={workshop.tone} />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
            {dateLabel}
            <span className="mx-2 text-ink-faint">·</span>
            {workshop.durationLabel}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {workshop.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-soft">
            {workshop.tagline}
          </p>
        </div>
      </header>

      {/* Quick facts strip */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={ModalityIcon} label="Modality" value={modalityLabel} />
        <Fact icon={MapPin} label="Location" value={workshop.location} />
        <Fact icon={Users} label="Audience" value={workshop.audience} />
        {workshop.alumniCount !== undefined ? (
          <Fact
            icon={Trophy}
            label="Alumni"
            value={`${workshop.alumniCount}`}
          />
        ) : workshop.capacity !== undefined ? (
          <Fact
            icon={Users}
            label="Capacity"
            value={`${workshop.capacity}`}
          />
        ) : (
          <Fact icon={Clock} label="Duration" value={workshop.durationLabel} />
        )}
      </dl>

      {/* Description */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          About
        </h2>
        <p className="text-[15px] leading-relaxed text-ink">
          {workshop.description}
        </p>
      </section>

      {/* Outcomes */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          What participants learned
        </h2>
        <ul className="space-y-2">
          {workshop.outcomes.map((o, i) => (
            <li
              key={i}
              className="flex gap-3 text-[14px] leading-relaxed text-ink"
            >
              <span
                aria-hidden
                className="mt-2 h-1 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: workshop.tone }}
              />
              {o}
            </li>
          ))}
        </ul>
      </section>

      {/* Capstone */}
      {workshop.capstone && (
        <section className="panel p-5 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Capstone
          </p>
          <h3 className="text-lg font-semibold text-ink">
            {workshop.capstone.title}
          </h3>
          <p className="text-[14px] leading-relaxed text-ink-soft">
            {workshop.capstone.description}
          </p>
        </section>
      )}

      {/* Highlights */}
      {workshop.highlights && workshop.highlights.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Highlights
          </h2>
          <ul className="space-y-2">
            {workshop.highlights.map((h, i) => (
              <li
                key={i}
                className="flex gap-3 text-[14px] leading-relaxed text-ink"
              >
                <span
                  aria-hidden
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint"
                />
                {h}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tools + Partners — side by side on wider screens */}
      <div className="grid gap-6 sm:grid-cols-2">
        {workshop.tools && workshop.tools.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
              <Wrench size={11} weight="bold" />
              Tools
            </h2>
            <ul className="flex flex-wrap gap-2">
              {workshop.tools.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-rule bg-white px-2.5 py-1 text-[12px] text-ink"
                >
                  {t}
                </li>
              ))}
            </ul>
          </section>
        )}

        {workshop.partners.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
              <Handshake size={11} weight="bold" />
              Partners
            </h2>
            <ul className="flex flex-wrap gap-2">
              {workshop.partners.map((p) => (
                <li
                  key={p}
                  className="rounded-full border border-rule bg-white px-2.5 py-1 text-[12px] text-ink"
                >
                  {p}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {workshop.credentialName && (
        <section className="border border-rule bg-surface-soft p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Credential earned
          </p>
          <p className="mt-1 text-[15px] font-medium text-ink">
            {workshop.credentialName}
          </p>
        </section>
      )}
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; weight?: "bold"; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 panel p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        <Icon size={11} weight="bold" aria-hidden />
        {label}
      </p>
      <p className="text-[13px] font-medium text-ink">{value}</p>
    </div>
  );
}
