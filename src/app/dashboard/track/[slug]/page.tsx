import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  Clock,
  ChalkboardTeacher,
  Lightning,
  ArrowRight,
  Medal,
} from "@phosphor-icons/react/dist/ssr";
import { computeCurrentWeek } from "@/lib/utils";
import { resolveTrackProgram } from "@/lib/programs/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { WeekCarousel, type WeekCardData } from "@/components/week-carousel";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui";
import { getTrackProgressMap } from "@/app/dashboard/track/actions";
import { getAllSessionContent } from "@/app/dashboard/admin/actions-tracks";
import { isSequentialGated, highestUnlockedWeek } from "@/lib/track-gating";
import { buildGoogleCalendarUrl } from "@/lib/gcal";
import { MyProgressCard } from "@/components/my-progress-card";
import { getLearnerProgress } from "@/lib/learner-progress";
import { HoldingView } from "@/components/holding-view";
import { getLandingHeroForTrack } from "@/lib/landing-pages";
import { getOnboardingChecklist, getOnboardingStatus } from "@/lib/onboarding/checklists";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

export const dynamic = "force-dynamic";

export default async function TrackOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolveTrackProgram(slug);
  if (!resolved) redirect("/dashboard");
  const { program, track } = resolved;

  const ctx = await getSessionContext();
  const isAdminViewer = canAccessAdminPanel(ctx?.student?.role ?? "");

  // Enrollment gate: a non-admin learner can only open a track they're enrolled
  // in — no viewing another course's curriculum by typing the URL. (Pending
  // registrants are already confined to their own holding page by the layout;
  // this additionally stops ACTIVE learners from reaching other started tracks.)
  if (!isAdminViewer && ctx?.userId) {
    const { data: enr } = await createServiceClient()
      .from("student_tracks")
      .select("track_slug")
      .eq("student_id", ctx.userId)
      .eq("track_slug", slug)
      .maybeSingle();
    if (!enr) redirect("/dashboard");
  }

  // Acceptance checklist gate: on a checklist-gated track (e.g. the Cybersecurity
  // cohort), an accepted learner must complete their acceptance materials —
  // Intake Form, Participation Agreement, Pre-Survey — before reaching the
  // course. Start-date independent; admins/previewers bypass. Items a learner
  // already completed (read from survey_responses) auto-check.
  const checklist = getOnboardingChecklist(slug);
  if (checklist && !isAdminViewer && ctx?.userId) {
    const status = await getOnboardingStatus(createServiceClient(), ctx.userId, slug);
    if (status) {
      const studentName = [ctx.student?.first_name, ctx.student?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      const itemViews = checklist.items.map((it) => ({
        id: it.id,
        label: it.label,
        description: it.description,
        kind: it.kind,
        href: it.href,
        completed: status.items.find((s) => s.id === it.id)?.completed ?? false,
      }));
      return (
        <OnboardingChecklist
          title={checklist.title}
          intro={checklist.intro}
          items={itemViews}
          allComplete={status.allComplete}
          trackSlug={slug}
          programSlug={program.slug}
          cohort={checklist.cohort}
          defaultName={studentName || undefined}
        />
      );
    }
  }

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
            <Archive size={40} className="mx-auto text-ink-faint" aria-hidden />
            <h1 className="text-xl font-bold text-ink">This course has ended</h1>
            <p className="text-sm text-ink-soft">
              {track.name} is no longer active. Reach out to your instructor if you have questions.
            </p>
          </div>
        );
      }
    }
  }

  const now = new Date();
  const started = !track.startDateTbd && now >= new Date(track.startDate);

  // Holding page + curriculum lock. Before launch, a registered student sees a
  // confirmation + countdown — not the lessons. Registration earns a seat, not
  // the curriculum. Admins/previewers bypass so they can build ahead of launch.
  // Runs BEFORE the single-event redirect so a not-yet-started single-event
  // track shows the holding view here instead of bouncing to its session page.
  if (!isAdminViewer && !started) {
    const landingHero = await getLandingHeroForTrack(slug).catch(() => null);
    return (
      <HoldingView
        track={track}
        heroImageUrl={landingHero?.heroImageUrl}
        accent={landingHero?.accent}
      />
    );
  }

  // Single-event tracks don't have weeks to scrub — send them straight to
  // the session page (same destination the dashboard card used to use).
  if (track.type === "single-event") {
    redirect(`/dashboard/track/${slug}/1`);
  }

  const computedWeek = track.selfPaced
    ? started ? 1 : 0
    : started
      ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
      : 0;
  // On a day-gated cohort track (weeks are days with `comingSoonUntil` dates,
  // e.g. the Roblox bootcamp) `computeCurrentWeek` stays at 1 for the whole
  // camp, so the ring/CTA would point at Day 1 on Day 2. The latest day whose
  // unlock date has passed is the real "current" unit. Self-paced drip
  // releases keep their own pacing.
  const dateUnlockedThrough = track.selfPaced
    ? 0
    : Math.max(
        0,
        ...track.weeks
          .filter((w) => w.comingSoonUntil && now >= new Date(w.comingSoonUntil))
          .map((w) => w.week),
      );
  const currentWeek = Math.max(computedWeek, dateUnlockedThrough);

  const ctaWeek = started ? currentWeek : 1;
  // Per-track unit label ("Week" default, "Day" for a bootcamp, …).
  const unit = track.unitLabel || "Week";
  const unitLower = unit.toLowerCase();
  // Single "Week N" — the old "Open current week — Week N" said "week" twice.
  const ctaLabel = `Open ${unit} ${ctaWeek}`;

  // Track-level description if authored, else fall back to week 1's
  // description (every track has one written and it's already framing copy).
  const overviewCopy = track.description ?? track.weeks[0]?.description ?? "";

  // Sequential gating (opt-in, self-paced only) reads the student's per-week
  // progress. Admins preview the whole track, so they're never gated. Only
  // query progress when gating is actually active.
  const gated = !isAdminViewer && started && isSequentialGated(track);
  const progress = gated
    ? await getTrackProgressMap(slug).catch(() => ({ watched: [], submitted: [] }))
    : { watched: [], submitted: [] };
  const watchedSet = new Set(progress.watched);
  const submittedSet = new Set(progress.submitted);
  const unlockedThrough = gated
    ? highestUnlockedWeek(track, watchedSet, submittedSet)
    : track.totalWeeks;

  // DB session-content titles are the source of truth: an admin-edited week
  // title overrides the hardcoded config topic here too, so nothing leaks
  // through from the TS config once it's been edited in the admin panel.
  const sessionOverrides = await getAllSessionContent(slug).catch(() => []);
  const titleByWeek = new Map<number, string>();
  for (const row of sessionOverrides) {
    if (row.title) titleByWeek.set(row.week_number, row.title);
  }

  const weekCards: WeekCardData[] = track.weekSummaries.map((ws) => {
    const isCurrent = started && ws.week === currentWeek;
    const isPast = started && ws.week < currentWeek;
    const weekConfig = track.weeks.find((w) => w.week === ws.week);
    const comingSoonUntil = weekConfig?.comingSoonUntil;
    // Admins bypass (mirrors the week page guard) so instructors can prep
    // future sessions from the overview too.
    const comingSoonLocked =
      !isAdminViewer && !!comingSoonUntil && now < new Date(comingSoonUntil);
    const sequentialLocked = gated && ws.week > unlockedThrough;
    const isLocked = comingSoonLocked || sequentialLocked;
    const lockedLabel = comingSoonLocked ? "Coming soon" : sequentialLocked ? "Locked" : null;
    return {
      week: ws.week,
      topic: titleByWeek.get(ws.week) ?? ws.topic,
      icon: ws.icon,
      href: isLocked ? null : `/dashboard/track/${slug}/${ws.week}`,
      isCurrent,
      isPast,
      isLocked,
      lockedLabel,
    };
  });

  // Self-paced courses have no fixed weekly schedule, so a ticking "Week N of M"
  // is misleading — show "Self-paced · N weeks" instead. Otherwise lead with the
  // live week (once started) then the track length.
  const eyebrow = track.selfPaced
    ? `Self-paced · ${track.totalWeeks} ${unitLower}s`
    : started
      ? `${unit} ${currentWeek} of ${track.totalWeeks} · ${track.totalWeeks}-${unitLower} track`
      : `${track.totalWeeks}-${unitLower} track`;

  // Engagement card for actual learners — single-course students land here
  // instead of the dashboard home, so this is where their streak lives. Scoped
  // to this course; admins/previewers don't get it (it'd show their own data).
  const learnerProgress =
    !isAdminViewer && ctx?.userId
      ? await getLearnerProgress(ctx.userId, [slug], now).catch(() => null)
      : null;

  // Certificate of completion — issued by an admin when the student finishes.
  // When one exists, the overview celebrates it and links the PUBLIC
  // certificate page (shareable, no login).
  let certificateId: string | null = null;
  if (!isAdminViewer && ctx?.userId) {
    const { data: completion } = await createServiceClient()
      .from("track_completions")
      .select("certificate_id")
      .eq("student_id", ctx.userId)
      .eq("track_slug", slug)
      .maybeSingle();
    certificateId = (completion?.certificate_id as string | null) ?? null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-8">
      {isAdminViewer && (
        <div className="flex justify-end">
          <CopyInviteLink
            programSlug={program.slug}
            trackSlug={slug}
            fallbackDomain={program.domain}
          />
        </div>
      )}

      {/* Certificate earned — links the public, shareable certificate page. */}
      {certificateId && (
        <a
          href={`/certificate/${certificateId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 panel p-4 sm:p-5 transition-colors hover:border-ink-faint"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
            <Medal size={22} weight="fill" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">
              You earned your Certificate of Completion! 🎉
            </span>
            <span className="block text-xs text-ink-soft">
              View, print, or share your official certificate — the link works anywhere,
              no login needed.
            </span>
          </span>
          <ArrowRight
            size={16}
            className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </a>
      )}

      {/* Hero — the tone-tinted block frames a 2×5 grid of weekly topics, so
         it doubles as the curriculum-at-a-glance and as week-level navigation.
         Each cell links to its week page; current week is inset-ringed in the
         track tone. Replaces a previous decorative-icon hero. */}
      <header className="space-y-5">
        <div className="relative w-full overflow-hidden panel p-5 sm:p-7">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Jump to any {unitLower}
          </p>
          <WeekCarousel weeks={weekCards} emojiIcons={track.emojiIcons} unitLabel={unit} />
          {started && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1.5 rounded-full panel px-2.5 py-1 text-[11px] font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-highlight animate-pulse" />
                In progress
              </span>
            </div>
          )}
        </div>

        <div>
          <PageHeader
            eyebrow={eyebrow}
            title={track.name}
          />
          {overviewCopy && (
            <p className="mt-3 text-base leading-relaxed text-ink-soft whitespace-pre-wrap">
              {overviewCopy}
            </p>
          )}
        </div>

        <div>
          <Link
            href={`/dashboard/track/${slug}/${ctaWeek}`}
            className={`${buttonClass("primary", "md")} w-full justify-center text-[15px] shadow-sm sm:w-auto`}
          >
            {ctaLabel}
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </header>

      {learnerProgress && <MyProgressCard {...learnerProgress} />}

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
          value={`${track.totalWeeks} ${unitLower}s`}
        />
        <Fact
          icon={Lightning}
          label="Cadence"
          value={
            unitLower === "day"
              ? "Daily"
              : track.sessionsPerWeek > 1
                ? `${track.sessionsPerWeek}×/week`
                : "1×/week"
          }
        />
      </dl>

      {track.officeHours && track.officeHours.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Office Hours
          </h2>
          <ul className="divide-y divide-rule overflow-hidden panel">
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
                      <p className="text-sm font-semibold text-ink">
                        {oh.title}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {display} · {oh.time}
                      </p>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {oh.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {oh.joinUrl && (
                        <a
                          href={oh.joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonClass("dark", "md")}
                        >
                          Join the call
                          →
                        </a>
                      )}
                      <a
                        href={buildGoogleCalendarUrl({
                          title: oh.title,
                          date: oh.date,
                          details: [
                            oh.time,
                            oh.description,
                            oh.dialIn ? `Dial-in: ${oh.dialIn}` : "",
                          ]
                            .filter(Boolean)
                            .join("\n\n"),
                          location: oh.joinUrl,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClass("secondary", "md")}
                      >
                        Add to Google Calendar
                      </a>
                      {oh.dialIn && (
                        <span className="text-xs text-ink-soft">
                          Or dial: {oh.dialIn}
                        </span>
                      )}
                    </div>
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
    <div className="space-y-1 panel p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        <Icon size={11} weight="bold" aria-hidden />
        {label}
      </p>
      <p className="text-[13px] font-medium text-ink">{value}</p>
    </div>
  );
}
