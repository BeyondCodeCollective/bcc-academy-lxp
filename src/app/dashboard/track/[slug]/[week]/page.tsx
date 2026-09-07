import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveCurrentUnit, trackHasStarted, formatCohortDate } from "@/lib/utils";
import { ArrowLeft, Video, CheckCircle, Link as LinkIcon, FileText } from "lucide-react";
import { isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server";
import { getSessionContent } from "@/app/dashboard/admin/actions";
import { isStorageUrl, isUploadedVideo } from "@/lib/storage-utils";
import { resolveTrackProgram } from "@/lib/programs/server";
import { getSubmission, getReflection, getFeedback, getWeekProgress, getTrackProgressMap } from "@/app/dashboard/track/actions";
import { isSequentialGated, highestUnlockedWeek } from "@/lib/track-gating";
import { getEnforcedOnboardingChecklist, getOnboardingStatus } from "@/lib/onboarding/checklists";
import { canAccessAdminPanel } from "@/lib/roles";
import { SubmissionForm } from "@/components/submission-form";
import { PageHeader } from "@/components/page-header";
import { RecordingCard } from "@/components/recording-card";
import { ReflectionForm } from "@/components/reflection-form";
import { IntakeForm } from "@/components/intake-form";
import { WeekKeyboardNav } from "@/components/week-keyboard-nav";
import { WeekNavPortal } from "@/components/week-nav-portal";
import { trackUnitDisplay, unitText } from "@/lib/programs/unit-display";
import { getSurveyStatus } from "@/app/dashboard/actions";
import type { WeekConfig } from "@/lib/programs/types";
import { resolveSessionContent } from "@/lib/session-content";
import { ZoomEmbed } from "@/components/zoom-embed";
import { parseZoomLink, isZoomLink } from "@/lib/zoom";
import { getSessionContext } from "@/lib/auth/session";
import { signRecordingUrl } from "@/lib/blob-recordings";
import { InstructorPanel } from "@/components/instructor-panel";
import { SessionStage } from "@/components/session-stage";
import { SessionTabs } from "@/components/session-tabs";

/**
 * Sessions that have a built stage (`./live`). Those open into the immersive
 * surface instead of the instructor chat panel — two entry points on one page
 * only makes a learner wonder which one is the real session.
 */
const STAGED_SESSIONS = new Set(["forward-deploy:1"]);

export default async function TrackWeekPage({
  params,
}: {
  params: Promise<{ slug: string; week: string }>;
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
  const gateIsAdmin = canAccessAdminPanel(gateCtx?.student?.role ?? "");
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
  if (!gateIsAdmin && !hasStarted) {
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
  const gates = track.gates ?? (
    track.intakeRequired && track.intakeQuestions?.length
      ? [{ type: "intake" as const, surveyKey: trackSlug, questions: track.intakeQuestions }]
      : []
  );

  if (gates.length > 0 && isSupabaseConfigured()) {
    for (const gate of gates) {
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
  const isAdminViewer = canAccessAdminPanel(sessionCtx?.student?.role ?? "");
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
    track.selfPaced || isCurrent || isCompleted || weekNum < currentWeek || comingSoonPassed;

  const sessionsLabel = weekContent.sessions.length === 1 ? "Session" : "Sessions";

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
  const weekClock = track.weekSummaries.find((ws) => ws.week === weekNum);
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
  const liveGateOpen = (i: number) =>
    sessionStatuses[i] !== "completed" &&
    !weekIsPast &&
    !sessionWindowPassed &&
    !sessionDayFuture &&
    !sessionDayPassed &&
    (weekNum === currentWeek || !recordingUrls[i]);
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
  // the rest of the description stays in the Brief tab, which picks up right
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
  const calendarHref = (() => {
    if (!weekClock?.date) return undefined;
    const [y, mo, d] = weekClock.date.split("-").map(Number);
    const [h, mi] = (weekClock.time ?? "18:30").split(":").map(Number);
    const noonUtc = new Date(`${weekClock.date}T12:00:00Z`);
    const etHourAtNoonUtc = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        hour12: false,
      }).format(noonUtc),
    );
    const offsetHours = 12 - etHourAtNoonUtc;
    const startMs = Date.UTC(y, mo - 1, d, (h ?? 18) + offsetHours, mi ?? 30);
    const endMs = startMs + (weekClock.durationMinutes ?? 90) * 60_000;
    const q = new URLSearchParams({
      title: `${track.shortName}: ${displayTitle}`,
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      details: `${unitName} — ${track.name}`,
      uid: `${trackSlug}-${weekNum}@bccacademy.io`,
    });
    return `/api/calendar/event?${q.toString()}`;
  })();

  // Rendered server-side, so it is a snapshot rather than a ticking clock —
  // days and hours are what a learner actually needs, and both survive the
  // page being open for a while.
  const countdown = (() => {
    if (!weekClock?.date) return undefined;
    const [y, mo, d] = weekClock.date.split("-").map(Number);
    const [h, mi] = (weekClock.time ?? "18:30").split(":").map(Number);
    const target = Date.UTC(y, mo - 1, d, (h ?? 18) + 4, mi ?? 30);
    const ms = target - now.getTime();
    if (ms <= 0) return undefined;
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    return [
      { value: String(days).padStart(2, "0"), unit: "Days" },
      { value: String(hours).padStart(2, "0"), unit: "Hours" },
      { value: String(mins).padStart(2, "0"), unit: "Min" },
    ];
  })();

  // The checklist stopped being its own section at the bottom of the page and
  // became one line on the tab rail. Same two signals, counted.
  const checklistTotal = showChecklist
    ? (weekContent.videoUrl || hasRecording ? 1 : 0) + 1
    : 0;
  const checklistDone = showChecklist
    ? (weekContent.videoUrl || hasRecording
        ? weekProgress?.videoWatched
          ? 1
          : 0
        : 0) + (weekProgress?.homeworkSubmitted ? 1 : 0)
    : 0;

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 pt-4 pb-8">
      <WeekKeyboardNav
        prevHref={prevWeek ? `/dashboard/track/${trackSlug}/${prevWeek}` : null}
        nextHref={nextWeek ? `/dashboard/track/${trackSlug}/${nextWeek}` : null}
      />
      {/* Prev/next week nav renders into the breadcrumb row (#breadcrumb-actions)
         so it shares that line instead of stacking below. The "up to course"
         path is the breadcrumb's course crumb. */}
      <WeekNavPortal
        trackSlug={trackSlug}
        weekNum={weekNum}
        totalWeeks={track.totalWeeks}
        unitLabel={unit}
        prevLabel={display.get(weekNum - 1)?.text}
        nextLabel={display.get(weekNum + 1)?.text}
      />

      {/* Compact header. For single-session weeks the session title equals
         the week title, so we fold session metadata (time + Join action)
         into the header instead of repeating the title below. Multi-session
         weeks still render the dedicated Sessions list further down. */}
      {(() => {
        const isSingleSession = weekContent.sessions.length === 1;
        const headerSession = isSingleSession ? weekContent.sessions[0] : null;
        const headerAction =
          isSingleSession
            ? // A completed session already carries the "Session Ended" badge in
              // the header — repeating it here said it twice on one card.
              sessionStatuses[0] === "completed" ? null
              : meetingLinks[0] && !isZoomLink(meetingLinks[0]) ? (
                <a
                  href={meetingLinks[0]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 min-h-[44px] transition-colors w-full sm:w-auto"
                >
                  <Video size={14} />
                  Join Session
                </a>
              ) : null
            : null;
        return (
          <div className="mb-6">
            <PageHeader
              // The STUDENT-FACING number, not the internal week number. On a
              // course with a kickoff, internal week 2 is "Session 1" — the
              // recording card, the prev/next nav and the breadcrumb all said
              // Session 1 while this printed a big "02" beside them. An extra
              // (kickoff, exam day) carries no number, so it shows none.
              index={(() => {
                const n = display.get(weekNum)?.number;
                return n ? String(n).padStart(2, "0") : undefined;
              })()}
              badge={
                isCompleted || isCurrent ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isCompleted
                        ? "bg-green-50 text-green-600"
                        : "bg-primary/[0.08] text-primary"
                    }`}
                  >
                    {isCompleted
                      ? weekContent.sessions.length > 1 ? "Sessions Ended" : "Session Ended"
                      : unit.toLowerCase() === "day" ? "Today" : `This ${unit}`}
                  </span>
                ) : undefined
              }
              title={displayTitle}
              subtitle={[track.instructor, displaySubtitle, headerSession?.time]
                .filter(Boolean)
                .join(" · ")}
            />
            {headerAction && <div className="mt-4">{headerAction}</div>}
          </div>
        );
      })()}

      {/* Admin-only empty-state callout. Admins bypass the pre-start and
         coming-soon gates to prep future sessions, which means a contentless
         session renders as a silent blank page — indistinguishable from a bug
         (HFS Day 2, 2026-08-08). Name the state instead. Learners never see
         this: the gates redirect them or show the "opens on" placeholder. */}
      {isAdminViewer &&
        !displayDescription &&
        !(displayObjectives?.length) &&
        resources.length === 0 &&
        !hasRecording && (
          <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              Nothing here yet — admin preview
            </p>
            <p className="mt-1 text-xs text-amber-800">
              This session has no description, objectives, resources, or recording, so
              learners will see an empty page once it unlocks. Add content in Manage
              Course → Session Content.
            </p>
          </div>
        )}

      {/* Before the session's day: the stage in its "not open yet" state. This
         replaced a quiet white card that sat in the player's slot — same job
         (name the state, don't leave a blank page), but it holds the top of
         the page instead of being one more panel in a stack, and it offers a
         countdown and a calendar link rather than nothing to do. */}
      {sessionDayFuture &&
        !weekIsPast &&
        (meetingLinks.some(Boolean) || hasInstructor) &&
        weekClock?.date && (
          <SessionStage
            state="before"
            headline={`${unitName} opens ${formatCohortDate(weekClock.date, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}`}
            blurb={stageBlurb || undefined}
            liveLabel={liveLabel}
            countdown={countdown}
            calendarHref={calendarHref}
          />
        )}

      {/* Zoom embeds — rendered for any session with an active Zoom meeting link.
         The meeting ID never appears in the DOM; students join through the SDK. */}
      {zoomSessions.length > 0 && (
        <div className="mb-8 space-y-6">
          {zoomSessions.map(({ index, session, parsed }) => (
            <ZoomEmbed
              key={index}
              meetingNumber={parsed!.meetingNumber}
              password={parsed!.password}
              userName={zoomUserName}
              userEmail={zoomUserEmail}
              trackSlug={trackSlug}
              weekNumber={weekNum}
              sessionNumber={index + 1}
              // Single-session weeks: the week title sits directly above the
              // embed, so repeating it next to LIVE NOW reads as clutter.
              sessionTitle={
                weekContent.sessions.length > 1
                  ? `Session ${index + 1}: ${session.title}`
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Non-Zoom live sessions (Teams, Meet): single-session weeks have no
         sessions list below, so without this an external meeting link rendered
         NO join control at all. Same activity rules as the Zoom embed. Added
         for HFS camp week's Teams-hosted mock-interview days (2026-08-07). */}
      {nonZoomLive && meetingLinks[0] && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 panel px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-ink">Live session</p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {weekContent.sessions[0].time}
              </p>
            </div>
            <a
              href={meetingLinks[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 min-h-[44px] transition-colors"
            >
              <Video size={14} />
              Join Session
            </a>
          </div>
        )}

      {/* Between "session over" and "recording imported" the page would
         otherwise be empty — no embed, no replay — which reads as broken
         (welcome day, 2026-08-07). Say what's actually happening, in the
         stage's completed state so the top of the page still has an anchor. */}
      {sessionWindowPassed && !hasRecording && weekNum === currentWeek && (
        <SessionStage
          state="after"
          headline="Today's session has ended"
          blurb="The recording is processing and will appear right here — usually within an hour or two of the session wrapping up."
          completedNote={liveLabel}
        />
      )}

      {/* Sessions list — only for multi-session weeks (single-session weeks
         fold their metadata into the header above). */}
      {weekContent.sessions.length > 1 && (
        <section className="mb-8 border-t border-rule pt-6">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            {sessionsLabel}
          </h2>
          <div className="space-y-4">
            {weekContent.sessions.map((session, i) => {
              // Same rule as the Zoom embed above: a session that already
              // happened shows "Session Ended", not a Join button. Without the
              // recording/past-week test this offered a live join to a Google
              // Meet link for a class held two weeks ago.
              const action = sessionStatuses[i] === "completed" ||
                recordingUrls[i] ||
                weekIsPast ||
                sessionWindowPassed ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                  <CheckCircle size={14} />
                  Session Ended
                </span>
              ) : meetingLinks[i] && !isZoomLink(meetingLinks[i]) ? (
                <a
                  href={meetingLinks[i]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 min-h-[44px] transition-colors w-full sm:w-auto"
                >
                  <Video size={14} />
                  Join Session
                </a>
              ) : null;

              return (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rule text-xs font-bold tabular-nums text-ink-soft">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        Session {i + 1}: {session.title}
                      </p>
                      <p className="text-xs text-ink-faint mt-0.5">
                        {session.time}
                      </p>
                    </div>
                  </div>
                  {action && <div className="shrink-0 ml-11 sm:ml-0">{action}</div>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Config-level recording (e.g. Google Drive link set in the program
         config). Skipped when any session has an admin-uploaded recording —
         those are intentional overrides for this cohort and rendering both
         stacks duplicate cards on the page. */}
      {weekContent.videoUrl &&
        !recordingUrls.some((u) => !!u) &&
        liveNow.size === 0 && (
          <RecordingCard
            url={weekContent.videoUrl}
            title="Session Recording"
            subtitle={`${unitName} replay`}
            trackSlug={trackSlug}
            weekNumber={weekNum}
            showWatchButton={isSupabaseConfigured() && unlocked}
            initialWatched={weekProgress?.videoWatched ?? false}
          />
        )}

      {/* Admin-uploaded session recordings, plus the ones the Zoom cron
         imported. */}
      {weekContent.sessions.map((session, i) => {
        const url = playbackUrls[i];
        if (!url) return null;
        // Never a replay under a live join for the same session.
        if (liveNow.has(i)) return null;

        const recordingLabel = weekContent.sessions.length > 1
          ? `Session ${i + 1} Recording`
          : "Session Recording";
        const recordingSubtitle = weekContent.sessions.length > 1
          ? session.title
          : `${unitName} replay`;

        const showWatchButton = isSupabaseConfigured() && unlocked;

        return (
          <RecordingCard
            key={i}
            url={url}
            title={recordingLabel}
            subtitle={recordingSubtitle}
            trackSlug={trackSlug}
            weekNumber={weekNum}
            showWatchButton={showWatchButton}
            initialWatched={weekProgress?.videoWatched ?? false}
          />
        );
      })}

      {/* The lab itself. Idle, this renders AS the stage (the dark slab that
         anchors the page); once the learner starts, it becomes the live
         conversation exactly as before.

         !sessionDayFuture matters: the stage has a BEFORE state that renders
         above (countdown, add-to-calendar), and without this gate both drew
         at once — "Session 1 opens Monday" stacked on top of "Open now ·
         Start Session 1", offering a lab that isn't open yet. One session,
         one stage, exactly one state. */}
      {hasInstructor && !sessionDayFuture && (
        <InstructorPanel
          trackSlug={trackSlug}
          weekNumber={weekNum}
          unitName={unitName}
          sessionTitle={displayTitle}
          firstName={gateCtx?.student?.first_name ?? null}
          initiallyComplete={weekProgress?.videoWatched ?? false}
          stage={{
            headline: stageBlurb ? undefined : displayTitle,
            blurb: stageBlurb || undefined,
            liveLabel,
            calendarHref,
            startNote: "You can stop and pick it up later.",
          }}
        />
      )}

      {/* Everything that used to stack as its own full-width panel down the
         page — brief, materials, reflection — is one tab strip under the
         stage. Nothing about how these render changed; only where they live. */}
      <SessionTabs
        progressLabel={
          checklistTotal > 0
            ? `${checklistDone} of ${checklistTotal} complete`
            : undefined
        }
        progressComplete={checklistTotal > 0 && checklistDone === checklistTotal}
        tabs={[
          {
            id: "brief",
            label: "Brief",
            content:
              briefHtml || displayObjectives.length > 0 ? (
                <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-11">
                  {briefHtml ? (
                    <div
                      className="prose prose-sm max-w-[640px] leading-relaxed text-ink-soft prose-headings:text-ink prose-a:text-accent prose-strong:text-ink"
                      dangerouslySetInnerHTML={{ __html: briefHtml }}
                    />
                  ) : (
                    <div />
                  )}
                  {displayObjectives.length > 0 && (
                    <div className="panel flex flex-col gap-4 px-5 py-5">
                      <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                        What you&apos;ll cover
                      </h2>
                      <ul className="flex flex-col gap-3.5">
                        {displayObjectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-3.5">
                            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-rule text-[11px] font-bold tabular-nums text-ink-faint">
                              {i + 1}
                            </span>
                            <span className="text-[14.5px] leading-relaxed text-ink">
                              {obj}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null,
          },
          {
            id: "materials",
            label: "Materials",
            count: resources.length,
            content:
              resources.length > 0 ? (
                <ul className="grid max-w-4xl gap-3 sm:grid-cols-2">
                  {resources.map((r, i) => {
                    const isFile = r.type === "file" || isStorageUrl(r.url);
                    const isVid = isUploadedVideo(r);
                    const Icon = isVid ? Video : isFile ? FileText : LinkIcon;
                    const action = isFile ? "Download" : "Open";
                    return (
                      <li key={i}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={isFile ? (r.name || true) : undefined}
                          className="group flex min-h-[60px] items-center gap-4 panel px-4 py-4 text-sm font-semibold text-ink transition-colors hover:border-primary hover:bg-paper-tint-soft"
                        >
                          <Icon
                            size={22}
                            aria-hidden
                            className="shrink-0 text-ink-faint transition-colors group-hover:text-ink-soft"
                          />
                          <span className="flex-1 leading-snug">{r.name || r.url}</span>
                          <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-primary opacity-0 transition-opacity group-hover:opacity-100">
                            {action}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null,
          },
          {
            id: "reflection",
            label: weekSubmissionsEnabled ? "Submit" : "Reflection",
            content:
              unlocked &&
              isSupabaseConfigured() &&
              (weekSubmissionsEnabled || track.reflectionsEnabled !== false) ? (
                <SubmissionsReflectionsSection
                  trackSlug={trackSlug}
                  weekNum={weekNum}
                  weekContent={weekContent}
                  showSubmissions={weekSubmissionsEnabled}
                  showReflections={track.reflectionsEnabled !== false}
                  defaultReflectionPrompts={track.defaultReflectionPrompts}
                />
              ) : null,
          },
        ]}
      />
    </div>
  );
}

async function SubmissionsReflectionsSection({
  trackSlug,
  weekNum,
  weekContent,
  showSubmissions,
  showReflections,
  defaultReflectionPrompts,
}: {
  trackSlug: string;
  weekNum: number;
  weekContent: WeekConfig;
  showSubmissions: boolean;
  showReflections: boolean;
  defaultReflectionPrompts?: string[];
}) {
  const [existingSubmission, existingReflection] = await Promise.all([
    showSubmissions
      ? getSubmission(trackSlug, weekNum).catch(() => null)
      : null,
    showReflections
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

  const reflectionPrompts =
    weekContent.reflectionPrompts ?? defaultReflectionPrompts ?? [];

  return (
    <div className="mt-6 space-y-4">
      {showSubmissions && (
        <SubmissionForm
          trackSlug={trackSlug}
          weekNumber={weekNum}
          prompts={weekContent.submissionPrompts}
          existing={existingSubmission}
          feedback={submissionFeedback}
        />
      )}
      {showReflections && reflectionPrompts.length > 0 && (
        <ReflectionForm
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
 * blurb; the remainder stays in the Brief tab so nothing is duplicated and
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
