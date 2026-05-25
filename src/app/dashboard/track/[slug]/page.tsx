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
import { toneForTrack } from "@/lib/track-visual";

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

  // Self-paced tracks suppress the marketing start date — once live, "Starts
  // June 1" reads as stale. Empty string => JSX skips the eyebrow segment.
  const eyebrow = started
    ? `Week ${currentWeek} of ${track.totalWeeks}`
    : track.selfPaced
      ? ""
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

      {/* Hero — the tone-tinted block frames a 2×5 grid of weekly topics, so
         it doubles as the curriculum-at-a-glance and as week-level navigation.
         Each cell links to its week page; current week is inset-ringed in the
         track tone. Replaces a previous decorative-icon hero. */}
      <header className="space-y-5">
        <div
          className="relative w-full overflow-hidden p-5 sm:p-7"
          style={{ backgroundColor: `${tone}1A` }}
        >
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            {track.weekSummaries.map((ws) => {
              const isCurrent = started && ws.week === currentWeek;
              const isPast = started && ws.week < currentWeek;
              return (
                <li key={ws.week}>
                  <Link
                    href={`/dashboard/track/${slug}/${ws.week}`}
                    aria-label={`Week ${ws.week}: ${ws.topic}${isCurrent ? " (current week)" : ""}`}
                    className="group flex aspect-square flex-col items-center justify-center bg-white/85 p-2 backdrop-blur transition-colors hover:bg-white sm:p-2.5"
                    style={
                      isCurrent
                        ? { boxShadow: `inset 0 0 0 2px ${tone}` }
                        : undefined
                    }
                  >
                    <span
                      className={`text-2xl leading-none sm:text-3xl ${
                        isPast ? "opacity-60" : ""
                      }`}
                    >
                      {ws.icon}
                    </span>
                    <span
                      className={`mt-1.5 line-clamp-2 px-1 text-center text-[10px] font-medium leading-tight transition-colors sm:text-[11px] ${
                        isPast
                          ? "text-neutral-400"
                          : "text-neutral-600 group-hover:text-neutral-900"
                      }`}
                    >
                      {ws.topic}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          {started && (
            <div className="absolute top-3 right-3">
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
            {eyebrow && (
              <>
                {eyebrow}
                <span className="mx-2 text-neutral-300">·</span>
              </>
            )}
            {track.totalWeeks}-week track
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            {track.name}
          </h1>
          {overviewCopy &&
            overviewCopy
              .split(/\n\n+/)
              .map((para, i) => (
                <p
                  key={i}
                  className="mt-3 text-base leading-relaxed text-neutral-600"
                >
                  {para}
                </p>
              ))}
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

      {/* Quick facts strip — mirrors workshop detail. Self-paced tracks
         skip the start-date card (it reads as stale once a self-paced
         program is live) and the grid drops to 3 columns. */}
      <dl
        className={`grid gap-3 ${
          track.selfPaced ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
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
        {!track.selfPaced && (
          <Fact
            icon={CalendarBlank}
            label={started ? "Started" : "Starts"}
            value={startDateLabel}
          />
        )}
      </dl>

      {track.officeHours && track.officeHours.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Office Hours
          </h2>
          <ul className="divide-y divide-rule border border-rule bg-surface-elevated">
            {[...track.officeHours]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((oh) => {
                const display = new Date(`${oh.date}T12:00:00`).toLocaleDateString(
                  "en-US",
                  { weekday: "long", month: "long", day: "numeric" },
                );
                return (
                  <li key={`${oh.date}-${oh.title}`} className="px-4 py-3.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="text-sm font-semibold text-neutral-900">
                        {oh.title}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {display} · {oh.time}
                      </p>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                      {oh.description}
                    </p>
                  </li>
                );
              })}
          </ul>
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
    <div className="space-y-1 border border-rule bg-surface-elevated p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        <Icon size={11} weight="bold" aria-hidden />
        {label}
      </p>
      <p className="text-[13px] font-medium text-neutral-900">{value}</p>
    </div>
  );
}
