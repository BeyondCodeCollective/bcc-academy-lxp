import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Medal,
  Megaphone,
} from "@phosphor-icons/react/dist/ssr";
import {
  resolveCurrentUnit,
  trackHasStarted,
  formatCohortTime,
  easternDayKey,
} from "@/lib/utils";
import { trackUnitDisplay, unitText } from "@/lib/programs/unit-display";
import { resolveTrackProgram } from "@/lib/programs/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { getPreviewTrackSlugs } from "@/lib/auth/preview-mode";
import { createServiceClient } from "@/lib/supabase/server";
import { buttonClass } from "@/components/ui";
import { getTrackProgressMap } from "@/app/dashboard/track/actions";
import { addDays } from "@/lib/ical";
import { type AgendaRow } from "@/components/course-agenda";
import { type CalendarEvent } from "@/components/track-calendar";
import { ScheduleTabs } from "@/components/schedule-tabs";
import type { TrackConfig } from "@/lib/programs/types";
import { getAllSessionContent } from "@/app/dashboard/admin/actions-tracks";
import { isSequentialGated, highestUnlockedWeek } from "@/lib/track-gating";
import { MyProgressCard } from "@/components/my-progress-card";
import { getLearnerProgress } from "@/lib/learner-progress";
import { getWhatsNew, type FeedItem } from "@/lib/whats-new";
import { HoldingView } from "@/components/holding-view";
import { PreStartBanner } from "@/components/pre-start-banner";
import { NextUpPanel } from "@/components/next-up-panel";
import {
  touchpointCandidates,
  resolveTouchpoint,
} from "@/lib/course-touchpoint";
import { getLandingHeroForTrack } from "@/lib/landing-pages";
import {
  getEnforcedOnboardingChecklist,
  getOnboardingStatus,
} from "@/lib/onboarding/checklists";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

export const dynamic = "force-dynamic";

export default async function TrackOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [resolved, ctx] = await Promise.all([
    resolveTrackProgram(slug),
    getSessionContext(),
  ]);
  if (!resolved) redirect("/dashboard");
  const { program, track } = resolved;
  const role = ctx?.student?.role ?? "";

  // A staffer previewing THIS track should see exactly what the student sees —
  // no admin overlay, no whole-program schedule, no gating bypass. Previewing a
  // DIFFERENT course leaves them as an admin viewer here. This is what lets an
  // instructor walk their own students' experience (the toggle is scoped to
  // their assigned courses in preview-actions).
  const previewingThisTrack = (await getPreviewTrackSlugs(role)).includes(slug);
  const isAdminViewer = canAccessAdminPanel(role) && !previewingThisTrack;

  // Enrollment gate: a non-admin learner can only open a track they're enrolled
  // in — no viewing another course's curriculum by typing the URL. Staff (incl.
  // a previewer, who needs no real student_tracks row) are exempt. (Pending
  // registrants are already confined to their own holding page by the layout;
  // this additionally stops ACTIVE learners from reaching other started tracks.)
  if (!canAccessAdminPanel(role) && ctx?.userId) {
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
    const status = await getOnboardingStatus(
      createServiceClient(),
      ctx.userId,
      slug,
    );
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

  // One program-id lookup shared by the archived gate and the What's-New feed
  // below — the identical query used to run twice per render.
  const { data: programRow } = await createServiceClient()
    .from("programs")
    .select("id")
    .eq("slug", program.slug)
    .maybeSingle<{ id: string }>();
  const programId = programRow?.id ?? null;

  // Archived gate: non-admin students cannot view archived builder-created courses.
  if (!isAdminViewer && programId) {
    const { data: overrideRow } = await createServiceClient()
      .from("track_overrides")
      .select("archived_at")
      .eq("program_id", programId)
      .eq("track_slug", slug)
      .maybeSingle<{ archived_at: string | null }>();
    if (overrideRow?.archived_at) {
      return (
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16 text-center space-y-3">
          <Archive size={40} className="mx-auto text-ink-faint" aria-hidden />
          <h1 className="text-xl font-bold text-ink">This course has ended</h1>
          <p className="text-sm text-ink-soft">
            {track.name} is no longer active. Reach out to your instructor if
            you have questions.
          </p>
        </div>
      );
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
  // may live at internal week 4. `numbered` is the track length to report.
  const { display, numbered } = trackUnitDisplay(track);
  // Fallback CTA (course over, not yet certified) — reopen the current unit.
  const ctaLabel = `Open ${unitText(display, ctaWeek, unit)}`;

  // Header carries who + how long; every date lives in the panel or the
  // schedule below, never twice.
  const metaLine = [track.instructor, `${numbered} ${unitLower}s`]
    .filter(Boolean)
    .join(" · ");

  // Track-level description if authored, else fall back to week 1's
  // description (every track has one written and it's already framing copy).
  const overviewCopy = track.description ?? track.weeks[0]?.description ?? "";

  // Sequential gating (opt-in, self-paced only) reads the student's per-week
  // progress. Admins preview the whole track, so they're never gated. Only
  // query progress when gating is actually active.
  const gated = !isAdminViewer && started && isSequentialGated(track);
  const progress = gated
    ? await getTrackProgressMap(slug).catch(() => ({
        watched: [],
        submitted: [],
      }))
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

  // Eyebrow: session position once started, track length before. An extra
  // (kickoff) has no number, so it announces itself by name.
  const currentDisplay = display.get(currentWeek);
  const eyebrow = track.selfPaced
    ? `Self-paced · ${numbered} ${unitLower}s`
    : currentDisplay?.number
      ? `${unit} ${currentDisplay.number} of ${numbered}`
      : currentDisplay
        ? currentDisplay.text
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
    if (programId) {
      whatsNew = await getWhatsNew({
        userId: ctx.userId,
        programId,
        tracks: feedTracks,
        includeTrackName: feedTracks.length > 1,
        now,
        limit: 4,
      }).catch(() => []);
    }
  }

  // Tracks folded into this course's panel + schedule, so a Wednesday
  // coaching session can't go invisible on a Tue/Thu course. Two sources:
  // declared companions (companionOf === this course — MASS wraps around the
  // WHOLE Security+ cohort, so every viewer sees it, admins included) plus
  // anything else the viewer is personally co-enrolled in. Configs are
  // already on `program.tracks`, so the only fetch is the enrollment lookup.
  const otherSlugs = new Set<string>(
    program.tracks.filter((t) => t.companionOf === slug).map((t) => t.slug),
  );
  if (ctx?.userId) {
    const { data: enrolled } = await createServiceClient()
      .from("student_tracks")
      .select("track_slug")
      .eq("student_id", ctx.userId);
    for (const r of enrolled ?? []) {
      const s = r.track_slug as string;
      if (s !== slug) otherSlugs.add(s);
    }
  }
  // Staff carry no enrollments, so without this an admin/instructor viewing a
  // course would see only its declared companions (MASS) and miss cohort
  // electives like the Tech and AI Hangout. Show staff the whole program's
  // schedule; undated tracks yield no rows, so this only adds real sessions.
  if (isAdminViewer) {
    for (const t of program.tracks) {
      if (t.slug !== slug) otherSlugs.add(t.slug);
    }
  }
  const companionTracks: TrackConfig[] = program.tracks.filter((t) =>
    otherSlugs.has(t.slug),
  );

  // ── The panel: live / today / upcoming, across the course + its companions ──
  // A candidate from ANOTHER course (e.g. the Tech and AI Hangout surfacing on
  // the Security+ page because it meets earlier the same day) must name that
  // course — otherwise "Week 1" reads as this course's Week 1. MASS already
  // self-labels ("MASS coaching"), so it's left alone.
  const touchpoint = resolveTouchpoint(
    [
      ...touchpointCandidates(track, titleByWeek),
      ...companionTracks.flatMap((t) =>
        touchpointCandidates(t).map((c) => {
          if (c.isMass) return c;
          // Fold the course name into one label and clear the title, so an
          // untitled unit (topic === "Week 1") reads "Tech and AI Hangout ·
          // Week 1", not "… · Week 1 · Week 1".
          const topic = c.title && c.title !== c.unitLabel ? c.title : c.unitLabel;
          return { ...c, unitLabel: `${t.shortName} · ${topic}`, title: "" };
        }),
      ),
    ],
    now,
  );

  // ── The schedule (one agenda) — every session, named, chronological ──
  const isMassSlug = (s: string) => s === "mass" || s.startsWith("mass-");
  const rowsForTrack = (
    t: TrackConfig,
    titles: Map<number, string> | undefined,
    locked: (week: number) => boolean,
  ): AgendaRow[] => {
    if (t.startDateTbd || !t.startDate) return [];
    const { display: disp } = trackUnitDisplay(t);
    const u = t.unitLabel || "Week";
    const mass = isMassSlug(t.slug);
    // Rows from a co-enrolled course carry that COURSE's name, not its unit
    // numbering — "Week 1: Week 1" on the Security+ calendar identifies
    // nothing; "Tech and AI Hangout" does. (MASS keeps its own label.)
    const own = t.slug === slug;
    const sessions = t.weekSummaries.map((ws): AgendaRow => {
      const date = (ws.date ?? addDays(t.startDate, (ws.week - 1) * 7)).slice(
        0,
        10,
      );
      const unitLabel = unitText(disp, ws.week, u);
      const topic = titles?.get(ws.week) ?? ws.topic;
      // An untitled unit's topic is its own label ("Week 1") — saying it
      // twice is noise everywhere it renders.
      const placeholder = topic === unitLabel;
      const label = mass ? "MASS" : own ? (placeholder ? undefined : unitLabel) : undefined;
      const title = mass || own
        ? topic
        : placeholder
          ? t.shortName
          : `${t.shortName} · ${topic}`;
      return {
        date,
        label,
        title,
        href: locked(ws.week)
          ? undefined
          : `/dashboard/track/${t.slug}/${ws.week}`,
        kind: mass ? "mass" : "session",
        time: ws.time ? formatCohortTime(ws.time) : undefined,
        sortTime: ws.time,
      };
    });
    const officeHours = (t.officeHours ?? []).map((item): AgendaRow => ({
      date: item.date,
      title: item.title,
      // officeHours carry office-hours / speaker / event — never a session.
      kind:
        !item.type || item.type === "office-hours" ? "office-hours" : "event",
      time: item.time || undefined,
    }));
    return [...sessions, ...officeHours];
  };

  // Primary lock: before start everything's shut; after, honor comingSoon and
  // sequential gating so the agenda can't jump a learner past a locked session
  // (the week page would just bounce them back here).
  const primaryLocked = (week: number): boolean => {
    if (preStart) return true;
    const wc = track.weeks.find((w) => w.week === week);
    if (
      !isAdminViewer &&
      wc?.comingSoonUntil &&
      now < new Date(wc.comingSoonUntil)
    )
      return true;
    if (gated && week > unlockedThrough) return true;
    return false;
  };

  // Chronological within a day (6:00 PM Hangout above 6:30 PM MASS) — the
  // month grid renders a day's chips in array order, so order the source.
  const agendaRows: AgendaRow[] = [
    ...rowsForTrack(track, titleByWeek, primaryLocked),
    ...companionTracks.flatMap((t) =>
      rowsForTrack(t, undefined, () => !trackHasStarted(t, now)),
    ),
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.sortTime ?? "99:99").localeCompare(b.sortTime ?? "99:99"),
  );

  const todayISO = easternDayKey(now);

  // The month-grid view of the same schedule. Carries each row's href, so a
  // locked (pre-start / coming-soon) session doesn't link there either.
  const calendarEvents: CalendarEvent[] = agendaRows.map((r) => ({
    date: r.date,
    type: r.kind,
    title: r.label ? `${r.label}: ${r.title}` : r.title,
    href: r.href,
    time: r.time,
  }));

  // The feed is a line, not a card: one item, the most recent.
  const latestNews = whatsNew[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-8">
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
              View, print, or share your official certificate — the link works
              anywhere, no login needed.
            </span>
          </span>
          <ArrowRight
            size={16}
            className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </a>
      )}

      {/* 0 — course cover, when the course has artwork. Full design, natural
         aspect (the instructor's banner is a composed poster — cropping it
         cuts its own text). Decorative: the header right below carries the
         course identity for screen readers. */}
      {track.coverImageUrl && (
        <div className="overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={track.coverImageUrl} alt={track.name} className="block h-auto w-full" />
        </div>
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

      {/* 2 — the one thing to do now. Before day one that's the start + a way to
         calendar it; once running, the live / today / next session. */}
      {preStart ? (
        <PreStartBanner track={track} />
      ) : touchpoint ? (
        <NextUpPanel touchpoint={touchpoint} />
      ) : (
        <Link
          href={`/dashboard/track/${slug}/${ctaWeek}`}
          className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-rule border-l-[3px] border-l-primary bg-surface-elevated px-4 py-3.5 transition-colors hover:bg-paper-tint-soft"
        >
          <span className="min-w-[190px] flex-1 text-[14.5px] font-semibold leading-snug text-ink">
            {ctaLabel}
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
          <Megaphone
            size={15}
            className="mt-0.5 shrink-0 text-ink-faint"
            aria-hidden
          />
          <span className="min-w-0">
            <strong className="font-semibold text-ink">
              {latestNews.title}
            </strong>
            {latestNews.body ? ` — ${latestNews.body}` : ""}
            <span className="text-ink-faint">
              {" "}
              · {latestNews.whenLabel.toLowerCase()}
            </span>
          </span>
        </Link>
      )}

      {/* 3 — the whole schedule, one dataset in the viewer's choice of shape:
         a month calendar or a named list. */}
      {agendaRows.length > 0 && (
        <ScheduleTabs
          rows={agendaRows}
          events={calendarEvents}
          todayISO={todayISO}
          focusDate={touchpoint?.date ?? null}
        />
      )}

      {/* Progress is meaningless before day one — a 0% bar is decoration. */}
      {started && learnerProgress && <MyProgressCard {...learnerProgress} />}

      {overviewCopy && (
        <div
          className="border-t border-rule pt-4 prose prose-sm max-w-none text-ink-faint leading-relaxed prose-headings:text-ink prose-a:text-accent"
          dangerouslySetInnerHTML={{ __html: overviewCopy }}
        />
      )}
    </div>
  );
}
