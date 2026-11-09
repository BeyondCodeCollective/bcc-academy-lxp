/**
 * One session's exit survey on its own page, so staff can send a link
 * ("take today's exit survey") instead of relying on the form under the video,
 * which only shows while the session is live or once its replay is attached.
 * Saves to the same session_exit_surveys rows as the in-page form.
 *
 *   /dashboard/track/<slug>/<week>/exit?session=2
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveTrackProgram } from "@/lib/programs/server";
import { getMyExitSurveys } from "@/app/dashboard/track/exit-survey-actions";
import { ExitSurveyForm } from "@/components/exit-survey-form";
import { ExitHoursPopup } from "@/components/exit-hours-popup";
import { asksHours } from "@/lib/exit-survey";

export default async function ExitSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; week: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const [{ slug: trackSlug, week: weekStr }, { session: sessionStr }] = await Promise.all([
    params,
    searchParams,
  ]);
  const weekNum = Number(weekStr);
  const sessionNum = Number(sessionStr ?? "1");
  const resolved = await resolveTrackProgram(trackSlug);
  const weekContent = resolved?.track.weeks.find((w) => w.week === weekNum);
  if (
    !resolved ||
    !resolved.track.exitSurveyEnabled ||
    !weekContent ||
    !Number.isInteger(sessionNum) ||
    sessionNum < 1 ||
    sessionNum > weekContent.sessions.length
  ) {
    notFound();
  }
  const { track } = resolved;
  const unit = track.unitLabel?.trim() || "Week";
  const rows = await getMyExitSurveys(trackSlug, weekNum);
  const row = rows?.[sessionNum];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
        {track.shortName} · {unit} {weekNum}
        {weekContent.sessions.length > 1 ? ` · Session ${sessionNum}` : ""}
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Exit survey</h1>
      <p className="mt-2 text-sm text-ink-soft">Two quick questions about today&apos;s session.</p>

      {rows === null ? (
        <p className="mt-8 text-sm text-ink-soft">
          This survey is for learners enrolled in {track.shortName}. Sign in with the email your
          invite was sent to.
        </p>
      ) : (
        <>
          {asksHours(weekNum, sessionNum) && !row?.hours_text && (
            <ExitHoursPopup trackSlug={trackSlug} weekNumber={weekNum} />
          )}
          <ExitSurveyForm
            trackSlug={trackSlug}
            weekNumber={weekNum}
            sessionNumber={sessionNum}
            title={weekContent.sessions.length > 1 ? `Session ${sessionNum} exit survey` : "Exit survey"}
            initialRating={row?.understanding ?? null}
            initialUnclear={row?.unclear_text ?? null}
          />
        </>
      )}

      <Link
        href={`/dashboard/track/${trackSlug}/${weekNum}`}
        className="mt-8 inline-block text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        Back to {unit} {weekNum}
      </Link>
    </div>
  );
}
