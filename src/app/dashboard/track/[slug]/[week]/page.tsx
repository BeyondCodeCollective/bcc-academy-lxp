import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { computeCurrentWeek } from "@/lib/utils";
import { ArrowLeft, BookOpen, Users, Video, CheckCircle, Download, ExternalLink, Link as LinkIcon, FileText } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionContent } from "@/app/dashboard/admin/actions";
import type { SessionResource } from "@/app/dashboard/admin/actions";
import { isStorageUrl, isUploadedVideo, isUploadedRecording, getYouTubeEmbedUrl } from "@/lib/storage-utils";
import { getProgram } from "@/lib/programs/server";
import { getTrackBySlug } from "@/lib/programs";
import { getSubmission, getReflection, getFeedback } from "@/app/dashboard/track/actions";
import { SubmissionForm } from "@/components/submission-form";
import { ReflectionForm } from "@/components/reflection-form";
import { IntakeForm } from "@/components/intake-form";
import { getSurveyStatus } from "@/app/dashboard/actions";
import type { WeekConfig } from "@/lib/programs/types";

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

  // Gate single-event tracks behind intake form
  if (track.intakeRequired && track.intakeQuestions?.length && isSupabaseConfigured()) {
    const intakeStatus = await getSurveyStatus(`intake-${trackSlug}`);
    if (!intakeStatus.completed) {
      return (
        <div className="mx-auto w-full max-w-2xl py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-2 py-2 px-4 sm:px-5"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <IntakeForm
            trackSlug={trackSlug}
            trackName={track.name}
            programSlug={program.slug}
            questions={track.intakeQuestions}
          />
        </div>
      );
    }
  }

  const now = new Date();
  const trackStarted = now >= new Date(track.startDate);
  const currentWeek = trackStarted
    ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
    : 0;

  // Fetch session content from Supabase
  const sessionContent = isSupabaseConfigured()
    ? await getSessionContent(trackSlug, weekNum)
    : null;

  // Apply instructor overrides (DB values override config defaults)
  const displayTitle = sessionContent?.title || weekContent.title;
  const displaySubtitle = sessionContent?.subtitle || weekContent.subtitle;
  const displayDescription = sessionContent?.description || weekContent.description;
  const displayObjectives = (sessionContent?.objectives as string[] | null)?.length
    ? (sessionContent!.objectives as string[])
    : weekContent.objectives;

  // Build meeting links array (supports up to 2 sessions via DB columns)
  const meetingLinks: (string | null)[] = [];
  const sessionStatuses: string[] = [];
  const recordingUrls: (string | null)[] = [];

  for (let i = 0; i < weekContent.sessions.length; i++) {
    if (i === 0) {
      meetingLinks.push(sessionContent?.meeting_link ?? null);
      sessionStatuses.push(sessionContent?.status ?? "upcoming");
      recordingUrls.push(sessionContent?.recording_url ?? null);
    } else if (i === 1) {
      meetingLinks.push(sessionContent?.meeting_link_2 ?? null);
      sessionStatuses.push(sessionContent?.status_2 ?? "upcoming");
      recordingUrls.push(sessionContent?.recording_url_2 ?? null);
    } else {
      meetingLinks.push(null);
      sessionStatuses.push("upcoming");
      recordingUrls.push(null);
    }
  }

  const adminMarkedComplete = sessionStatuses.every((s) => s === "completed");
  const isCompleted = adminMarkedComplete;
  const isCurrent = trackStarted && weekNum === currentWeek && !adminMarkedComplete;

  const resources: SessionResource[] = sessionContent?.resources ?? [];

  const sessionsLabel = weekContent.sessions.length === 1 ? "Session" : "Sessions";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-5 py-2"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      {/* Compact header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl">
            {weekContent.icon}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
                {track.shortName} · Week {weekContent.week}
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  isCompleted
                    ? "bg-green-50 text-green-600"
                    : isCurrent
                      ? "bg-red-50 text-red-600"
                      : !trackStarted
                        ? "bg-neutral-100 text-neutral-400"
                        : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {isCompleted
                  ? weekContent.sessions.length > 1 ? "Sessions Ended" : "Session Ended"
                  : isCurrent
                    ? "This Week"
                    : !trackStarted
                      ? "Coming Soon"
                      : "Upcoming"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
              {displayTitle}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 pl-[52px]">
          <Users size={13} className="text-neutral-400" />
          <span className="text-xs text-neutral-500">{track.instructor}</span>
          <span className="text-neutral-300 mx-1">·</span>
          <span className="text-xs text-neutral-500">{displaySubtitle}</span>
        </div>
      </div>

      {/* Sessions card */}
      <div className="mb-6 rounded-xl border-2 border-neutral-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-4">
          {sessionsLabel}
        </h2>
        <div className="space-y-4">
          {weekContent.sessions.map((session, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">
                    {weekContent.sessions.length > 1 ? `Session ${i + 1}: ` : ""}{session.title}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {session.time}
                  </p>
                </div>
              </div>
              <div className="shrink-0 ml-11 sm:ml-0">
                {sessionStatuses[i] === "completed" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                    <CheckCircle size={14} />
                    Session Ended
                  </span>
                ) : meetingLinks[i] ? (
                  <a
                    href={meetingLinks[i]!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 min-h-[44px] transition-colors w-full sm:w-auto"
                  >
                    <Video size={14} />
                    Join Session
                  </a>
                ) : (
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-200 text-neutral-400 text-xs font-semibold px-3.5 py-2.5 min-h-[44px] cursor-not-allowed w-full sm:w-auto">
                    <Video size={14} />
                    Link Coming Soon
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brief description */}
      <p className="mb-6 text-sm text-neutral-500 leading-relaxed px-1">
        {displayDescription}
      </p>

      {/* What You'll Cover */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} className="text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
            What You&apos;ll Cover
          </h2>
        </div>
        <ul className="space-y-1.5">
          {displayObjectives.map((obj, i) => (
            <li key={i} className="flex gap-2 text-sm text-neutral-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
              {obj}
            </li>
          ))}
        </ul>
      </div>

      {/* Session Recordings */}
      {weekContent.sessions.map((session, i) => {
        const url = recordingUrls[i];
        const ytEmbed = url ? getYouTubeEmbedUrl(url) : null;
        const isVideo = url ? isUploadedRecording(url) : false;
        const showPlaceholder = !url && (isCompleted || isCurrent || weekNum < currentWeek);

        if (!url && !showPlaceholder) {
          // Check for recording note (e.g. "This session was not recorded")
          if (weekContent.recordingNote && i === 0) {
            return (
              <div key={i} className="mb-4 flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                  <Video size={20} className="text-neutral-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">No Recording</p>
                  <p className="text-xs text-neutral-500">{weekContent.recordingNote}</p>
                </div>
              </div>
            );
          }
          return null;
        }

        const recordingLabel = weekContent.sessions.length > 1
          ? `Session ${i + 1} Recording`
          : "Session Recording";
        const recordingSubtitle = weekContent.sessions.length > 1
          ? session.title
          : `Week ${weekNum} replay`;

        return ytEmbed ? (
          <div key={i} className="mb-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <Video size={15} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">{recordingLabel}</p>
                <p className="text-xs text-neutral-500">{recordingSubtitle}</p>
              </div>
            </div>
            <div className="relative w-full aspect-video">
              <iframe
                src={ytEmbed}
                title={recordingLabel}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : url && isVideo ? (
          <div key={i} className="mb-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <Video size={15} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">{recordingLabel}</p>
                <p className="text-xs text-neutral-500">{recordingSubtitle}</p>
              </div>
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={url} controls className="w-full" preload="metadata" />
          </div>
        ) : url ? (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50">
              <Video size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900">{recordingLabel}</p>
              <p className="text-xs text-neutral-500">{recordingSubtitle}</p>
            </div>
            <ExternalLink size={14} className="text-neutral-400 shrink-0" />
          </a>
        ) : (
          <div key={i} className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                <Video size={20} className="text-neutral-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-400">{recordingLabel}</p>
                <p className="text-xs text-neutral-500">Available after the session</p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Resources */}
      {resources.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon size={14} className="text-neutral-400" />
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
              Resources
            </h2>
          </div>
          <ul className="space-y-2">
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
                    className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 text-sm font-medium text-neutral-800 hover:border-neutral-300 hover:bg-white transition-colors group min-h-[44px]"
                  >
                    {isVid ? (
                      <Video size={14} className="text-neutral-400 group-hover:text-neutral-600 shrink-0" />
                    ) : isFile ? (
                      <FileText size={14} className="text-neutral-400 group-hover:text-neutral-600 shrink-0" />
                    ) : (
                      <LinkIcon size={14} className="text-neutral-400 group-hover:text-neutral-600 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{r.name || r.url}</span>
                    {isFile ? (
                      <Download size={12} className="text-neutral-300 group-hover:text-neutral-500 shrink-0" />
                    ) : (
                      <ExternalLink size={12} className="text-neutral-300 group-hover:text-neutral-500 shrink-0" />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Submissions & Reflections — only for current or past weeks.
          Streamed via Suspense so the rest of the page renders immediately
          and these forms pop in after their DB round-trips finish. */}
      {(isCurrent || isCompleted || weekNum < currentWeek) &&
        isSupabaseConfigured() &&
        (track.submissionsEnabled !== false ||
          track.reflectionsEnabled !== false) && (
          <Suspense fallback={<SubmissionsReflectionsSkeleton />}>
            <SubmissionsReflectionsSection
              trackSlug={trackSlug}
              weekNum={weekNum}
              weekContent={weekContent}
              showSubmissions={track.submissionsEnabled !== false}
              showReflections={track.reflectionsEnabled !== false}
              defaultReflectionPrompts={track.defaultReflectionPrompts}
            />
          </Suspense>
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
          existing={existingSubmission}
          feedback={submissionFeedback}
        />
      )}
      {showReflections && (
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

function SubmissionsReflectionsSkeleton() {
  return (
    <div className="mt-6 space-y-4 animate-pulse">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="h-4 w-32 rounded bg-neutral-200" />
        <div className="mt-3 h-24 w-full rounded bg-neutral-100" />
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="h-4 w-40 rounded bg-neutral-200" />
        <div className="mt-3 h-24 w-full rounded bg-neutral-100" />
      </div>
    </div>
  );
}
