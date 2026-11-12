import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveCurrentUnit, trackHasStarted, formatCohortDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import {
  ArrowLeft as ArrowLeftIcon,
  ArrowRight,
  CalendarPlus,
  Check,
} from "@phosphor-icons/react/dist/ssr";
import { isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server";
import { getSessionContent } from "@/app/dashboard/admin/actions";
import { resolveTrackProgram } from "@/lib/programs/server";
import { getTrackBySlug } from "@/lib/programs";
import { DB_TRACK_PREREQUISITES } from "@/lib/programs/field-ready";
import type { TrackGate } from "@/lib/programs/types";
import { hasCompletedTrack } from "@/lib/tracks/completion";
import { getSubmission, getReflection, getFeedback, getWeekProgress, getTrackProgressMap } from "@/app/dashboard/track/actions";
import { isSequentialGated, isDateGated, highestUnlockedWeek } from "@/lib/track-gating";
import { getEnforcedOnboardingChecklist, getOnboardingStatus } from "@/lib/onboarding/checklists";
import { canAccessAdminPanel } from "@/lib/roles";
import { SubmissionForm } from "@/components/submission-form";
import { RecordingCard } from "@/components/recording-card";
import { ExitSurveyForm } from "@/components/exit-survey-form";
import { ExitHoursPopup } from "@/components/exit-hours-popup";
import { getMyExitSurveys } from "@/app/dashboard/track/exit-survey-actions";
import { asksHours } from "@/lib/exit-survey";
import { ReflectionForm } from "@/components/reflection-form";
import { IntakeForm } from "@/components/intake-form";
import { LockedByPrerequisite } from "@/components/locked-by-prerequisite";
import { WeekKeyboardNav } from "@/components/week-keyboard-nav";
import { trackUnitDisplay, unitText } from "@/lib/programs/unit-display";
import { getSurveyStatus } from "@/app/dashboard/actions";
import { resolveSessionContent } from "@/lib/session-content";
import { ZoomEmbed } from "@/components/zoom-embed";
import { ResourceLink } from "@/components/resource-link";
import { sessionDates } from "@/lib/session-days";
import { parseZoomLink, isZoomLink } from "@/lib/zoom";
import { getSessionContext } from "@/lib/auth/session";
import { signRecordingUrl } from "@/lib/blob-recordings";
import { InstructorPanel } from "@/components/instructor-panel";
import {
  weekBtnPrimary,
  weekBtnQuiet,
  weekHeading,
  weekState,
  weekStateDone,
} from "@/components/week-page-ui";
import { takesCourseAsLearner } from "@/lib/auth/learner-first";

/**
 * Sessions that have a built stage (`./live`). Those open into the immersive
 * surface instead of the instructor chat panel — two entry points on one page
 * only makes a learner wonder which one is the real session.
 */
const STAGED_SESSIONS = new Set(["forward-deploy:1"]);

/**
 * A date typed onto the end of a session subtitle, e.g. "Domain 4 · Sep 3".
 * Content authored that way carries a second, frozen copy of the schedule.
 */
const TYPED_TRAILING_DATE =
  /\s*·\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s*\d{4})?\s*$/i;

export default async function TrackWeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; week: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug: trackSlug, week: weekStr } = await params;
  const weekNum = parseInt(weekStr, 10);

  const [resolved, gateCtx] = await Promise.all([
    resolveTrackProgram(trackSlug),
    getSessionContext(),
  ]);
  if (!resolved) redirect("/dashboard");
  const { program, track } = resolved;

  const weekContent = track.weeks.find((w) => w.week === weekNum);
  if (!weekContent) redirect("/dashboard");

  // Per-track unit label ("Week" default, "Day" for a bootcamp, …). Extras like
  // a kickoff render by name, so the displayed number can trail the internal one.
  const unit = track.unitLabel || "Week";
  const { display } = trackUnitDisplay(track);
  const unitName = unitText(display, weekNum, unit);

  // Curriculum lock: before launch, non-admins can't open lessons by direct URL
  // either — bounce them to the holding page (countdown). Mirrors the overview's
  // pre-start gate so registration never exposes content early.
  // Staff taking this course (Field Ready staff cohort) see it as a learner.
  const learnerHere =
    canAccessAdminPanel(gateCtx?.student?.role ?? "") &&
    !!gateCtx?.userId &&
    (await takesCourseAsLearner(gateCtx.userId, trackSlug));
  const gateIsAdmin = canAccessAdminPanel(gateCtx?.student?.role ?? "") && !learnerHere;
  // Enrollment gate: only an enrolled learner (or admin) can open this track's
  // lessons by URL — no peeking into a course you didn't join.
  if (!gateIsAdmin && gateCtx?.userId) {
    const { data: enr } = await createServiceClient()
      .from("student_tracks")
      .select("track_slug")
      .eq("student_id", gateCtx.userId)
      .eq("track_slug", trackSlug)
      .maybeSingle();
    if (!enr) redirect("/dashboard");
  }
  // Checklist gate: an unfinished acceptance checklist keeps lessons sealed
  // even by direct URL. The layout's confinement allows same-track paths (so
  // the checklist itself renders), which would otherwise leave week URLs as a
  // way past the track overview's gate once the course has started.
  if (!gateIsAdmin && gateCtx?.userId && getEnforcedOnboardingChecklist(trackSlug)) {
    const status = await getOnboardingStatus(createServiceClient(), gateCtx.userId, trackSlug);
    if (status && !status.allComplete) redirect(`/dashboard/track/${trackSlug}`);
  }

  const hasStarted = trackHasStarted(track);
  // Weeks-open-one-at-a-time cohorts (Field Ready) open Week 1 before day one.
  if (!gateIsAdmin && !hasStarted && !(isDateGated(track) && weekNum === 1)) {
    // Back to the course, which carries the pre-start banner ("Starts Monday,
    // July 13 · 6:30 PM EDT") and locked cards that each name their own date.
    // A dedicated locked page here would only restate that on an empty screen.
    redirect(`/dashboard/track/${trackSlug}`);
  }

  // Coming-soon guard. If the week has a `comingSoonUntil` date still in the
  // future, render a placeholder regardless of how the student got here —
  // direct URL, link, etc. The overview grid renders these cells as
  // non-clickable, but this catches anyone who hits the URL directly.
  // Admins bypass so instructors can prep future sessions.
  if (weekContent.comingSoonUntil && !gateIsAdmin) {
    const unlockDate = new Date(weekContent.comingSoonUntil);
    if (new Date() < unlockDate) {
      // Display via the noon-anchored helper — formatting the raw Date can
      // slip to the prior day when the value is a bare YYYY-MM-DD.
      const dateLabel = formatCohortDate(weekContent.comingSoonUntil, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      return (
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
          <Link
            href={`/dashboard/track/${trackSlug}`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink transition-colors py-2"
          >
            <ArrowLeft size={16} />
            Back to {track.shortName}
          </Link>
          <div className="border border-rule bg-neutral-50 p-8 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-2">
              {unitName}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {weekContent.title}
            </h1>
            <p className="mt-4 text-base text-ink-soft">
              This session opens on <strong>{dateLabel}</strong>.
            </p>
          </div>
        </div>
      );
    }
  }

  // Evaluate track gates. Each gate declares a condition that must be met
  // before the student can view content. We stop at the first unmet gate.
  const declaredGates = track.gates ?? (
    track.intakeRequired && track.intakeQuestions?.length
      ? [{ type: "intake" as const, surveyKey: trackSlug, questions: track.intakeQuestions }]
      : []
  );

  // `prerequisiteTrackSlug` has been in TrackConfig since the Catalyst journey
  // work and was read by nothing. This is where it starts meaning something.
  // DB-built tracks have no config of their own, so they declare theirs in
  // DB_TRACK_PREREQUISITES instead.
  const requiredTrack =
    track.prerequisiteTrackSlug ?? DB_TRACK_PREREQUISITES[trackSlug];
  const gates: TrackGate[] = requiredTrack
    ? [{ type: "prerequisite", trackSlug: requiredTrack }, ...declaredGates]
    : declaredGates;

  if (gates.length > 0 && isSupabaseConfigured()) {
    for (const gate of gates) {
      if (gate.type === "prerequisite") {
        const done = await hasCompletedTrack(gate.trackSlug);
        if (!done) {
          const required = getTrackBySlug(program, gate.trackSlug);
          return (
            <LockedByPrerequisite
              trackName={track.name}
              requiredSlug={gate.trackSlug}
              requiredName={required?.name ?? "the previous phase"}
            />
          );
        }
        continue;
      }

      if (gate.type === "intake") {
        const intakeStatus = await getSurveyStatus(`intake-${gate.surveyKey}`);
        if (!intakeStatus.completed) {
          return (
            <div className="mx-auto w-full max-w-2xl py-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink transition-colors mb-2 py-2 px-4 sm:px-5"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>
              <IntakeForm
                trackSlug={trackSlug}
                trackName={track.name}
                programSlug={program.slug}
                questions={gate.questions}
              />
            </div>
          );
        }
      }
    }
  }

  const now = new Date();
  const trackStarted = trackHasStarted(track, now);
  // Shared with the redirect + overview: advances to the current Day on a
  // day-gated camp instead of pinning at Day 1 all week.
  const currentWeek = resolveCurrentUnit(track, now);

  // One week at a time on a cohort track: a future week bounces to the course
  // page, whose schedule shows it locked with its date (same as pre-start).
  if (!gateIsAdmin && isDateGated(track) && weekNum > Math.max(currentWeek, 1)) {
    redirect(`/dashboard/track/${trackSlug}`);
  }

  // Fetch session content, student progress, and current user in parallel
  const [sessionContent, weekProgress, sessionCtx, progressMap] = await Promise.all([
    isSupabaseConfigured() ? getSessionContent(trackSlug, weekNum) : null,
    isSupabaseConfigured() ? getWeekProgress(trackSlug, weekNum).catch(() => null) : null,
    isSupabaseConfigured() ? getSessionContext().catch(() => null) : null,
    isSupabaseConfigured() && isSequentialGated(track)
      ? getTrackProgressMap(trackSlug).catch(() => null)
      : null,
  ]);

  // Sequential gating (opt-in, self-paced only): a locked week renders a
  // placeholder regardless of how the student arrived. Admins preview freely.
  const isAdminViewer = canAccessAdminPanel(sessionCtx?.student?.role ?? "") && !learnerHere;
  if (progressMap && trackStarted && !isAdminViewer) {
    const unlockedThrough = highestUnlockedWeek(
      track,
      new Set(progressMap.watched),
      new Set(progressMap.submitted),
    );
    if (weekNum > unlockedThrough) {
      return (
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
          <Link
            href={`/dashboard/track/${trackSlug}`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink transition-colors py-2"
          >
            <ArrowLeft size={16} />
            Back to {track.shortName}
          </Link>
          <div className="border border-rule bg-neutral-50 p-8 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint mb-2">
              {unitName}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {weekContent.title}
            </h1>
            <p className="mt-4 text-base text-ink-soft">
              Finish <strong>{unitText(display, unlockedThrough, unit)}</strong> to unlock this {unit.toLowerCase()}.
            </p>
          </div>
        </div>
      );
    }
  }

  const {
    title: displayTitle,
    subtitle: displaySubtitle,
    description: displayDescription,
    objectives: displayObjectives,
    homeworkInstructions,
    meetingLinks,
    sessionStatuses,
    recordingUrls,
    resources,
  } = resolveSessionContent(weekContent, sessionContent);

  // Instructor mode: a session_lessons row means the AI instructor runs this
  // session in a hosted lab (src/lib/instructor). Data-driven, no flag.
  const { data: lessonRow } = await createServiceClient()
    .from("session_lessons")
    .select("week_number")
    .eq("track", trackSlug)
    .eq("week_number", weekNum)
    .maybeSingle();
  const hasInstructor = !!lessonRow;
  const hasStage = STAGED_SESSIONS.has(`${trackSlug}:${weekNum}`);

  // Submissions can be disabled per-week (e.g. Forte's conceptual weeks 1-2),
  // overriding the track-level default. When off, the homework checklist row
  // and the SubmissionForm both hide, and "completed" only requires the video.
  const trackSubmissionsEnabled = track.submissionsEnabled !== false;
  const weekSubmissionsEnabled =
    trackSubmissionsEnabled && weekContent.submissionsEnabled !== false;

  const adminMarkedComplete = sessionStatuses.every((s) => s === "completed");
  const studentCompleted = weekSubmissionsEnabled
    ? (weekProgress?.completed ?? false)
    : (weekProgress?.videoWatched ?? false);
  const isCompleted = trackStarted && (adminMarkedComplete || studentCompleted);
  const isCurrent = trackStarted && weekNum === currentWeek && !isCompleted;

  const hasRecording = weekContent.sessions.some((_, i) => !!recordingUrls[i]);

  // Recordings imported from Zoom live in a PRIVATE bucket and are stored as
  // `bucket:path`, not a URL — a signed URL written to the database would be
  // expired long before a student clicked it. Sign per request instead, and
  // pass anything already http(s) straight through (Drive links, YouTube, the
  // Zoom share links added by hand before the importer existed).
  const playbackUrls = await Promise.all(
    recordingUrls.map(async (raw) => {
      if (!raw) return raw;
      if (/^https?:\/\//i.test(raw)) return raw;
      // Vercel Blob (private): mint a presigned URL for this request.
      if (raw.startsWith("blob:")) {
        return await signRecordingUrl(raw.slice(5));
      }
      const match = /^([a-z0-9][a-z0-9-]*):(.+)$/i.exec(raw);
      if (!match) return raw;
      const [, bucket, objectPath] = match;
      const { data } = await createServiceClient()
        .storage.from(bucket)
        // Long enough to watch a three-hour class without the link dying
        // mid-playback.
        .createSignedUrl(objectPath, 60 * 60 * 6);
      return data?.signedUrl ?? null;
    }),
  );
  const showChecklist = isSupabaseConfigured() && weekSubmissionsEnabled;
  // Self-paced tracks unlock the watch button and the submission form on every
  // week regardless of `currentWeek` — the date gate only matches cohort-style
  // tracks. Without this, a self-paced track with a future `startDate` would
  // render videos and forms invisibly until launch day.
  // A week explicitly date-gated via `comingSoonUntil` unlocks the moment its
  // date passes: on a day-gated bootcamp `computeCurrentWeek` stays at 1 for
  // the whole camp (weeks are days), so without this Day 2 would be reachable
  // on July 8 but its video would stay hidden.
  const comingSoonPassed =
    !!weekContent.comingSoonUntil && now >= new Date(weekContent.comingSoonUntil);
  const unlocked =
    track.selfPaced ||
    isCurrent ||
    isCompleted ||
    weekNum < currentWeek ||
    comingSoonPassed ||
    (isDateGated(track) && weekNum === 1);

  // Exit survey: only for courses that turned it on, only for an enrolled
  // learner on an unlocked week. null = show nothing.
  const exitSurvey =
    track.exitSurveyEnabled && isSupabaseConfigured() && unlocked
      ? await getMyExitSurveys(trackSlug, weekNum).catch(() => null)
      : null;

  // The unit's scheduled clock (date + time) as the course schedule holds it —
  // the same row the live-join window and the unlock gate below read.
  const weekClock = track.weekSummaries.find((ws) => ws.week === weekNum);

  // "Session 1 · Mon, Nov 9" / "Session 2 · Thu, Nov 12": labels the
  // Materials groups and homework so learners know what's due before which class.
  const sessionDateList = sessionDates(
    weekClock?.date,
    weekContent.sessions.length,
    track.officeHours,
  );
  const todayET = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const groupMaterialsBySession =
    weekContent.sessions.length > 1 && resources.some((r) => (r.session ?? 1) > 1);

  const isSingleSession = weekContent.sessions.length === 1;
  // The date on this line comes from the schedule, never from the subtitle
  // text. Sessions were authored with the day typed in ("Domain 4 · Sep 3"),
  // which freezes on the day it was written: Security+ moved its back half two
  // weeks and every header still announced the original date — session 16 read
  // "Sep 3" on 2026-09-17, the evening it actually ran. Drop the typed date
  // when the schedule has one, and print the scheduled day instead.
  const scheduledDay = weekClock?.date
    ? formatCohortDate(weekClock.date, { weekday: "short", month: "short", day: "numeric" })
    : null;
  const subtitleSansDate = scheduledDay
    ? (displaySubtitle ?? "").replace(TYPED_TRAILING_DATE, "").trim()
    : displaySubtitle;
  // Multi-session weeks print each session's day in the session picker, so
  // only a single-session week carries its day and time on this line.
  const headerMeta = [
    unitName,
    track.instructor,
    subtitleSansDate,
    isSingleSession ? scheduledDay : null,
    isSingleSession ? weekContent.sessions[0].time : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Zoom embed: resolve which sessions have active Zoom links.
  // `|| "Student"` matters: invite-created accounts start with EMPTY names and
  // the Zoom SDK hard-fails the join ("userName is empty") on a blank name.
  const zoomUserName =
    (sessionCtx?.student
      ? `${sessionCtx.student.first_name} ${sessionCtx.student.last_name}`.trim()
      : "") || "Student";
  const zoomUserEmail = sessionCtx?.student?.email ?? sessionCtx?.userEmail ?? "";
  // A session whose date has passed must not offer a live join. The only signal
  // here used to be an admin ticking "completed" on the session, and nobody does
  // that — so every past class kept rendering a live Zoom embed under a red LIVE
  // NOW badge, spinning on "Connecting to session…" forever. Two signals decide
  // it instead, neither of which needs anyone to remember anything:
  //
  //   · a recording exists — that IS the proof the session already happened, and
  //     it's what should occupy the slot the live video had, and
  //   · the week is behind the current one.
  //
  // SessionInfo carries only a title and a time, so there is no per-session
  // calendar date to compare; `weekNum < currentWeek` is the date signal the
  // track config actually supports.
  const weekIsPast = trackStarted && weekNum < currentWeek;
  // When the unit carries a real clock window (date + time + duration from the
  // schedule editor), use it: once the session is over — plus a 30-minute
  // grace for overruns — stop offering the live join even on the CURRENT
  // unit. The welcome-day pages showed "LIVE NOW · Connecting…" all afternoon
  // after the session ended (2026-08-07), which read as broken and buried the
  // replay. Units without a clock keep the existing week-based behavior.
  const sessionWindowPassed = (() => {
    if (!weekClock?.date || !weekClock.time) return false;
    const [h, m] = weekClock.time.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
    // ET wall clock → instant: derive the UTC offset for that calendar day.
    const noonUtc = new Date(`${weekClock.date}T12:00:00Z`);
    const etHourAtNoonUtc = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        hour12: false,
      }).format(noonUtc),
    );
    const offsetHours = 12 - etHourAtNoonUtc; // 4 during EDT, 5 during EST
    const [y, mo, d] = weekClock.date.split("-").map(Number);
    const start = Date.UTC(y, mo - 1, d, h + offsetHours, m);
    const durationMs = (weekClock.durationMinutes ?? 90) * 60_000;
    const graceMs = 30 * 60_000;
    return now.getTime() > start + durationMs + graceMs;
  })();
  // Mirror gate for the other direction: a dated session must not offer a
  // live join BEFORE its calendar day either. Monday's Day 1 rendered
  // "LIVE NOW · Connecting…" on the Friday before (2026-08-07) — a spinner
  // pretending a future class is live.
  const sessionDayFuture = (() => {
    if (!weekClock?.date) return false;
    const todayET = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    return weekClock.date > todayET;
  })();
  // Mirror gate for a day that's fully over: a dated session must not offer a
  // live join AFTER its calendar day either, even when the schedule carries no
  // time. Security+'s Aug 27 study session (dated, untimed) kept a live Zoom
  // embed up five days later — above that same session's replay — and the
  // recurring room happened to be live with a different class (2026-09-01).
  const sessionDayPassed = (() => {
    if (!weekClock?.date) return false;
    const todayET = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    return weekClock.date < todayET;
  })();
  // A recording's presence implies the session happened — but ONLY for
  // past weeks. On the CURRENT unit a stray recording (seeded by course
  // setup, or imported early) must never hide the live Join: it blocked
  // students out of Endless Bootcamp's Presentation Day for two hours
  // (2026-08-06). Current unit → Join stays up unless an admin explicitly
  // marks the session completed or the unit's calendar day is over.
  // The clock gates above describe the week's FIRST session. A later session
  // with its own scheduled day (Field Ready: Mon kickoff, Thu workshop) is
  // gated on that day instead, or Monday being over would hide Thursday's join.
  const liveGateOpen = (i: number) => {
    const ownDate = i > 0 ? sessionDateList[i] : null;
    const dayOpen = ownDate
      ? ownDate === todayET
      : !sessionWindowPassed && !sessionDayFuture && !sessionDayPassed;
    return (
      sessionStatuses[i] !== "completed" &&
      !weekIsPast &&
      dayOpen &&
      (weekNum === currentWeek || !recordingUrls[i])
    );
  };
  const zoomSessions = weekContent.sessions
    .map((session, i) => ({
      index: i,
      session,
      parsed: meetingLinks[i] ? parseZoomLink(meetingLinks[i]!) : null,
      isActive: liveGateOpen(i),
    }))
    .filter((s) => s.parsed !== null && s.isActive);
  // Non-Zoom links render a "Join Session" panel instead of an embed (single-
  // session units only — mirrors the JSX gate below).
  const nonZoomLive =
    weekContent.sessions.length === 1 &&
    !!meetingLinks[0] &&
    !isZoomLink(meetingLinks[0]) &&
    liveGateOpen(0);
  // A live join and that session's replay must NEVER render together: while a
  // join is up the replay hides; once the join retires the replay is the only
  // surface left. (Both at once read as broken and invite students into
  // whatever is currently live on a recurring room.)
  const liveNow = new Set<number>([
    ...zoomSessions.map((s) => s.index),
    ...(nonZoomLive ? [0] : []),
  ]);

  const prevWeek = weekNum > 1 ? weekNum - 1 : null;
  const nextWeek = weekNum < track.totalWeeks ? weekNum + 1 : null;

  // ─── Stage copy ──────────────────────────────────────────────────────
  // The first paragraph of the session description is the hook — the thing
  // worth reading before anything else on the page. It moves onto the stage;
  // the rest of the description stays in Notes, which picks up right
  // where the hook left off. A description with no leading <p> just leaves the
  // stage without a blurb; nothing breaks.
  const { lede: stageBlurb, rest: briefHtml } = splitLede(displayDescription);

  const liveLabel = (() => {
    if (!weekClock?.date) return undefined;
    const day = formatCohortDate(weekClock.date, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!weekClock.time) return `Live cohort session — ${day}`;
    const [h, m] = weekClock.time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `Live cohort session — ${day} at ${h12}:${String(m).padStart(2, "0")} ${ampm} ET`;
  })();

  // "Add to calendar" reuses the .ics endpoint the registration emails already
  // link to (/api/calendar/event) — no auth, no DB, it only describes an event.
  // A later session in the week has its own day; the schedule holds one clock
  // per week, so it borrows the week's start time.
  const calendarHrefFor = (date: string | null | undefined, session: number) => {
    if (!date) return undefined;
    const [y, mo, d] = date.split("-").map(Number);
    const [h, mi] = (weekClock?.time ?? "18:30").split(":").map(Number);
    const noonUtc = new Date(`${date}T12:00:00Z`);
    const etHourAtNoonUtc = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        hour12: false,
      }).format(noonUtc),
    );
    const offsetHours = 12 - etHourAtNoonUtc;
    const startMs = Date.UTC(y, mo - 1, d, (h ?? 18) + offsetHours, mi ?? 30);
    const endMs = startMs + (weekClock?.durationMinutes ?? 90) * 60_000;
    const q = new URLSearchParams({
      title: `${track.shortName}: ${displayTitle}`,
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      details: `${unitName} — ${track.name}`,
      uid:
        session === 0
          ? `${trackSlug}-${weekNum}@bccacademy.io`
          : `${trackSlug}-${weekNum}-${session + 1}@bccacademy.io`,
    });
    return `/api/calendar/event?${q.toString()}`;
  };
  const calendarHref = calendarHrefFor(weekClock?.date, 0);

  // ─── One session at a time ───────────────────────────────────────────
  // The page shows a single session: the same blocks in the same order every
  // time (Session, Notes, Your work, Survey), and only what is inside the
  // first block changes with the session's state. A multi-session week picks
  // the session from `?session=N`; the picker above the blocks is plain links.
  const sessionCount = weekContent.sessions.length;
  type SessionState = "live" | "ended" | "upcoming" | "open";
  const sessionStates: SessionState[] = weekContent.sessions.map((_, i) => {
    // A later session with its own date (Field Ready's Thursday) ends on its
    // own day, not when Monday's window passes, and is upcoming until then.
    const ownDate = i > 0 ? sessionDateList[i] : null;
    const windowPassed = ownDate
      ? ownDate < todayET
      : sessionWindowPassed || (i === 0 && sessionDayPassed);
    const notYet = ownDate ? ownDate > todayET : i === 0 && sessionDayFuture;
    if (liveNow.has(i)) return "live";
    if (
      sessionStatuses[i] === "completed" ||
      !!recordingUrls[i] ||
      weekIsPast ||
      windowPassed
    ) {
      return "ended";
    }
    return notYet ? "upcoming" : "open";
  });
  // Default: whatever is live, else the newest session that has started, so
  // the page opens on the thing a learner can act on right now.
  const { session: sessionParam } = await searchParams;
  const asked = Number(sessionParam);
  const defaultSession = (() => {
    const live = sessionStates.indexOf("live");
    if (live >= 0) return live;
    for (let i = sessionCount - 1; i >= 0; i--) {
      if (sessionStates[i] !== "upcoming") return i;
    }
    return 0;
  })();
  const sel =
    Number.isInteger(asked) && asked >= 1 && asked <= sessionCount
      ? asked - 1
      : defaultSession;
  const selState = sessionStates[sel];
  const selSession = weekContent.sessions[sel];
  const selDate = sessionDateList[sel];
  const dayText = (date: string | null) =>
    date
      ? formatCohortDate(date, { weekday: "short", month: "short", day: "numeric" })
      : null;

  // Session block: exactly one of live join, replay, "ended" note or
  // "starts on" card, plus the hosted lab on courses that run one.
  const selZoom =
    selState === "live" && meetingLinks[sel] ? parseZoomLink(meetingLinks[sel]!) : null;
  // Teams and Meet links open in a new tab. Offered while the session is live,
  // and on an undated session that has not ended (nothing else gates it).
  const selExternalJoin =
    !selZoom &&
    !!meetingLinks[sel] &&
    !isZoomLink(meetingLinks[sel]) &&
    (selState === "live" || selState === "open")
      ? meetingLinks[sel]!
      : null;
  // Never a replay under a live join for the same session. The config-level
  // video (a Drive link in the program config) stands in only when no session
  // has an uploaded recording, and belongs to the first session.
  const selReplay =
    selState === "live"
      ? null
      : (playbackUrls[sel] ??
        (sel === 0 && liveNow.size === 0 && !recordingUrls.some((u) => !!u)
          ? (weekContent.videoUrl ?? null)
          : null));
  const showLabStart = sel === 0 && hasStage && !sessionDayFuture;
  const showInstructor = sel === 0 && hasInstructor && !hasStage && !sessionDayFuture;
  const showEndedNote = selState === "ended" && !selReplay && !showLabStart && !showInstructor;
  const showUpcoming = selState === "upcoming" && !!selDate;
  const hasSessionBlock =
    !!selZoom ||
    !!selExternalJoin ||
    !!selReplay ||
    showLabStart ||
    showInstructor ||
    showEndedNote ||
    showUpcoming;
  // A builder course titles its sessions "Session N", which says nothing the
  // picker has not already said.
  const selTitle =
    !isSingleSession && selSession.title !== `Session ${sel + 1}` ? selSession.title : null;

  // Notes: what the instructor wrote for the session. The lab's stage already
  // prints the description's first paragraph, so Notes picks up after it.
  const notesHtml = showInstructor ? briefHtml : (displayDescription ?? "");
  const selResources = groupMaterialsBySession
    ? resources.filter((r) => Math.min(r.session ?? 1, sessionCount) === sel + 1)
    : resources;
  const hasNotes = !!notesHtml || displayObjectives.length > 0 || selResources.length > 0;

  // Your work: the week has one submission and one reflection, so both show
  // under whichever session is open, with that session's homework above them.
  const reflectionPrompts = weekContent.reflectionPrompts ?? track.defaultReflectionPrompts ?? [];
  const showReflection = track.reflectionsEnabled !== false && reflectionPrompts.length > 0;
  const hasWork =
    unlocked && isSupabaseConfigured() && (weekSubmissionsEnabled || showReflection);
  const selHomework =
    (homeworkInstructions.length > 1 ? homeworkInstructions[sel] : homeworkInstructions[0]) ||
    "";

  // Survey: open from the moment the session starts, live included.
  const hasSurvey = !!exitSurvey;
  const surveyOpen = selState === "live" || selState === "ended";
  const surveyRow = exitSurvey?.[sel + 1];

  // The rail: the open session's blocks, as jump links. A filled dot means
  // done, a dashed one means not available yet.
  const watched = weekProgress?.videoWatched ?? false;
  const turnedIn = weekProgress?.homeworkSubmitted ?? false;
  const rail: { href: string; label: string; dot: "todo" | "done" | "na" | "none" }[] = [
    ...(hasSessionBlock
      ? [
          {
            href: "#session",
            label: "Session",
            dot: showUpcoming
              ? ("na" as const)
              : selReplay && showChecklist
                ? watched
                  ? ("done" as const)
                  : ("todo" as const)
                : ("none" as const),
          },
        ]
      : []),
    ...(hasNotes ? [{ href: "#notes", label: "Notes", dot: "none" as const }] : []),
    ...(hasWork
      ? [
          {
            href: "#work",
            label: "Your work",
            dot: !weekSubmissionsEnabled
              ? ("none" as const)
              : turnedIn
                ? ("done" as const)
                : ("todo" as const),
          },
        ]
      : []),
    ...(hasSurvey
      ? [
          {
            href: "#survey",
            label: "Survey",
            dot: !surveyOpen
              ? ("na" as const)
              : surveyRow?.understanding != null
                ? ("done" as const)
                : ("todo" as const),
          },
        ]
      : []),
  ];

  const weekHref = (n: number) => `/dashboard/track/${trackSlug}/${n}`;
  const weekLinkLabel = (n: number) => {
    const name = display.get(n)?.text ?? `${unit} ${n}`;
    const title = track.weeks.find((w) => w.week === n)?.title;
    return title && title !== name ? `${name}: ${title}` : name;
  };
  const blockClass = "scroll-mt-24 py-7 first:pt-6 lg:py-9 lg:first:pt-8";
  const cardClass =
    "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg border border-rule bg-surface-elevated px-5 py-[18px]";

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-2 sm:px-5 xl:max-w-[980px]">
      <WeekKeyboardNav
        prevHref={prevWeek ? weekHref(prevWeek) : null}
        nextHref={nextWeek ? weekHref(nextWeek) : null}
      />

      {/* Plain header. The course is the breadcrumb above; the week's field
         banner is gone from this page so the session's work starts at the top. */}
      <header>
        <h1 className="text-balance text-[26px] font-bold leading-[1.15] text-ink lg:text-[32px]">
          {displayTitle}
        </h1>
        {headerMeta && <p className="mt-2 text-[15px] text-ink-soft">{headerMeta}</p>}
      </header>

      {/* Admin-only empty-state callout. Admins bypass the pre-start and
         coming-soon gates to prep future sessions, which means a contentless
         session renders as a silent blank page, indistinguishable from a bug
         (HFS Day 2, 2026-08-08). Name the state instead. Learners never see
         this: the gates redirect them or show the "opens on" placeholder. */}
      {isAdminViewer &&
        !displayDescription &&
        !(displayObjectives?.length) &&
        resources.length === 0 &&
        !hasRecording && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              Nothing here yet (admin preview)
            </p>
            <p className="mt-1 text-xs text-amber-800">
              This session has no description, objectives, resources, or recording, so
              learners will see an empty page once it unlocks. Add content in Manage
              Course → Session Content.
            </p>
          </div>
        )}

      {/* Monday hours question: before the first session of a week after week 1,
         once, until answered. */}
      {exitSurvey && asksHours(weekNum, 1) && weekNum === currentWeek && !exitSurvey[1]?.hours_text && (
        <ExitHoursPopup trackSlug={trackSlug} weekNumber={weekNum} />
      )}

      {/* Session picker, multi-session weeks only. Links, not tabs: each
         session is its own view of the page, and the state word tells a
         learner which one to open before they open it. */}
      {!isSingleSession && (
        <nav
          aria-label={`Sessions this ${unit.toLowerCase()}`}
          className="mt-5 grid gap-2 sm:gap-3 lg:mt-7"
          style={{ gridTemplateColumns: `repeat(${sessionCount}, minmax(0, 1fr))` }}
        >
          {weekContent.sessions.map((session, i) => (
            <Link
              key={i}
              href={`${weekHref(weekNum)}?session=${i + 1}`}
              scroll={false}
              aria-current={i === sel ? "true" : undefined}
              className={`flex min-h-16 flex-col items-start gap-1.5 rounded-lg border bg-surface-elevated p-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 ${
                i === sel
                  ? "border-ink shadow-[inset_0_0_0_1px_var(--ink)]"
                  : "border-rule hover:border-ink-faint"
              }`}
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-snug text-ink">
                  Session {i + 1}
                </span>
                <span className="block text-[13px] leading-snug text-ink-faint">
                  {[dayText(sessionDateList[i]), session.time].filter(Boolean).join(" · ")}
                </span>
              </span>
              <SessionStateWord state={sessionStates[i]} />
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-2 xl:grid xl:grid-cols-[minmax(0,680px)_180px] xl:gap-20">
        <div className="min-w-0">
          <div className="divide-y divide-rule">
            {hasSessionBlock && (
              <section id="session" className={blockClass}>
                <h2 className={weekHeading}>
                  Session
                  {isSingleSession && <SessionStateWord state={selState} />}
                </h2>
                {selTitle && <p className="-mt-1.5 mb-3.5 text-ink-soft">{selTitle}</p>}
                <div className="space-y-4">
                  {/* The meeting ID never appears in the DOM; learners join
                     through the SDK inside the frame. */}
                  {selZoom && (
                    <ZoomEmbed
                      meetingNumber={selZoom.meetingNumber}
                      password={selZoom.password}
                      userName={zoomUserName}
                      userEmail={zoomUserEmail}
                      trackSlug={trackSlug}
                      weekNumber={weekNum}
                      sessionNumber={sel + 1}
                      sessionTitle={selTitle ?? undefined}
                    />
                  )}

                  {selExternalJoin && (
                    <div className="grid aspect-video place-items-center rounded-lg bg-ink px-6 text-center">
                      <div>
                        <a
                          href={selExternalJoin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={weekBtnPrimary}
                        >
                          Join the live session
                        </a>
                        <p className="mt-3.5 text-sm text-[#c8c8cc]">Opens in a new tab</p>
                      </div>
                    </div>
                  )}

                  {selReplay && (
                    <RecordingCard
                      variant="plain"
                      url={selReplay}
                      title={isSingleSession ? "Session recording" : `Session ${sel + 1} recording`}
                      trackSlug={trackSlug}
                      weekNumber={weekNum}
                      showWatchButton={isSupabaseConfigured() && unlocked}
                      initialWatched={watched}
                    />
                  )}

                  {/* Between "session over" and "recording imported" this block
                     would otherwise be empty, which reads as broken (welcome
                     day, 2026-08-07). Say what is actually happening. */}
                  {showEndedNote && (
                    <div className={cardClass}>
                      <div>
                        <strong className="block font-semibold text-ink">This session has ended</strong>
                        <span className="text-[15px] text-ink-soft">
                          {weekNum === currentWeek && meetingLinks[sel]
                            ? "The recording is processing and will appear right here, usually within an hour or two."
                            : "No recording has been posted for it."}
                        </span>
                      </div>
                    </div>
                  )}

                  {showUpcoming && (
                    <div className={cardClass}>
                      <div>
                        <strong className="block font-semibold text-ink">
                          Starts {[dayText(selDate), selSession.time].filter(Boolean).join(" · ")}
                        </strong>
                        {(meetingLinks[sel] || (sel === 0 && hasInstructor)) && (
                          <span className="text-[15px] text-ink-soft">
                            {meetingLinks[sel]
                              ? "The join button appears here that morning."
                              : "Your session opens here that morning."}
                          </span>
                        )}
                      </div>
                      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        {calendarHrefFor(selDate, sel) && (
                          <a href={calendarHrefFor(selDate, sel)} className={weekBtnQuiet}>
                            <CalendarPlus size={18} aria-hidden />
                            Add to calendar
                          </a>
                        )}
                        {/* A facilitator gets into a staged session early to rehearse. */}
                        {sel === 0 && hasStage && isAdminViewer && (
                          <Link
                            href={`${weekHref(weekNum)}/live`}
                            className={weekBtnQuiet}
                          >
                            Staff preview: start session
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* A session with a built stage opens INTO it: this is the
                     only way in that is not typing the URL. */}
                  {showLabStart && (
                    <div className={cardClass}>
                      <div className="max-w-[52ch]">
                        <strong className="block font-semibold text-ink">{displayTitle}</strong>
                        <span className="text-[15px] text-ink-soft">
                          Ninety minutes, four parts, and an instructor who talks you through
                          it. You answer as you go: nothing to install, and you never write
                          code. Turn your sound on before you start.
                        </span>
                      </div>
                      <Link href={`${weekHref(weekNum)}/live`} className={weekBtnPrimary}>
                        Start {unitName}
                        <ArrowRight size={16} aria-hidden />
                      </Link>
                    </div>
                  )}

                  {/* The hosted lab. Idle, it renders as its own stage; once
                     the learner starts, it becomes the live conversation. */}
                  {showInstructor && (
                    <InstructorPanel
                      trackSlug={trackSlug}
                      weekNumber={weekNum}
                      unitName={unitName}
                      sessionTitle={displayTitle}
                      firstName={gateCtx?.student?.first_name ?? null}
                      initiallyComplete={watched}
                      stage={{
                        headline: stageBlurb ? undefined : displayTitle,
                        blurb: stageBlurb || undefined,
                        liveLabel,
                        calendarHref,
                        startNote: "You can stop and pick it up later.",
                      }}
                    />
                  )}
                </div>
              </section>
            )}

            {hasNotes && (
              <section id="notes" className={blockClass}>
                <h2 className={weekHeading}>Notes</h2>
                {notesHtml && (
                  <div
                    className="prose max-w-[68ch] leading-relaxed text-ink prose-headings:text-ink prose-a:text-primary prose-strong:text-ink"
                    dangerouslySetInnerHTML={{ __html: notesHtml }}
                  />
                )}
                {displayObjectives.length > 0 && (
                  <div className={notesHtml ? "mt-5" : undefined}>
                    <p className="mb-1.5 font-medium text-ink">What you&apos;ll cover</p>
                    <ol className="max-w-[68ch] list-decimal pl-5 text-ink marker:text-ink-faint">
                      {displayObjectives.map((obj, i) => (
                        <li key={i} className="py-0.5 pl-1">
                          {obj}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {selResources.length > 0 && (
                  <ul
                    className={`divide-y divide-rule border-y border-rule ${
                      notesHtml || displayObjectives.length > 0 ? "mt-5" : ""
                    }`}
                  >
                    {selResources.map((r, i) => (
                      <li key={i}>
                        <ResourceLink resource={r} trackSlug={trackSlug} weekNum={weekNum} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {hasWork && (
              <section id="work" className={blockClass}>
                <h2 className={weekHeading}>
                  Your work
                  {weekSubmissionsEnabled &&
                    (turnedIn ? (
                      <span className={weekStateDone}>
                        <Check size={14} weight="bold" aria-hidden />
                        Turned in
                      </span>
                    ) : (
                      <span className={weekState}>Not turned in yet</span>
                    ))}
                </h2>
                {weekSubmissionsEnabled && selHomework && (
                  <p className="mb-4 max-w-[68ch] whitespace-pre-line text-ink">{selHomework}</p>
                )}
                <WorkForms
                  trackSlug={trackSlug}
                  weekNum={weekNum}
                  submissionPrompts={weekContent.submissionPrompts}
                  showSubmissions={weekSubmissionsEnabled}
                  reflectionPrompts={showReflection ? reflectionPrompts : null}
                />
              </section>
            )}

            {hasSurvey && (
              <section id="survey" className={blockClass}>
                {surveyOpen ? (
                  <ExitSurveyForm
                    // Remount per session so one session's answers never show
                    // under another's.
                    key={sel}
                    variant="plain"
                    trackSlug={trackSlug}
                    weekNumber={weekNum}
                    sessionNumber={sel + 1}
                    title="Survey"
                    initialRating={surveyRow?.understanding ?? null}
                    initialUnclear={surveyRow?.unclear_text ?? null}
                  />
                ) : (
                  <>
                    <h2 className={weekHeading}>Survey</h2>
                    <p className="text-ink-faint">
                      Two quick questions. Opens when the session starts.
                    </p>
                  </>
                )}
              </section>
            )}
          </div>

          {/* Previous and next live at the foot of the page, where a learner
             is when they have finished the session. */}
          <nav
            aria-label={`${unit}s`}
            className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-rule pt-5 text-sm sm:text-[15px] lg:mt-10"
          >
            {prevWeek ? (
              <Link
                href={weekHref(prevWeek)}
                className="inline-flex min-h-[44px] items-center gap-1.5 font-medium text-primary underline-offset-[3px] hover:underline"
              >
                <ArrowLeftIcon size={16} aria-hidden className="shrink-0" />
                {weekLinkLabel(prevWeek)}
              </Link>
            ) : (
              <span className="text-ink-faint">Start of course</span>
            )}
            {nextWeek ? (
              <Link
                href={weekHref(nextWeek)}
                className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 text-right font-medium text-primary underline-offset-[3px] hover:underline"
              >
                {weekLinkLabel(nextWeek)}
                <ArrowRight size={16} aria-hidden className="shrink-0" />
              </Link>
            ) : (
              <span className="ml-auto text-ink-faint">End of course</span>
            )}
          </nav>
        </div>

        {rail.length > 1 && (
          <aside aria-label="On this page" className="hidden pt-11 xl:block">
            <div className="sticky top-24">
              <p className="mb-2.5 text-[13px] text-ink-faint">
                {isSingleSession ? "Checklist" : `Session ${sel + 1} checklist`}
              </p>
              {rail.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 py-[7px] text-sm text-ink-soft transition-colors hover:text-ink"
                >
                  <span
                    aria-hidden
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-[1.5px] ${
                      item.dot === "done"
                        ? "border-success-text bg-success-text text-white"
                        : item.dot === "na"
                          ? "border-dashed border-[#b9b9c0]"
                          : item.dot === "none"
                            ? "border-transparent"
                            : "border-[#b9b9c0]"
                    }`}
                  >
                    {item.dot === "done" ? (
                      <Check size={9} weight="bold" />
                    ) : item.dot === "none" ? (
                      <span className="h-1 w-1 rounded-full bg-[#b9b9c0]" />
                    ) : null}
                  </span>
                  {item.label}
                  {item.dot === "done" && <span className="sr-only">(done)</span>}
                  {item.dot === "na" && <span className="sr-only">(not open yet)</span>}
                </a>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/** The one word that says where a session stands. Live uses the program's
 *  signal color as a filled chip; the others are quiet text. */
function SessionStateWord({ state }: { state: "live" | "ended" | "upcoming" | "open" }) {
  if (state === "live") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-signal px-2.5 py-[3px] font-sans text-[13px] font-semibold tracking-normal text-ink">
        <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-ink" />
        Live now
      </span>
    );
  }
  if (state === "ended") {
    return (
      <span className={weekStateDone}>
        <Check size={14} weight="bold" aria-hidden />
        Done
      </span>
    );
  }
  if (state === "upcoming") return <span className={weekState}>Upcoming</span>;
  return null;
}

async function WorkForms({
  trackSlug,
  weekNum,
  submissionPrompts,
  showSubmissions,
  reflectionPrompts,
}: {
  trackSlug: string;
  weekNum: number;
  submissionPrompts?: string[];
  showSubmissions: boolean;
  /** null when the week takes no reflection. */
  reflectionPrompts: string[] | null;
}) {
  const [existingSubmission, existingReflection] = await Promise.all([
    showSubmissions
      ? getSubmission(trackSlug, weekNum).catch(() => null)
      : null,
    reflectionPrompts
      ? getReflection(trackSlug, weekNum).catch(() => null)
      : null,
  ]);

  // Feedback lookups depend on submission/reflection IDs from above, so
  // they're necessarily serial-to-those — but each side is parallel.
  const [submissionFeedback, reflectionFeedback] = await Promise.all([
    existingSubmission?.id
      ? getFeedback(existingSubmission.id, undefined).catch(() => [])
      : [],
    existingReflection?.id
      ? getFeedback(undefined, existingReflection.id).catch(() => [])
      : [],
  ]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
      {showSubmissions && (
        <SubmissionForm
          variant="plain"
          trackSlug={trackSlug}
          weekNumber={weekNum}
          prompts={submissionPrompts}
          existing={existingSubmission}
          feedback={submissionFeedback}
        />
      )}
      {reflectionPrompts && (
        <ReflectionForm
          variant="plain"
          trackSlug={trackSlug}
          weekNumber={weekNum}
          prompts={reflectionPrompts}
          existing={existingReflection}
          feedback={reflectionFeedback}
        />
      )}
    </div>
  );
}

/**
 * Pull the first paragraph off a rich-text description. It becomes the stage's
 * blurb; the remainder stays in Notes so nothing is duplicated and
 * nothing is lost. Tag-stripped because the stage renders it as text, not HTML.
 */
function splitLede(html: string | undefined | null): { lede: string; rest: string } {
  const source = html ?? "";
  const match = /^\s*<p[^>]*>([\s\S]*?)<\/p>/i.exec(source);
  if (!match) return { lede: "", rest: source };
  const lede = match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
  // A one-word or empty first paragraph is a formatting artifact, not a hook.
  if (lede.split(/\s+/).length < 4) return { lede: "", rest: source };
  return { lede, rest: source.slice(match[0].length) };
}
