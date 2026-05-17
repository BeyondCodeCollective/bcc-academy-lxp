import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { computeCurrentWeek } from "@/lib/utils";
import { getProgram } from "@/lib/programs/server";
import { getTrackBySlug } from "@/lib/programs";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { CopyInviteLink } from "@/components/copy-invite-link";

export const dynamic = "force-dynamic";

export default async function TrackOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await getProgram();
  const track = getTrackBySlug(program, slug);
  if (!track) redirect("/dashboard");

  // Admins viewing a track overview get a quick "copy invite link" button
  // so they can hand the URL to a specific person without bouncing back
  // to an admin panel. Hidden from regular students.
  const ctx = await getSessionContext();
  const isAdminViewer = canAccessAdminPanel(ctx?.student?.role ?? "");

  // Single-event tracks don't have weeks to scrub — send them straight to
  // the session page (same destination the dashboard card used to use).
  if (track.type === "single-event") {
    redirect(`/dashboard/track/${slug}/1`);
  }

  const now = new Date();
  const started = now >= new Date(track.startDate);
  const currentWeek = started
    ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
    : 0;

  const startLabel = new Date(track.startDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const ctaWeek = started ? currentWeek : 1;
  const ctaLabel = started
    ? `Open current week — Week ${currentWeek}`
    : "Open Week 1";

  // Track-level description if authored, else fall back to week 1's
  // description (every track has one written and it's already framing copy).
  const overviewCopy = track.description ?? track.weeks[0]?.description ?? "";

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors py-2"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        {isAdminViewer && (
          <CopyInviteLink
            programSlug={program.slug}
            trackSlug={slug}
            fallbackDomain={program.domain}
          />
        )}
      </div>

      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400 mb-3">
          {track.shortName} · {track.totalWeeks}-week track
        </p>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight leading-[1.1]">
          {track.name}
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          with {track.instructor}
          {track.sessionsPerWeek > 1 ? ` · ${track.sessionsPerWeek} sessions/week` : ""}
          {started ? "" : ` · Starts ${startLabel}`}
        </p>

        {overviewCopy && (
          <p className="mt-5 text-lg leading-relaxed text-neutral-700 max-w-[65ch]">
            {overviewCopy}
          </p>
        )}

        <div className="mt-6">
          <Link
            href={`/dashboard/track/${slug}/${ctaWeek}`}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
          >
            {ctaLabel}
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <section className="border-t border-neutral-200 pt-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
          Weeks
        </p>
        <ol className="divide-y divide-neutral-100">
          {track.weekSummaries.map((ws) => {
            const isCurrent = started && ws.week === currentWeek;
            return (
              <li key={ws.week}>
                <Link
                  href={`/dashboard/track/${slug}/${ws.week}`}
                  className="group flex items-center gap-4 py-3 transition-colors hover:text-neutral-900"
                >
                  <span className="w-12 shrink-0 text-[13px] font-medium tabular-nums text-neutral-400">
                    Wk {ws.week}
                  </span>
                  <div className="flex flex-1 min-w-0 items-center gap-2.5">
                    <span className="truncate text-[15px] text-neutral-700 group-hover:text-neutral-900">
                      {ws.topic}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FEEAE4] px-2 py-0.5 text-xs font-semibold text-[#E54D2E]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#E54D2E] animate-pulse" />
                        Current
                      </span>
                    )}
                  </div>
                  <ArrowRight
                    size={13}
                    className="shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-600"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
