import { redirect } from "next/navigation";
import Link from "next/link";
import { Archive, ArrowRight, Medal, Megaphone } from "@phosphor-icons/react/dist/ssr";
import {
  resolveCurrentUnit,
  trackHasStarted,
  formatCohortDate,
  formatCohortTime,
  resolveTrackEndDayKey,
  unitDateHasArrived,
} from "@/lib/utils";
import { trackUnitDisplay, unitText } from "@/lib/programs/unit-display";
import { resolveTrackProgram } from "@/lib/programs/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { buttonClass } from "@/components/ui";
import { getTrackProgressMap } from "@/app/dashboard/track/actions";
import { addDays } from "@/lib/ical";
import { meetingDaysLabel, breakWeekLabel } from "@/lib/course-summary";
import { type CalendarEvent } from "@/components/track-calendar";
import { CourseCalendarPanel } from "@/components/course-calendar-panel";
import { SessionList, type SessionRow } from "@/components/session-list";
import type { TrackConfig } from "@/lib/programs/types";
import { getAllSessionContent } from "@/app/dashboard/admin/actions-tracks";
import { isSequentialGated, highestUnlockedWeek } from "@/lib/track-gating";
import { MyProgressCard } from "@/components/my-progress-card";
import { getLearnerProgress } from "@/lib/learner-progress";
import { getWhatsNew, type FeedItem } from "@/lib/whats-new";
import { HoldingView } from "@/components/holding-view";
import { PreStartBanner } from "@/components/pre-start-banner";
import { getLandingHeroForTrack } from "@/lib/landing-pages";
import { getEnforcedOnboardingChecklist, getOnboardingStatus } from "@/lib/onboarding/checklists";
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
  const checklist = getEnforcedOnboardingChecklist(slug);
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
  const started = trackHasStarted(track, now);

  // Certificate of completion — issued by an admin when the student finishes.
  // Checked before the holding gate: a completed student is DONE with the
  // course, so a "hasn't started yet" countdown makes no sense for them —
  // they land on the overview with their certificate card instead.
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

  // Before day one a learner sees the real course with a banner on top, not a
  // countdown instead of it — the syllabus is what they're being asked to
  // commit to. Two cases still take the full holding page, because a banner
  // has nothing useful to say there: a TBD start date (no date to promise) and
  // a single-event track (which redirects straight to its session page below,
  // so a banner on this page would never be seen).
  const preStart = !isAdminViewer && !started && !certificateId;
  if (preStart && (track.startDateTbd || track.type === "single-event")) {
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

  // Day-gated camps advance by `comingSoonUntil` unlock date, not the 7-day
  // cycle. Shared with the redirect landing path + the classroom page so all
  // three always agree on which Day is current.
  const currentWeek = resolveCurrentUnit(track, now);

  // A dated track reports 0 until its first unit's date arrives in ET, even
  // once `started` (which trips at midnight UTC — the prior evening here).
  // Never link to unit 0; there is no such page.
  const ctaWeek = currentWeek > 0 ? currentWeek : 1;
  // Per-track unit label ("Week" default, "Day" for a bootcamp, …).
  const unit = track.unitLabel || "Week";
  const unitLower = unit.toLowerCase();
  // Extras (a kickoff) render by name and don't consume a number, so "Session 3"
  // may live at internal week 4. `numbered` is what "Duration" should report.
  const { display, numbered } = trackUnitDisplay(track);
  // Single "Week N" — the old "Open current week — Week N" said "week" twice.
  const ctaLabel = `Open ${unitText(display, ctaWeek, unit)}`;

  // Dated units know which weekdays a cohort meets, so say "Tue & Thu" rather
  // than the abstract "2×/week". Extras are excluded: a Monday kickoff doesn't
  // make Security+ a Mon/Tue/Thu course.
  const teachingUnits = track.weekSummaries.filter((ws) => !ws.label);
  const cadence = meetingDaysLabel(teachingUnits, unitLower, track.sessionsPerWeek);

  const endDayKey = resolveTrackEndDayKey(track);
  const dateRange =
    !track.startDateTbd && endDayKey
      ? `${formatCohortDate(track.startDate, { month: "short", day: "numeric" }, "en-US")} – ${formatCohortDate(endDayKey, { month: "short", day: "numeric" }, "en-US")}`
      : null;

  // One sentence where three fact tiles used to be.
  const metaLine = [track.instructor, `${numbered} ${unitLower}s`, cadence, dateRange]
    .filter(Boolean)
    .join(" · ");

  const ctaDateLabel = (() => {
    const d = track.weekSummaries.find((ws) => ws.week === ctaWeek)?.date;
    if (!d) return null;
    const label = formatCohortDate(d, { weekday: "long", month: "long", day: "numeric" }, "en-US");
    return unitDateHasArrived(d, now) ? `Today · ${label}` : label;
  })();

  // The calendar's whole value in a line, so the month grid can stay collapsed.
  const breakWeek = breakWeekLabel(track.weekSummaries);
  const calendarSummary = `${numbered} ${unitLower}s, ${cadence}${breakWeek ? ` · no class ${breakWeek}` : ""}`;


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

  const sessionRows: SessionRow[] = track.weekSummaries.map((ws) => {
    const isCurrent = started && ws.week === currentWeek;
    const isPast = started && ws.week < currentWeek;
    const weekConfig = track.weeks.find((w) => w.week === ws.week);
    const comingSoonUntil = weekConfig?.comingSoonUntil;
    // Admins bypass (mirrors the week page guard) so instructors can prep
    // future sessions from the overview too.
    const comingSoonLocked =
      !isAdminViewer && !!comingSoonUntil && now < new Date(comingSoonUntil);
    const sequentialLocked = gated && ws.week > unlockedThrough;
    const isLocked = preStart || comingSoonLocked || sequentialLocked;
    // Before the course starts every unit is shut, but each one knows its own
    // date — say it, so the lock reads as a schedule and not as a failure.
    const lockedLabel = preStart
      ? `Opens ${formatCohortDate(ws.date ?? track.startDate, { weekday: "short", month: "short", day: "numeric" }, "en-US")}`
      : comingSoonLocked
        ? "Coming soon"
        : sequentialLocked
          ? "Locked"
          : null;
    return {
      week: ws.week,
      label: unitText(display, ws.week, unit),
      title: titleByWeek.get(ws.week) ?? ws.topic,
      dateLabel: ws.date
        ? formatCohortDate(ws.date, { weekday: "short", month: "short", day: "numeric" }, "en-US")
        : "",
      href: isLocked ? null : `/dashboard/track/${slug}/${ws.week}`,
      isCurrent,
      isPast,
      lockedLabel,
    };
  });

  // Self-paced courses have no fixed weekly schedule, so a ticking "Week N of M"
  // is misleading — show "Self-paced · N weeks" instead. Otherwise lead with the
  // live week (once started) then the track length.
  // An extra (kickoff) has no number, so it can't read "Kickoff of 16" — it
  // announces itself by name and lets the track length follow.
  const currentDisplay = display.get(currentWeek);
  const eyebrow = track.selfPaced
    ? `Self-paced · ${numbered} ${unitLower}s`
    : currentDisplay
      ? currentDisplay.number
        ? `${unit} ${currentDisplay.number} of ${numbered} · ${numbered}-${unitLower} track`
        : `${currentDisplay.text} · ${numbered}-${unitLower} track`
      : `${numbered}-${unitLower} track`;

  // Engagement card for actual learners — single-course students land here
  // instead of the dashboard home, so this is where their streak lives. Scoped
  // to this course; admins/previewers don't get it (it'd show their own data).
  const learnerProgress =
    !isAdminViewer && ctx?.userId
      ? await getLearnerProgress(ctx.userId, [slug], now).catch(() => null)
      : null;

  // Announcements + upcoming office hours. These are track-scoped, and this is
  // the page the learner actually lands on, so the feed lives here rather than
  // on a separate home. Scoped to this course and anything that wraps around it
  // (MASS accompanies Security+), so a coaching announcement isn't orphaned.
  let whatsNew: FeedItem[] = [];
  if (ctx?.userId) {
    const feedTracks = program.tracks.filter(
      (t) => t.slug === slug || t.companionOf === slug,
    );
    const { data: progRow } = await createServiceClient()
      .from("programs")
      .select("id")
      .eq("slug", program.slug)
      .maybeSingle<{ id: string }>();
    if (progRow) {
      whatsNew = await getWhatsNew({
        userId: ctx.userId,
        programId: progRow.id,
        tracks: feedTracks,
        includeTrackName: feedTracks.length > 1,
        now,
        limit: 4,
      }).catch(() => []);
    }
  }

  // ── Calendar ──────────────────────────────────────────────────────────────
  // Month-grid calendar of the learner's whole schedule: this track's weekly
  // sessions (dated from the syllabus) + its office-hours / MASS / speaker /
  // event items, PLUS the same for every OTHER track the viewer is co-enrolled
  // in — so a student taking Security+ and its MASS wraparound sees both sets
  // of dates in one calendar. MASS-track sessions render in the "mass" color so
  // they read distinctly from technical sessions.
  const sessionType = (s: string): CalendarEvent["type"] =>
    s === "mass" || s.startsWith("mass-") ? "mass" : "session";

  const eventsForTrack = (
    t: TrackConfig,
    titles?: Map<number, string>,
  ): CalendarEvent[] => [
    ...(!t.startDateTbd && t.startDate
      ? t.weekSummaries.map(
          (ws): CalendarEvent => ({
            date: ws.date ?? addDays(t.startDate, (ws.week - 1) * 7),
            type: sessionType(t.slug),
            title: titles?.get(ws.week) ?? ws.topic,
            href: `/dashboard/track/${t.slug}/${ws.week}`,
            time: ws.time ? formatCohortTime(ws.time) : undefined,
          }),
        )
      : []),
    ...(t.officeHours ?? []).map(
      (item): CalendarEvent => ({
        date: item.date,
        type: item.type ?? "office-hours",
        title: item.title,
        time: item.time || undefined,
      }),
    ),
  ];

  // Other tracks this viewer is co-enrolled in. Their configs are already on
  // `program.tracks` (Catalyst aggregates its DB tracks), so no extra fetch
  // beyond the enrollment lookup.
  let companionTracks: TrackConfig[] = [];
  if (ctx?.userId) {
    const { data: enrolled } = await createServiceClient()
      .from("student_tracks")
      .select("track_slug")
      .eq("student_id", ctx.userId);
    const otherSlugs = new Set(
      (enrolled ?? [])
        .map((r) => r.track_slug as string)
        .filter((s) => s !== slug),
    );
    companionTracks = program.tracks.filter((t) => otherSlugs.has(t.slug));
  }

  const calendarEvents: CalendarEvent[] = [
    ...eventsForTrack(track, titleByWeek),
    ...companionTracks.flatMap((t) => eventsForTrack(t)),
  ];
  const todayISO = now.toISOString().slice(0, 10);

  // The feed is a line, not a card: one item, the most recent.
  const latestNews = whatsNew[0] ?? null;

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

      {/* 1 — what course is this. The page used to open on a rail of session
         cards: navigation, above identity, duplicating the sidebar. */}
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 text-[27px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[30px]">
          {track.name}
        </h1>
        {/* Three fact tiles said one sentence. This is the sentence. */}
        <p className="mt-2 text-[13.2px] tabular-nums text-ink-faint">
          {metaLine}
        </p>
      </header>

      {/* 2 — when it happens. Before day one that's the start; after, it's the
         session to open next. */}
      {preStart ? (
        <PreStartBanner track={track} />
      ) : (
        <Link
          href={`/dashboard/track/${slug}/${ctaWeek}`}
          className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-rule border-l-[3px] border-l-primary bg-surface-elevated px-4 py-3.5 transition-colors hover:bg-paper-tint-soft"
        >
          <span className="min-w-[190px] flex-1">
            <span className="flex items-center gap-2 text-[14.5px] font-semibold leading-snug text-ink">
              {started && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-highlight" aria-hidden />
              )}
              {ctaLabel}
            </span>
            {ctaDateLabel && (
              <span className="mt-0.5 block text-xs tabular-nums text-ink-faint">
                {ctaDateLabel}
              </span>
            )}
          </span>
          <span className={`${buttonClass("primary", "sm")} shrink-0`}>
            Open
            <ArrowRight size={15} weight="bold" />
          </span>
        </Link>
      )}

      {/* Announcements: track-scoped and time-sensitive, so they sit above the
         syllabus — but a line, not a card. */}
      {latestNews && (
        <Link
          href={latestNews.href}
          target={latestNews.external ? "_blank" : undefined}
          rel={latestNews.external ? "noopener noreferrer" : undefined}
          className="flex items-start gap-2.5 rounded-lg bg-paper-tint-soft px-3 py-2.5 text-[12.9px] text-ink-soft transition-colors hover:bg-paper-tint"
        >
          <Megaphone size={15} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
          <span className="min-w-0">
            <strong className="font-semibold text-ink">{latestNews.title}</strong>
            {latestNews.body ? ` — ${latestNews.body}` : ""}
            <span className="text-ink-faint"> · {latestNews.whenLabel.toLowerCase()}</span>
          </span>
        </Link>
      )}

      {/* 3 — what happens, in order. */}
      <SessionList rows={sessionRows} unitLabelPlural={`${unitLower}s`} />

      {/* Progress is meaningless before day one — a 0% bar is decoration. */}
      {started && learnerProgress && <MyProgressCard {...learnerProgress} />}

      {/* 4 — the shape of the term, behind one line. */}
      {calendarEvents.length > 0 && (
        <CourseCalendarPanel
          events={calendarEvents}
          todayISO={todayISO}
          summary={calendarSummary}
        />
      )}

      {overviewCopy && (
        <p className="border-t border-rule pt-4 text-[12.9px] leading-relaxed text-ink-faint whitespace-pre-wrap">
          {overviewCopy}
        </p>
      )}
    </div>
  );
}

