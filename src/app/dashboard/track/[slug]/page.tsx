import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  Clock,
  ChalkboardTeacher,
  Lightning,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { computeCurrentWeek } from "@/lib/utils";
import { getProgram } from "@/lib/programs/server";
import { getTrackBySlug } from "@/lib/programs";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { toneForTrack } from "@/lib/track-visual";
import { WeekCarousel, type WeekCardData } from "@/components/week-carousel";
import { BracketLabel } from "@/components/bracket-label";

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

  // Archived gate: non-admin students cannot view archived builder-created courses.
  if (!isAdminViewer) {
    const svc = createServiceClient();
    const { data: programRow } = await svc
      .from("programs")
      .select("id")
      .eq("slug", program.slug)
      .maybeSingle<{ id: string }>();
    if (programRow) {
      const { data: overrideRow } = await svc
        .from("track_overrides")
        .select("archived_at")
        .eq("program_id", programRow.id)
        .eq("track_slug", slug)
        .maybeSingle<{ archived_at: string | null }>();
      if (overrideRow?.archived_at) {
        return (
          <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16 text-center space-y-3">
            <Archive size={40} className="mx-auto text-neutral-400" aria-hidden />
            <h1 className="text-xl font-bold text-neutral-900">This course has ended</h1>
            <p className="text-sm text-neutral-500">
              {track.name} is no longer active. Reach out to your instructor if you have questions.
            </p>
          </div>
        );
      }
    }
  }

  // Single-event tracks don't have weeks to scrub — send them straight to
  // the session page (same destination the dashboard card used to use).
  if (track.type === "single-event") {
    redirect(`/dashboard/track/${slug}/1`);
  }

  const now = new Date();
  const started = !track.startDateTbd && now >= new Date(track.startDate);
  const currentWeek = track.selfPaced
    ? started ? 1 : 0
    : started
      ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
      : 0;

  const ctaWeek = started ? currentWeek : 1;
  const ctaLabel = started
    ? `Open current week — Week ${currentWeek}`
    : "Open Week 1";

  // Track-level description if authored, else fall back to week 1's
  // description (every track has one written and it's already framing copy).
  const overviewCopy = track.description ?? track.weeks[0]?.description ?? "";

  const tone = toneForTrack(slug);

  const weekCards: WeekCardData[] = track.weekSummaries.map((ws) => {
    const isCurrent = started && ws.week === currentWeek;
    const isPast = started && ws.week < currentWeek;
    const weekConfig = track.weeks.find((w) => w.week === ws.week);
    const comingSoonUntil = weekConfig?.comingSoonUntil;
    const isLocked = !!comingSoonUntil && now < new Date(comingSoonUntil);
    const lockedLabel = isLocked ? "soon" : null;
    return {
      week: ws.week,
      topic: ws.topic,
      icon: ws.icon,
      href: isLocked ? null : `/dashboard/track/${slug}/${ws.week}`,
      isCurrent,
      isPast,
      isLocked,
      lockedLabel,
    };
  });

  const eyebrow = started ? `Week ${currentWeek} of ${track.totalWeeks}` : "";

  // Active announcements for this track (or program-wide). Mirrors the
  // dashboard's banner — single-track students land here directly and skip
  // the dashboard, so announcements must be visible on this page too.
  const svcAnnouncements = createServiceClient();
  const { data: announcementRows } = await svcAnnouncements
    .from("announcements")
    .select("id, message, track_slug, created_at")
    .gt("expires_at", new Date().toISOString())
    .or(`track_slug.eq.${slug},track_slug.is.null`)
    .order("created_at", { ascending: false })
    .limit(5);
  const announcements = announcementRows ?? [];

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

      {announcements.map((a) => (
        <div
          key={a.id}
          className="border-l-2 border-blue-500 bg-blue-50 px-4 py-3 sm:px-5 sm:py-4"
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700 mb-1">
            {a.track_slug ? track.shortName : "Announcement"}
          </p>
          <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{a.message}</p>
        </div>
      ))}

      {/* Hero — the tone-tinted block frames a 2×5 grid of weekly topics, so
         it doubles as the curriculum-at-a-glance and as week-level navigation.
         Each cell links to its week page; current week is inset-ringed in the
         track tone. Replaces a previous decorative-icon hero. */}
      <header className="space-y-5">
        <div
          className="relative w-full overflow-hidden p-5 sm:p-7"
          style={{ backgroundColor: `${tone}1A` }}
        >
          <WeekCarousel weeks={weekCards} tone={tone} emojiIcons={track.emojiIcons} />
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
          <BracketLabel>
            {eyebrow && <>{eyebrow}<span aria-hidden className="mx-0.5 text-white/40">·</span></>}
            {track.totalWeeks}-week track
          </BracketLabel>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            {track.name}
          </h1>
          {overviewCopy && (
            <p className="mt-3 text-base leading-relaxed text-neutral-600 whitespace-pre-wrap">
              {overviewCopy}
            </p>
          )}
        </div>

        <div>
          <Link
            href={`/dashboard/track/${slug}/${ctaWeek}`}
            className="inline-flex items-center gap-2 bg-true-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:text-electric-green"
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
        className="grid grid-cols-3 gap-3"
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
                    {oh.joinUrl && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <a
                          href={oh.joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
                        >
                          Join the call
                          →
                        </a>
                        {oh.dialIn && (
                          <span className="text-xs text-neutral-500">
                            Or dial: {oh.dialIn}
                          </span>
                        )}
                      </div>
                    )}
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
