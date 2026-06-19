import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { CatalogCard } from "@/components/catalog-card";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui";

type Props = {
  isAdmin: boolean;
  firstName: string;
};

// Shared Lunch & Learns hub. Rendered as the dashboard home for staff users
// (src/app/dashboard/page.tsx) and as /dashboard/lunch-learn for admins
// who want to manage recordings.
export async function LunchLearnHub({ isAdmin, firstName }: Props) {
  const svc = createServiceClient();
  const { data: rows } = await svc
    .from("lunch_learns")
    .select("id, title, presenter, recorded_at, description, recording_url")
    .order("recorded_at", { ascending: false });

  const recordings = rows ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 space-y-10">
      <PageHeader
        eyebrow="Lunch & Learns"
        title={firstName ? `Welcome, ${firstName}` : "Internal learning sessions"}
        subtitle="Recordings from the BCC team — peer-taught sessions on the tools, topics, and practices we use day-to-day."
        actions={
          isAdmin ? (
            <Link
              href="/dashboard/admin?tab=lunch-learn"
              className={buttonClass("primary", "md")}
            >
              Add a recording
            </Link>
          ) : undefined
        }
      />

      {recordings.length === 0 ? (
        <div className="border border-rule-soft bg-paper-tint-soft p-8 sm:p-10 text-center">
          <p className="text-[15px] font-medium text-ink">No recordings yet</p>
          <p className="mt-1.5 text-[13px] text-ink-soft max-w-sm mx-auto">
            {isAdmin
              ? "Add the first Lunch & Learn recording to get this hub started."
              : "Check back soon — the first recording is on its way."}
          </p>
        </div>
      ) : (
        <YearGroupedRecordings recordings={recordings} />
      )}
    </div>
  );
}

type Recording = {
  id: string;
  title: string;
  presenter: string;
  recorded_at: string;
  description: string | null;
  recording_url: string;
};

// Presenter initials for the card monogram — first letter of the first two
// name parts. Empty string when there's no presenter (the card hides it).
function initials(name: string): string {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function YearGroupedRecordings({ recordings }: { recordings: Recording[] }) {
  // Group by recording year so a growing archive doesn't read as one
  // unbroken wall. Sections render newest-first; within a section,
  // recordings keep the parent's recorded_at desc ordering.
  const byYear = new Map<number, Recording[]>();
  for (const r of recordings) {
    const year = new Date(r.recorded_at).getFullYear();
    const arr = byYear.get(year) ?? [];
    arr.push(r);
    byYear.set(year, arr);
  }
  const sections = Array.from(byYear.entries()).sort((a, b) => b[0] - a[0]);

  return (
    <div className="space-y-10">
      {sections.map(([year, items]) => (
        <div key={year}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => {
              const date = new Date(r.recorded_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <li key={r.id}>
                  <CatalogCard
                    href={`/dashboard/lunch-learn/${r.id}`}
                    eyebrow="Recording"
                    title={r.title}
                    byline={r.presenter ? `with ${r.presenter}` : undefined}
                    monogram={initials(r.presenter)}
                    description={r.description ?? undefined}
                    trailing={date}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
