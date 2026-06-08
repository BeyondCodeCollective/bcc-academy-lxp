import { redirect } from "next/navigation";
import Link from "next/link";
import { computeCurrentWeek } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionContent } from "@/app/dashboard/admin/actions";
import { isStorageUrl, isUploadedVideo } from "@/lib/storage-utils";
import { getProgram } from "@/lib/programs/server";
import { getTrackBySlug } from "@/lib/programs";
import { getSubmission, getReflection, getFeedback, getWeekProgress } from "@/app/dashboard/track/actions";
import { SubmissionForm } from "@/components/submission-form";
import { RecordingCard } from "@/components/recording-card";
import { ReflectionForm } from "@/components/reflection-form";
import { IntakeForm } from "@/components/intake-form";
import { WeekKeyboardNav } from "@/components/week-keyboard-nav";
import { getSurveyStatus } from "@/app/dashboard/actions";
import type { WeekConfig } from "@/lib/programs/types";
import { resolveSessionContent } from "@/lib/session-content";

export default async function TrackWeekPage({
  params,
}: {
  params: Promise<{ slug: string; week: string }>;
}) {
  const { slug: trackSlug, week: weekStr } = await params;
  const weekNum = parseInt(weekStr, 10);

  const program = await getProgram();
  const track = getTrackBySlug(program, trackSlug);
  if (!track) redirect("/dashboard");

  const weekContent = track.weeks.find((w) => w.week === weekNum);
  if (!weekContent) redirect("/dashboard");

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
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors py-2"
          >
            ←
            Back to {track.shortName}
          </Link>
          <div className="border border-neutral-200 bg-neutral-50 p-8 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400 mb-2">
              Week {weekContent.week}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              {weekContent.title}
            </h1>
            <p className="mt-4 text-base text-neutral-600">
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
                className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-2 py-2 px-4 sm:px-5"
              >
                ←
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
  const currentWeek = trackStarted
    ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
    : 0;

  // Fetch session content and student progress in parallel
  const [sessionContent, weekProgress] = await Promise.all([
    isSupabaseConfigured() ? getSessionContent(trackSlug, weekNum) : null,
    isSupabaseConfigured() ? getWeekProgress(trackSlug, weekNum).catch(() => null) : null,
  ]);

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

  const prevWeek = weekNum > 1 ? weekNum - 1 : null;
  const nextWeek = weekNum < track.totalWeeks ? weekNum + 1 : null;

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8">
      <WeekKeyboardNav
        prevHref={prevWeek ? `/dashboard/track/${trackSlug}/${prevWeek}` : null}
        nextHref={nextWeek ? `/dashboard/track/${trackSlug}/${nextWeek}` : null}
      />
      {/* Top nav: back to track overview + prev/next week. The overview itself
         has a "Back to Dashboard" link, so the breadcrumb is Dashboard →
         {track} overview → Week N. */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href={`/dashboard/track/${trackSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors py-2"
        >
          ← Back to {track.shortName}
        </Link>
        <nav aria-label="Week navigation" className="flex items-center gap-1">
          {prevWeek ? (
            <Link
              href={`/dashboard/track/${trackSlug}/${prevWeek}`}
              className="inline-flex items-center gap-1 border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            >
              ←
              Week {prevWeek}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 border border-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-300">
              ←
              Week {weekNum}
            </span>
          )}
          {nextWeek ? (
            <Link
              href={`/dashboard/track/${trackSlug}/${nextWeek}`}
              className="inline-flex items-center gap-1 border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            >
              Week {nextWeek}
              →
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 border border-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-300">
              Week {weekNum}
              →
            </span>
          )}
        </nav>
      </div>

      {/* Compact header. For single-session weeks the session title equals
         the week title, so we fold session metadata (time + Join action)
         into the header instead of repeating the title below. Multi-session
         weeks still render the dedicated Sessions list further down. */}
      {(() => {
        const isSingleSession = weekContent.sessions.length === 1;
        const headerSession = isSingleSession ? weekContent.sessions[0] : null;
        const headerSessionIsSelfPaced =
          !!headerSession && headerSession.time.toLowerCase().startsWith("self-paced");
        const headerAction =
          isSingleSession
            ? sessionStatuses[0] === "completed" ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                  ✓ Session Ended
                </span>
              ) : meetingLinks[0] ? (
                <a
                  href={meetingLinks[0]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 min-h-[44px] transition-colors w-full sm:w-auto"
                >
                  Join Session
                </a>
              ) : headerSessionIsSelfPaced ? null : (
                <span className="inline-flex items-center justify-center gap-1.5 bg-neutral-200 text-neutral-400 text-xs font-semibold px-3.5 py-2.5 min-h-[44px] cursor-not-allowed w-full sm:w-auto">
                  Link Coming Soon
                </span>
              )
            : null;
        return (
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-[13px] font-semibold tabular-nums text-neutral-600">
                {weekContent.week}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                    Week {weekContent.week}
                  </p>
                  {(isCompleted || isCurrent) && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isCompleted
                          ? "bg-green-50 text-green-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {isCompleted
                        ? weekContent.sessions.length > 1 ? "Sessions Ended" : "Session Ended"
                        : "This Week"}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-neutral-900 tracking-tight leading-tight">
                  {displayTitle}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-[52px]">
              <span aria-hidden className="text-neutral-400">👥</span>
              <span className="text-xs text-neutral-500">{track.instructor}</span>
              <span className="text-neutral-300 mx-1">·</span>
              <span className="text-xs text-neutral-500">{displaySubtitle}</span>
              {headerSession && (
                <>
                  <span className="text-neutral-300 mx-1">·</span>
                  <span className="text-xs text-neutral-500">{headerSession.time}</span>
                </>
              )}
            </div>
            {headerAction && (
              <div className="mt-4 pl-[52px]">{headerAction}</div>
            )}
          </div>
        );
      })()}

      {/* Sessions list — only for multi-session weeks (single-session weeks
         fold their metadata into the header above). */}
      {weekContent.sessions.length > 1 && (
        <section className="mb-8 border-t border-rule pt-6">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            {sessionsLabel}
          </h2>
          <div className="space-y-4">
            {weekContent.sessions.map((session, i) => {
              // Self-paced sessions never need a "Join" link — the recording
              // is the session — so suppress the "Link Coming Soon" fallback.
              const isSelfPaced = session.time.toLowerCase().startsWith("self-paced");
              const action = sessionStatuses[i] === "completed" ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                  ✓ Session Ended
                </span>
              ) : meetingLinks[i] ? (
                <a
                  href={meetingLinks[i]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 min-h-[44px] transition-colors w-full sm:w-auto"
                >
                  Join Session
                </a>
              ) : isSelfPaced ? null : (
                <span className="inline-flex items-center justify-center gap-1.5 bg-neutral-200 text-neutral-400 text-xs font-semibold px-3.5 py-2.5 min-h-[44px] cursor-not-allowed w-full sm:w-auto">
                  Link Coming Soon
                </span>
              );

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

      {/* Video coming soon — shown when no video URL exists and no admin
         recording has been uploaded yet. */}
      {!weekContent.videoUrl && !hasRecording && (
        <div className="mb-8 border border-rule bg-surface-soft px-6 py-8 flex flex-col items-center text-center gap-2">
          <span className="text-2xl" aria-hidden>🎬</span>
          <p className="text-sm font-semibold text-ink">Video Coming Soon</p>
          <p className="text-xs text-ink-faint max-w-[38ch]">
            The session recording for this week will be posted here shortly. In the meantime, dive into the activities below.
          </p>
        </div>
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

      {/* Brief description */}
      <p className="mb-8 text-base leading-relaxed text-ink-soft max-w-[65ch]">
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

      {/* Resources */}
      {resources.length > 0 && (
        <section className="mb-8 border-t border-rule pt-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            Resources
          </h2>
          <ul className="space-y-1.5">
            {resources.map((r, i) => {
              const isFile = r.type === "file" || isStorageUrl(r.url);
              const isVid = isUploadedVideo(r);
              return (
                <li key={i}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={isFile ? (r.name || true) : undefined}
                    className="flex items-center gap-3 border border-transparent bg-surface-soft px-3 py-2.5 text-sm font-medium text-ink hover:border-rule hover:bg-surface-elevated transition-colors group min-h-[44px]"
                  >
                    <span aria-hidden className="text-ink-faint group-hover:text-ink-soft shrink-0">
                      {isVid ? "▶" : isFile ? "📄" : "🔗"}
                    </span>
                    <span className="flex-1 truncate">{r.name || r.url}</span>
                    <span aria-hidden className="text-ink-faint group-hover:text-ink-soft shrink-0">
                      {isFile ? "⬇️" : "↗️"}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Completion checklist — inline, no card. */}
      {showChecklist && (
        <section className="mt-2 border-t border-rule pt-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            Week completion
          </h2>
          <div className="space-y-2">
            {(weekContent.videoUrl || hasRecording) && (
              <div className="flex items-center gap-2.5">
                <span aria-hidden className={weekProgress?.videoWatched ? "text-green-500" : "text-ink-faint/50"}>✓</span>
                <span className={`text-sm ${weekProgress?.videoWatched ? "text-ink" : "text-ink-faint"}`}>
                  Watch the recording
                </span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <span aria-hidden className={weekProgress?.homeworkSubmitted ? "text-green-500" : "text-ink-faint/50"}>✓</span>
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

