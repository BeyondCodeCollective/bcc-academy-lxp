import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, Download, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { requireAdmin, allowedTrackSlugsForActor } from "@/app/dashboard/admin/actions-shared";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui";
import {
  loadExitSurveyCompletion,
  loadExitSurveyResults,
  summarizeBySession,
} from "@/lib/exit-survey-results";
import { SessionReport } from "./session-report";

export const dynamic = "force-dynamic";

type Unit = { week: number; date?: string; topic?: string };

function formatUnitDate(date?: string): string | null {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function ExitSurveyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track } = await searchParams;
  if (!track) notFound();
  const actor = await requireAdmin();
  const allowed = await allowedTrackSlugsForActor(actor, actor.svc);
  if (allowed && !allowed.has(track)) notFound();

  const [rows, completion, { data: course }] = await Promise.all([
    loadExitSurveyResults(actor.svc, track),
    loadExitSurveyCompletion(actor.svc, track),
    actor.svc
      .from("track_overrides")
      .select("name, week_summaries")
      .eq("track_slug", track)
      .limit(1)
      .maybeSingle(),
  ]);
  const courseName = (course?.name as string | null) ?? track;
  const units = ((course?.week_summaries as Unit[] | null) ?? []).reduce<Record<number, Unit>>(
    (acc, u) => ((acc[u.week] = u), acc),
    {},
  );

  const summary = summarizeBySession(rows);
  // Every session that has any answer, newest first: the latest session is the
  // one someone opens this page to debrief.
  const sessionKeys = [...new Set(rows.map((r) => `${r.week_number}:${r.session_number}`))]
    .map((k) => k.split(":").map(Number) as [number, number])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const csvHref = `/api/admin/exit-surveys/csv?track=${encodeURIComponent(track)}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-5">
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-1 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        <CaretLeft size={14} aria-hidden />
        Admin panel
      </Link>

      <PageHeader
        title={`Session pulse: ${courseName}`}
        subtitle="How each live session landed, from the short survey learners answer afterwards."
        noWrap
        actions={
          rows.length > 0 ? (
            <a href={csvHref} className={buttonClass("secondary", "sm")}>
              <Download size={12} aria-hidden />
              Download CSV
            </a>
          ) : undefined
        }
      />

      <p className="flex items-start gap-2 text-sm text-ink-soft">
        <LockSimple size={16} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
        <span>
          Anonymous by design. No names, codes or times are stored with an answer, and answers are listed by
          rating, not by when they came in.
        </span>
      </p>

      {sessionKeys.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-medium text-ink">No answers yet</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-sm text-ink-soft">
            Learners see the survey under each session&apos;s recording. Results show up here as soon as the
            first one is in.
          </p>
        </div>
      ) : (
        sessionKeys.map(([week, session]) => {
          const sessionRows = rows.filter((r) => r.week_number === week && r.session_number === session);
          const s = summary.find((x) => x.week === week && x.session === session);
          const c = completion.find((x) => x.week === week && x.session === session);
          const unit = units[week];
          return (
            <SessionReport
              key={`${week}:${session}`}
              week={week}
              session={session}
              showSession={sessionKeys.some(([w, n]) => w === week && n !== session)}
              dateLabel={formatUnitDate(unit?.date)}
              topic={unit?.topic}
              rows={sessionRows}
              average={s?.average ?? null}
              rated={s?.responses ?? 0}
              answered={c?.answered ?? null}
              enrolled={c?.enrolled ?? null}
            />
          );
        })
      )}
    </div>
  );
}
