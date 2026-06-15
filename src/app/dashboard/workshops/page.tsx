import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CatalogCard } from "@/components/catalog-card";
import { PageHeader, Section } from "@/components/page-header";
import { resolveCurrentUser } from "@/lib/current-user";
import {
  getAllWorkshops,
  formatWorkshopDateRange,
  type Workshop,
} from "@/lib/workshops";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export default async function WorkshopsIndexPage() {
  const cookieStore = await cookies();
  const currentUser = await resolveCurrentUser(cookieStore);
  if (!currentUser) redirect("/");

  const all = getAllWorkshops();
  const upcoming = all.filter((w) => w.status === "upcoming");
  const past = all.filter((w) => w.status === "past");

  const svc = createServiceClient();
  const { data: luncheons } = await svc
    .from("lunch_learns")
    .select("id, title, presenter, recorded_at, description, recording_url")
    .order("recorded_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 space-y-10">
      <PageHeader
        title="Workshops"
        subtitle="Virtual and in-person workshops we’ve hosted or have coming up."
      />

      {upcoming.length > 0 && (
        <WorkshopSection label="Upcoming" workshops={upcoming} />
      )}

      {past.length > 0 && (
        <WorkshopSection label="Past" workshops={past} />
      )}

      {luncheons && luncheons.length > 0 && (
        <LuncheonSection luncheons={luncheons} />
      )}

      {all.length === 0 && (!luncheons || luncheons.length === 0) && (
        <p className="panel px-5 py-8 text-center text-sm text-ink-soft">
          No workshops yet.
        </p>
      )}
    </div>
  );
}

type LuncheonRow = {
  id: string;
  title: string;
  presenter: string;
  recorded_at: string;
  description: string | null;
  recording_url: string;
};

const LUNCHEON_TONE = "#1D59FF";

function LuncheonSection({ luncheons }: { luncheons: LuncheonRow[] }) {
  return (
    <Section label="Luncheons" count={luncheons.length}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {luncheons.map((r) => {
          const date = new Date(r.recorded_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          return (
            <CatalogCard
              key={r.id}
              href={`/dashboard/lunch-learn/${r.id}`}
              tone={LUNCHEON_TONE}
              eyebrow="Recording"
              title={r.title}
              byline={r.presenter ? `with ${r.presenter}` : undefined}
              trailing={date}
            />
          );
        })}
      </div>
    </Section>
  );
}

function WorkshopSection({
  label,
  workshops,
}: {
  label: string;
  workshops: Workshop[];
}) {
  return (
    <Section label={label} count={workshops.length}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workshops.map((w) => (
          <WorkshopRow key={w.slug} workshop={w} />
        ))}
      </div>
    </Section>
  );
}

function WorkshopRow({ workshop }: { workshop: Workshop }) {
  const dateLabel = formatWorkshopDateRange(workshop);
  const modalityLabel =
    workshop.modality === "virtual"
      ? "Virtual"
      : workshop.modality === "hybrid"
        ? "Hybrid"
        : "In-person";

  return (
    <CatalogCard
      href={`/dashboard/workshops/${workshop.slug}`}
      tone={workshop.tone}
      eyebrow={`${modalityLabel}${workshop.alumniCount !== undefined ? ` · ${workshop.alumniCount} alumni` : ""}`}
      title={workshop.shortName ?? workshop.title}
      byline={workshop.tagline}
      status={workshop.status}
      trailing={dateLabel}
    />
  );
}
