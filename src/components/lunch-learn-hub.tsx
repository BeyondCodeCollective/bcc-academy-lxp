import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getYouTubeThumbnailUrl } from "@/lib/storage-utils";
import { VideoPoster } from "@/components/video-poster";

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
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-10 md:py-14">
      <header className="mb-10 md:mb-14 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-3">
            Lunch &amp; Learns
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-ink tracking-[-0.02em] leading-[1.05]">
            {firstName ? `Welcome, ${firstName}` : "Internal learning sessions"}
          </h1>
          <p className="mt-3 text-[15px] leading-[1.6] text-ink-soft max-w-xl">
            Recordings from the BCC team — peer-taught sessions on the tools,
            topics, and practices we use day-to-day.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/admin?tab=lunch-learn"
            className="inline-flex items-center gap-1.5 bg-ink text-paper text-[13px] font-semibold px-4 py-2.5 transition-colors hover:bg-ink-soft"
          >
            Add a recording
          </Link>
        )}
      </header>

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
        <section key={year} className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              {year}
            </h2>
            <span className="text-xs tabular-nums text-ink-faint">
              {items.length}
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => {
              const thumbnail = r.recording_url
                ? getYouTubeThumbnailUrl(r.recording_url)
                : null;
              const eyebrow = new Date(r.recorded_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              });
              return (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/lunch-learn/${r.id}`}
                    className="group flex h-full flex-col overflow-hidden border border-rule-soft bg-paper transition-colors hover:border-rule hover:bg-paper-tint-soft"
                  >
                    <VideoPoster
                      thumbnailUrl={thumbnail}
                      eyebrow={eyebrow}
                      title={r.title}
                      subtitle={`with ${r.presenter}`}
                      description={r.description}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
