import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  CalendarBlank,
  ChalkboardTeacher,
  Lightning,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { computeCurrentWeek } from "@/lib/utils";
import { getProgram } from "@/lib/programs/server";
import { getTrackBySlug } from "@/lib/programs";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { toneForTrack, iconForTrack } from "@/lib/track-visual";

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

  const startDateLabel = new Date(track.startDate).toLocaleDateString("en-US", {
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

  const tone = toneForTrack(slug);
  const Icon = iconForTrack(slug);

  const eyebrow = started
    ? `Week ${currentWeek} of ${track.totalWeeks}`
    : `Starts ${startDateLabel}`;

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft size={12} weight="bold" />
          All courses
        </Link>
        {isAdminViewer && (
          <CopyInviteLink
            programSlug={program.slug}
            trackSlug={slug}
            fallbackDomain={program.domain}
          />
        )}
      </div>

      {/* Hero — tone-tinted icon banner + eyebrow + title + tagline */}
      <header className="space-y-5">
        <div
          aria-hidden
          className="relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden"
          style={{ backgroundColor: `${tone}1A` }}
        >
          <Icon size={72} weight="light" color={tone} />
          {started && (
            <div className="absolute top-4 right-4">
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold backdrop-blur"
                style={{ color: tone }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: tone }}
                />
                In progress
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
            {eyebrow}
            <span className="mx-2 text-neutral-300">·</span>
            {track.totalWeeks}-week track
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            {track.name}
          </h1>
          {overviewCopy && (
            <p className="mt-3 text-base leading-relaxed text-neutral-600">
              {overviewCopy}
            </p>
          )}
        </div>

        <div>
          <Link
            href={`/dashboard/track/${slug}/${ctaWeek}`}
            className="inline-flex items-center gap-2 bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
          >
            {ctaLabel}
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </header>

      {/* Quick facts strip — mirrors workshop detail */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact
          icon={ChalkboardTeacher}
          label="Instructor"
          value={track.instructor}
        />
        <Fact
          icon={Clock}
          label="Duration"
          value={`${track.totalWeeks} weeks`}
        />
        <Fact
          icon={Lightning}
          label="Cadence"
          value={
            track.sessionsPerWeek > 1
              ? `${track.sessionsPerWeek}×/week`
              : "1×/week"
          }
        />
        <Fact
          icon={CalendarBlank}
          label={started ? "Started" : "Starts"}
          value={startDateLabel}
        />
      </dl>

      {/* Curriculum — the weeks list, styled like a workshop "what you'll learn" */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Curriculum
        </h2>
        <ol className="divide-y divide-rule border border-rule bg-surface-elevated">
          {track.weekSummaries.map((ws) => {
            const isCurrent = started && ws.week === currentWeek;
            const isPast = started && ws.week < currentWeek;
            return (
              <li key={ws.week}>
                <Link
                  href={`/dashboard/track/${slug}/${ws.week}`}
                  className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-neutral-50"
                >
                  <span
                    className={`w-12 shrink-0 text-[13px] font-medium tabular-nums ${
                      isPast
                        ? "text-neutral-300"
                        : isCurrent
                          ? "text-neutral-900"
                          : "text-neutral-400"
                    }`}
                  >
                    Wk {ws.week}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      className={`truncate text-[15px] ${
                        isPast
                          ? "text-neutral-400"
                          : "text-neutral-700 group-hover:text-neutral-900"
                      }`}
                    >
                      {ws.topic}
                    </span>
                    {isCurrent && (
                      <span
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: `${tone}1A`,
                          color: tone,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full animate-pulse"
                          style={{ backgroundColor: tone }}
                        />
                        Current
                      </span>
                    )}
                  </div>
                  <ArrowRight
                    size={13}
                    weight="bold"
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
    <div className="space-y-1 border border-rule bg-surface-elevated p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        <Icon size={11} weight="bold" aria-hidden />
        {label}
      </p>
      <p className="text-[13px] font-medium text-neutral-900">{value}</p>
    </div>
  );
}
