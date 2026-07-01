import { redirect } from "next/navigation";
import Link from "next/link";
import { computeCurrentWeek } from "@/lib/utils";
import { ArrowLeft, Video, CheckCircle, Link as LinkIcon, FileText } from "lucide-react";
import { isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server";
import { getSessionContent } from "@/app/dashboard/admin/actions";
import { isStorageUrl, isUploadedVideo } from "@/lib/storage-utils";
import { resolveTrackProgram } from "@/lib/programs/server";
import { getSubmission, getReflection, getFeedback, getWeekProgress, getTrackProgressMap } from "@/app/dashboard/track/actions";
import { isSequentialGated, highestUnlockedWeek } from "@/lib/track-gating";
import { canAccessAdminPanel } from "@/lib/roles";
import { SubmissionForm } from "@/components/submission-form";
import { PageHeader } from "@/components/page-header";
import { RecordingCard } from "@/components/recording-card";
import { ReflectionForm } from "@/components/reflection-form";
import { IntakeForm } from "@/components/intake-form";
import { WeekKeyboardNav } from "@/components/week-keyboard-nav";
import { WeekNavPortal } from "@/components/week-nav-portal";
import { getSurveyStatus } from "@/app/dashboard/actions";
import type { WeekConfig } from "@/lib/programs/types";
import { resolveSessionContent } from "@/lib/session-content";
import { ZoomEmbed } from "@/components/zoom-embed";
import { parseZoomLink, isZoomLink } from "@/lib/zoom";
import { getSessionContext } from "@/lib/auth/session";

export default async function TrackWeekPage({
  params,
}: {
  params: Promise<{ slug: string; week: string }>;
}) {
  const { slug: trackSlug, week: weekStr } = await params;
  const weekNum = parseInt(weekStr, 10);

  const resolved = await resolveTrackProgram(trackSlug);
  if (!resolved) redirect("/dashboard");
  const { program, track } = resolved;

  const weekContent = track.weeks.find((w) => w.week === weekNum);
  if (!weekContent) redirect("/dashboard");

  // Per-track unit label ("Week" default, "Day" for a bootcamp, …).
  const unit = track.unitLabel || "Week";

  // Curriculum lock: before launch, non-admins can't open lessons by direct URL
  // either — bounce them to the holding page (countdown). Mirrors the overview's
  // pre-start gate so registration never exposes content early.
  const gateCtx = await getSessionContext();
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
  const hasStarted = !track.startDateTbd && new Date() >= new Date(track.startDate);
  if (!gateIsAdmin && !hasStarted) {
    redirect(`/dashboard/track/${trackSlug}`);
  }

  // Coming-soon guard. If the week has a `comingSoonUntil` date still in the
  // future, render a placeholder regardless of how the student got here —
  // direct URL, link, etc. The overview grid renders these cells as
  // non-clickable, but this catches anyone who hits the URL directly.
  if (weekContent.comingSoonUntil) {
    const unlockDate = new Date(weekContent.comingSoonUntil);
    if (new Date() < unlockDate) {
      const dateLabel = unlockDate.toLocaleDateString("en-US", {
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
              {unit} {weekContent.week}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
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
  const trackStarted = !track.startDateTbd && now >= new Date(track.startDate);
  const currentWeek = track.selfPaced
    ? trackStarted ? 1 : 0
    : trackStarted
      ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
      : 0;

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
              {unit} {weekContent.week}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {weekContent.title}
            </h1>
            <p className="mt-4 text-base text-ink-soft">
              Finish <strong>{unit} {unlockedThrough}</strong> to unlock this {unit.toLowerCase()}.
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
  const showChecklist = isSupabaseConfigured() && weekSubmissionsEnabled;
  // Self-paced tracks unlock the watch button and the submission form on every
  // week regardless of `currentWeek` — the date gate only matches cohort-style
  // tracks. Without this, a self-paced track with a future `startDate` would
  // render videos and forms invisibly until launch day.
  const unlocked =
    track.selfPaced || isCurrent || isCompleted || weekNum < currentWeek;

  const sessionsLabel = weekContent.sessions.length === 1 ? "Session" : "Sessions";

  // Zoom embed: resolve which sessions have active Zoom links
  const zoomUserName = sessionCtx?.student
    ? `${sessionCtx.student.first_name} ${sessionCtx.student.last_name}`.trim()
    : "Student";
  const zoomUserEmail = sessionCtx?.student?.email ?? sessionCtx?.userEmail ?? "";
  const zoomSessions = weekContent.sessions
    .map((session, i) => ({
      index: i,
      session,
      parsed: meetingLinks[i] ? parseZoomLink(meetingLinks[i]!) : null,
      isActive: sessionStatuses[i] !== "completed",
    }))
    .filter((s) => s.parsed !== null && s.isActive);

  const prevWeek = weekNum > 1 ? weekNum - 1 : null;
  const nextWeek = weekNum < track.totalWeeks ? weekNum + 1 : null;

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 pt-4 pb-8">
      <WeekKeyboardNav
        prevHref={prevWeek ? `/dashboard/track/${trackSlug}/${prevWeek}` : null}
        nextHref={nextWeek ? `/dashboard/track/${trackSlug}/${nextWeek}` : null}
      />
      {/* Prev/next week nav renders into the breadcrumb row (#breadcrumb-actions)
         so it shares that line instead of stacking below. The "up to course"
         path is the breadcrumb's course crumb. */}
      <WeekNavPortal trackSlug={trackSlug} weekNum={weekNum} totalWeeks={track.totalWeeks} unitLabel={unit} />

      {/* Compact header. For single-session weeks the session title equals
         the week title, so we fold session metadata (time + Join action)
         into the header instead of repeating the title below. Multi-session
         weeks still render the dedicated Sessions list further down. */}
      {(() => {
        const isSingleSession = weekContent.sessions.length === 1;
        const headerSession = isSingleSession ? weekContent.sessions[0] : null;
        const headerAction =
          isSingleSession
            ? sessionStatuses[0] === "completed" ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                  <CheckCircle size={14} />
                  Session Ended
                </span>
              ) : meetingLinks[0] && !isZoomLink(meetingLinks[0]) ? (
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
              index={String(weekContent.week).padStart(2, "0")}
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
                      : "This Week"}
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

      {/* Sessions list — only for multi-session weeks (single-session weeks
         fold their metadata into the header above). */}
      {weekContent.sessions.length > 1 && (
        <section className="mb-8 border-t border-rule pt-6">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            {sessionsLabel}
          </h2>
          <div className="space-y-4">
            {weekContent.sessions.map((session, i) => {
              const action = sessionStatuses[i] === "completed" ? (
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
        !recordingUrls.some((u) => !!u) && (
          <RecordingCard
            url={weekContent.videoUrl}
            title="Session Recording"
            subtitle={`Week ${weekNum} replay`}
            trackSlug={trackSlug}
            weekNumber={weekNum}
            showWatchButton={isSupabaseConfigured() && unlocked}
            initialWatched={weekProgress?.videoWatched ?? false}
          />
        )}

      {/* Admin-uploaded session recordings */}
      {weekContent.sessions.map((session, i) => {
        const url = recordingUrls[i];
        if (!url) return null;

        const recordingLabel = weekContent.sessions.length > 1
          ? `Session ${i + 1} Recording`
          : "Session Recording";
        const recordingSubtitle = weekContent.sessions.length > 1
          ? session.title
          : `Week ${weekNum} replay`;

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

      {/* Resources — placed prominently before description so they're the
         first thing students see after the session video/embed. */}
      {resources.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold text-ink">
            Today&apos;s Materials
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
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
                    <Icon size={24} aria-hidden className="shrink-0 text-ink-faint group-hover:text-ink-soft transition-colors" />
                    <span className="flex-1 leading-snug">{r.name || r.url}</span>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      {action}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Brief description */}
      <p className="mb-8 text-base leading-relaxed text-ink-soft max-w-[65ch] whitespace-pre-wrap">
        {displayDescription}
      </p>

      {/* What You'll Cover — divider + eyebrow + list, no card. */}
      <section className="mb-8 border-t border-rule pt-6">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          What you&apos;ll cover
        </h2>
        <ul className="space-y-2">
          {displayObjectives.map((obj, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-ink-soft leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />
              {obj}
            </li>
          ))}
        </ul>
      </section>

      {/* Completion checklist — inline, no card. */}
      {showChecklist && (
        <section className="mt-2 border-t border-rule pt-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            Week completion
          </h2>
          <div className="space-y-2">
            {(weekContent.videoUrl || hasRecording) && (
              <div className="flex items-center gap-2.5">
                <CheckCircle
                  size={16}
                  className={weekProgress?.videoWatched ? "text-green-500" : "text-ink-faint/50"}
                />
                <span className={`text-sm ${weekProgress?.videoWatched ? "text-ink" : "text-ink-faint"}`}>
                  Watch the recording
                </span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <CheckCircle
                size={16}
                className={weekProgress?.homeworkSubmitted ? "text-green-500" : "text-ink-faint/50"}
              />
              <span className={`text-sm ${weekProgress?.homeworkSubmitted ? "text-ink" : "text-ink-faint"}`}>
                Submit your homework
              </span>
            </div>
          </div>
          {studentCompleted && (
            <p className="mt-3 text-xs font-medium text-green-600">
              You&apos;ve completed this week.
            </p>
          )}
        </section>
      )}

      {/* Submissions & Reflections — current/past weeks for cohort tracks,
         every week for self-paced tracks (see `unlocked` above). */}
      {unlocked &&
        isSupabaseConfigured() &&
        (weekSubmissionsEnabled || track.reflectionsEnabled !== false) && (
          <SubmissionsReflectionsSection
            trackSlug={trackSlug}
            weekNum={weekNum}
            weekContent={weekContent}
            showSubmissions={weekSubmissionsEnabled}
            showReflections={track.reflectionsEnabled !== false}
            defaultReflectionPrompts={track.defaultReflectionPrompts}
          />
        )}
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

