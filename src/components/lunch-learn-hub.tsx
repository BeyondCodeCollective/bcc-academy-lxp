import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

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
    .select("id, title, presenter, recorded_at, description")
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink text-paper text-[13px] font-semibold px-4 py-2.5 transition-colors hover:bg-ink-soft"
          >
            Add a recording
          </Link>
        )}
      </header>

      {recordings.length === 0 ? (
        <div className="rounded-xl border border-rule-soft bg-paper-tint-soft p-8 sm:p-10 text-center">
          <p className="text-[15px] font-medium text-ink">No recordings yet</p>
          <p className="mt-1.5 text-[13px] text-ink-soft max-w-sm mx-auto">
            {isAdmin
              ? "Add the first Lunch & Learn recording to get this hub started."
              : "Check back soon — the first recording is on its way."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recordings.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/lunch-learn/${r.id}`}
                className="group flex h-full flex-col rounded-xl border border-rule-soft bg-paper p-5 transition-colors hover:border-rule hover:bg-paper-tint-soft"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                  {new Date(r.recorded_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <h2 className="mt-2 text-[17px] font-semibold text-ink leading-snug tracking-[-0.01em]">
                  {r.title}
                </h2>
                <p className="mt-1 text-[13px] text-ink-soft">
                  with {r.presenter}
                </p>
                {r.description && (
                  <p className="mt-3 text-[13px] leading-[1.55] text-ink-soft line-clamp-3">
                    {r.description}
                  </p>
                )}
                <span className="mt-auto pt-4 text-[12px] font-medium text-ink-soft group-hover:text-ink">
                  Watch &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
